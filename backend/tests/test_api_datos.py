from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import config
from api import estado
from api.main import app
from api.rutas.datos import obtener_cliente
from nvd import almacen
from nvd.cliente import ClienteNVD
from tests.ejemplos_nvd import RespuestaFalsa, SesionFalsa, cve, metrica, pagina

client = TestClient(app)

CAMPOS = {"periodo", "descargados", "rechazados", "duplicados", "sin_puntuacion", "formato_invalido", "N", "origen"}
PERIODO = {"inicio": "2026-11-01", "fin": "2026-11-02"}

# 4 descargados: 1 rechazado, 1 sin puntuación, N = 2 (1 crítico de red, 1 local)
CVES = [
    cve("CVE-1", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(9.8)]}, cwes=["CWE-79"]),
    cve("CVE-2", "2026-11-02T11:00:00", metricas={"cvssMetricV31": [metrica(5.5, "LOCAL", "LOW")]}),
    cve("CVE-3", "2026-11-02T12:00:00.000", estado="Rejected"),
    cve("CVE-4", "2026-11-02T13:00:00.000", estado="Awaiting Analysis"),
]

CSV_VALIDO = (
    "cve_id,publicado,estado,base_score,vector_ataque,privilegios,cwe\n"
    "CVE-9,2026-10-05T10:00:00,Analyzed,9.1,NETWORK,NONE,CWE-89\n"
    "CVE-8,2026-10-07T10:00:00,Analyzed,7.5,NETWORK,LOW,CWE-79\n"
    "CVE-7,2026-10-06T10:00:00,Rejected,,,,\n"
).encode()

def _nvd_falsa(*respuestas: RespuestaFalsa) -> SesionFalsa:
    sesion = SesionFalsa(*respuestas)
    app.dependency_overrides[obtener_cliente] = lambda: ClienteNVD(
        sesion=sesion, dormir=lambda _: None, max_reintentos=1
    )
    return sesion

def _revisar_resumen(cuerpo: dict) -> None:
    assert set(cuerpo) == CAMPOS
    assert set(cuerpo["periodo"]) == {"inicio", "fin"}
    # Ω = descargados − rechazados − duplicados − sin puntuación − formato inválido
    eliminados = cuerpo["rechazados"] + cuerpo["duplicados"] + cuerpo["sin_puntuacion"] + cuerpo["formato_invalido"]
    assert cuerpo["N"] == cuerpo["descargados"] - eliminados

def _subir(contenido: bytes, nombre: str = "cves.csv") -> dict:
    r = client.post("/api/datos/archivo", files={"archivo": (nombre, contenido, "text/csv")})
    return {"status": r.status_code, "json": r.json()}

# --- Sin datos cargados: simulados ---

def test_resumen_simulado() -> None:
    r = client.get("/api/datos/resumen")
    assert r.status_code == 200
    c = r.json()
    _revisar_resumen(c)
    assert c["origen"] == "simulado"
    assert c["N"] == 1000  # N del ejemplo del informe
    assert c["periodo"] == {"inicio": None, "fin": None}

# --- Carga desde la API de la NVD ---

def test_cargar_desde_la_nvd() -> None:
    sesion = _nvd_falsa(pagina(CVES))
    r = client.post("/api/datos/cargar", json=PERIODO)
    assert r.status_code == 200, r.text
    c = r.json()
    _revisar_resumen(c)
    assert (c["descargados"], c["rechazados"], c["sin_puntuacion"], c["N"]) == (4, 1, 1, 2)
    assert (c["duplicados"], c["formato_invalido"]) == (0, 0)
    assert c["origen"] == "api"
    assert c["periodo"] == PERIODO

    assert sesion.llamadas[0]["params"]["pubStartDate"] == "2026-11-01T00:00:00.000"
    # Queda como conjunto actual y guardado en data/
    assert client.get("/api/datos/resumen").json() == c
    assert almacen.ultimo() is not None

def test_cargar_cuenta_los_duplicados_y_cuadra() -> None:
    repetido = [*CVES, cve("CVE-1", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(9.8)]})]
    _nvd_falsa(pagina(repetido))
    c = client.post("/api/datos/cargar", json=PERIODO).json()
    _revisar_resumen(c)
    assert (c["descargados"], c["duplicados"], c["N"]) == (5, 1, 2)

def test_los_calculos_usan_los_datos_cargados() -> None:
    _nvd_falsa(pagina(CVES))
    client.post("/api/datos/cargar", json=PERIODO)
    eventos = client.post("/api/eventos", json={}).json()
    assert eventos["N"] == 2
    assert eventos["eventos"]["A"]["conteo"] == 1 and eventos["eventos"]["AB"]["conteo"] == 1
    binomial = client.post("/api/binomial", json={"n": 1, "k": 1}).json()
    assert binomial["p"] == pytest.approx(0.5) and binomial["K"] == 1
    assert client.get("/api/dashboard/severidad").json()["total"] == 2
    serie = client.get("/api/dashboard/serie-diaria").json()
    assert [(p["fecha"], p["conteo"]) for p in serie["puntos"]] == [("2026-11-01", 1), ("2026-11-02", 1)]
    assert client.get("/api/dashboard/cwe").json()["categorias"][0]["categoria"] == "CWE-79"

def test_nvd_caida_responde_502_y_no_cambia_los_datos() -> None:
    _nvd_falsa(RespuestaFalsa(503), RespuestaFalsa(503))
    r = client.post("/api/datos/cargar", json=PERIODO)
    assert r.status_code == 502
    assert "503" in r.json()["detail"]
    assert client.get("/api/datos/resumen").json()["origen"] == "simulado"
    assert almacen.ultimo() is None

def test_nvd_rechaza_la_consulta() -> None:
    _nvd_falsa(RespuestaFalsa(404, headers={"message": "Invalid apiKey"}))
    r = client.post("/api/datos/cargar", json=PERIODO)
    assert r.status_code == 502 and "Invalid apiKey" in r.json()["detail"]

def test_periodo_sin_cve_deja_n_cero() -> None:
    _nvd_falsa(pagina([]))
    assert client.post("/api/datos/cargar", json=PERIODO).json()["N"] == 0
    # Con N = 0 los cálculos responden un error claro, no un 500
    r = client.post("/api/eventos", json={})
    assert r.status_code == 422 and "N = 0" in r.json()["detail"]
    assert client.get("/api/dashboard/histograma").json()["n"] == 0

@pytest.mark.parametrize(
    "cuerpo", [{"inicio": "2026-03-31", "fin": "2026-01-01"}, {"inicio": "ayer", "fin": "2026-01-01"}]
)
def test_cargar_fechas_invalidas(cuerpo: dict) -> None:
    assert client.post("/api/datos/cargar", json=cuerpo).status_code == 422

# --- Carga desde CSV ---

def test_cargar_archivo_csv() -> None:
    r = _subir(CSV_VALIDO)
    assert r["status"] == 200, r["json"]
    c = r["json"]
    _revisar_resumen(c)
    assert (c["descargados"], c["rechazados"], c["N"], c["origen"]) == (3, 1, 2, "csv")
    # El periodo sale de las fechas de publicación
    assert c["periodo"] == {"inicio": "2026-10-05", "fin": "2026-10-07"}
    assert client.post("/api/eventos", json={}).json()["eventos"]["A"]["conteo"] == 1

def test_csv_guardado_se_puede_volver_a_subir() -> None:
    _nvd_falsa(pagina(CVES))
    client.post("/api/datos/cargar", json=PERIODO)
    guardado = almacen.ultimo()
    assert guardado is not None
    c = _subir(guardado.read_bytes())["json"]
    assert (c["descargados"], c["N"], c["origen"]) == (4, 2, "csv")

@pytest.mark.parametrize(
    "contenido", [b"cve_id,base_score\nCVE-1,9.8\n", b"cve_id,publicado,base_score,vector_ataque,privilegios\n", b""]
)
def test_csv_invalido(contenido: bytes) -> None:
    r = _subir(contenido)
    assert r["status"] == 422
    assert client.get("/api/datos/resumen").json()["origen"] == "simulado"

def test_cargar_archivo_que_no_es_csv() -> None:
    assert _subir(b"hola", "cves.txt")["status"] == 400

def test_cargar_sin_archivo() -> None:
    assert client.post("/api/datos/archivo").status_code == 422

# --- Al arrancar ---

def test_al_arrancar_retoma_el_ultimo_conjunto() -> None:
    _nvd_falsa(pagina(CVES))
    client.post("/api/datos/cargar", json=PERIODO)
    estado.reiniciar()
    assert client.get("/api/datos/resumen").json()["origen"] == "simulado"
    # El context manager ejecuta el ciclo de vida (como uvicorn al arrancar)
    with TestClient(app) as arrancado:
        c = arrancado.get("/api/datos/resumen").json()
    assert (c["origen"], c["N"], c["periodo"]) == ("api", 2, PERIODO)

def test_al_arrancar_sin_datos_usa_los_simulados() -> None:
    with TestClient(app) as arrancado:
        assert arrancado.get("/api/datos/resumen").json()["origen"] == "simulado"

def test_al_arrancar_con_archivo_danado_usa_los_simulados() -> None:
    carpeta: Path = config.dir_datos()
    carpeta.mkdir(parents=True)
    (carpeta / "cves_danado.csv").write_text("no,es,el,formato\n1,2,3,4\n", encoding="utf-8")
    (carpeta / "cves_danado.json").write_text("{}", encoding="utf-8")
    assert estado.cargar_ultimo() is None
    assert client.get("/api/datos/resumen").json()["origen"] == "simulado"
