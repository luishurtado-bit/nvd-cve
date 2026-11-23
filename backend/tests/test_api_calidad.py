"""Iteración 2: reporte de calidad y bases para entregar (B19), consulta por
rango de fechas (B20) e indicadores clave (B24)."""

import gzip
import io
import json
from datetime import date
from pathlib import Path
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from api import descargas, estado, mocks, registro
from api.main import app
from api.rutas.datos import obtener_cliente
from nvd import almacen
from nvd.cliente import ClienteNVD
from nvd.extraccion import COLUMNAS, a_dataframe
from tests.ejemplos_nvd import SesionFalsa, cve, metrica, pagina

client = TestClient(app)
PERIODO = {"inicio": "2026-11-01", "fin": "2026-11-02"}

# 6 descargados: 1 rechazado, 1 duplicado, 1 sin puntuación; N = 3 (1 crítico)
CVES = [
    cve("CVE-1", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(9.8)]}, kev=True, n_referencias=3),
    cve("CVE-2", "2026-11-02T11:00:00.000", metricas={"cvssMetricV31": [metrica(5.5, "LOCAL", "LOW")]}),
    cve("CVE-3", "2026-11-02T12:00:00.000", estado="Rejected"),
    cve("CVE-4", "2026-11-02T13:00:00.000", estado="Awaiting Analysis"),
    cve("CVE-5", "2026-11-02T14:00:00.000", metricas={"cvssMetricV31": [metrica(7.5, privilegios="LOW")]}),
    cve("CVE-5", "2026-11-02T14:00:00.000", metricas={"cvssMetricV31": [metrica(7.5, privilegios="LOW")]}),
]

def _nvd_falsa(*respuestas) -> SesionFalsa:  # type: ignore[no-untyped-def]
    sesion = SesionFalsa(*respuestas)
    app.dependency_overrides[obtener_cliente] = lambda: ClienteNVD(
        sesion=sesion, dormir=lambda _: None, max_reintentos=1
    )
    return sesion

def _cargar(cves: list[dict] = CVES, periodo: dict = PERIODO) -> dict:
    _nvd_falsa(pagina(cves))
    r = client.post("/api/datos/cargar", json=periodo)
    assert r.status_code == 200, r.text
    return r.json()

def _subir_csv(contenido: str) -> dict:
    r = client.post("/api/datos/archivo", files={"archivo": ("cves.csv", contenido.encode(), "text/csv")})
    assert r.status_code == 200, r.text
    return r.json()

def _leer_csv(r) -> pd.DataFrame:  # type: ignore[no-untyped-def]
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/csv")
    return pd.read_csv(io.BytesIO(r.content), encoding="utf-8-sig")

# --- Almacén: base original y fecha de consulta ---

def test_guardar_descarga_guarda_la_base_original(tmp_path: Path) -> None:
    ruta = almacen.guardar_descarga(CVES, date(2026, 11, 1), date(2026, 11, 2), carpeta=tmp_path)
    original = almacen.ruta_crudo(ruta)
    assert original.name.endswith(".crudo.json.gz") and original.is_file()
    # Se relee igual que una respuesta de la NVD
    assert almacen.leer_crudo(original) == CVES
    with gzip.open(original, "rt", encoding="utf-8") as archivo:
        cuerpo = json.load(archivo)
    assert cuerpo["totalResults"] == 6 and cuerpo["periodo"] == PERIODO
    # El CSV de 20 columnas es la misma información
    df, meta = almacen.cargar(ruta)
    pd.testing.assert_frame_equal(df, almacen.leer_csv(a_dataframe(CVES).to_csv(index=False).encode()))
    assert meta.origen == "api" and meta.fecha_consulta == cuerpo["fecha_consulta"] is not None

def test_csv_subido_no_tiene_fecha_de_consulta(tmp_path: Path) -> None:
    ruta = almacen.guardar(a_dataframe(CVES), None, None, "csv", carpeta=tmp_path)
    assert almacen.cargar(ruta)[1].fecha_consulta is None
    assert not almacen.ruta_crudo(ruta).exists()

def test_metadatos_anteriores_usan_la_fecha_de_guardado(tmp_path: Path) -> None:
    ruta = almacen.guardar(a_dataframe(CVES), date(2026, 11, 1), date(2026, 11, 2), "api", carpeta=tmp_path)
    meta = json.loads(ruta.with_suffix(".json").read_text(encoding="utf-8"))
    del meta["fecha_consulta"]
    ruta.with_suffix(".json").write_text(json.dumps(meta), encoding="utf-8")
    assert almacen.cargar(ruta)[1].fecha_consulta == meta["guardado"]

def test_csv_vacio_guardado_se_puede_cargar(tmp_path: Path) -> None:
    ruta = almacen.guardar_descarga([], date(2026, 11, 1), date(2026, 11, 1), carpeta=tmp_path)
    df, _ = almacen.cargar(ruta)
    assert df.empty and list(df.columns) == list(COLUMNAS)
    with pytest.raises(almacen.ErrorCSV, match="no tiene filas"):
        almacen.leer_csv(ruta)  # subido por el usuario, sí es un error

# --- B20: consulta por rango de fechas ---

def test_rango_largo_se_consulta_por_tramos_y_por_un_solo_camino() -> None:
    # 250 días → 3 tramos de hasta 120 días; una página por tramo
    sesion = _nvd_falsa(pagina(CVES[:2]), pagina(CVES[2:4]), pagina(CVES[4:]))
    c = client.post("/api/datos/cargar", json={"inicio": "2026-01-01", "fin": "2026-09-07"}).json()
    inicios = [ll["params"]["pubStartDate"][:10] for ll in sesion.llamadas]
    assert inicios == ["2026-01-01", "2026-05-01", "2026-08-29"]
    assert (c["descargados"], c["N"]) == (6, 3)
    # Quedan la base original completa y el CSV del conjunto actual
    ruta = estado.actual().ruta  # type: ignore[union-attr]
    assert len(almacen.leer_crudo(almacen.ruta_crudo(ruta))) == 6
    assert c["fecha_consulta"] is not None and c["origen"] == "api"

def test_descarga_en_segundo_plano_guarda_igual() -> None:
    _nvd_falsa(pagina(CVES))
    id_ = client.post("/api/datos/descargas", json=PERIODO).json()["id"]
    d = descargas.esperar(id_)
    assert d is not None and d.estado == "terminada", d
    assert d.resumen is not None and d.resumen.fecha_consulta is not None
    ruta = estado.actual().ruta  # type: ignore[union-attr]
    assert almacen.ruta_crudo(ruta).is_file()

def test_la_fecha_de_consulta_se_conserva_al_arrancar() -> None:
    c = _cargar()
    estado.reiniciar()
    with TestClient(app) as arrancado:
        assert arrancado.get("/api/datos/resumen").json()["fecha_consulta"] == c["fecha_consulta"]

# --- B19: reporte de calidad ---

def _revisar_calidad(c: dict) -> None:
    assert [p["paso"] for p in c["pasos"]] == ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"]
    for anterior, siguiente in zip(c["pasos"], c["pasos"][1:]):
        assert siguiente["antes"] == anterior["despues"]  # el embudo encadena
    for p in c["pasos"]:
        assert p["eliminados"] == p["antes"] - p["despues"] and p["justificacion"]
    con = c["conciliacion"]
    assert con["cuadra"] and con["descargados"] - con["eliminados"] == con["N"]
    assert sum(p["eliminados"] for p in c["pasos"]) == con["eliminados"]
    assert (con["descargados"], con["N"]) == (c["resumen"]["descargados"], c["resumen"]["N"])
    assert [n["columna"] for n in c["nulos"]] == list(COLUMNAS)
    assert all(v["cumple"] for v in c["validaciones"])
    assert [a["variable"] for a in c["atipicos"]] == ["n_referencias", "cve_por_dia"]

def test_calidad_con_los_simulados() -> None:
    c = client.get("/api/datos/calidad").json()
    _revisar_calidad(c)
    assert c["resumen"]["origen"] == "simulado"
    assert c["conciliacion"] == {"descargados": 1300, "eliminados": 300, "N": 1000, "cuadra": True}
    severidad = next(d for d in c["dominios"] if d["columna"] == "severidad")
    criticos = next(v for v in severidad["valores"] if v["categoria"] == "CRITICAL")
    assert (criticos["conteo"], criticos["proporcion"]) == (100, 0.1)

def test_los_simulados_se_depuran_como_los_reales() -> None:
    d = mocks.depuracion()
    r = mocks.resumen()
    assert (d.conteo.descargados, d.conteo.rechazados, d.conteo.sin_puntuacion, d.conteo.N) == (
        r.descargados, r.rechazados, r.sin_puntuacion, r.N
    )
    assert d.omega["cve_id"].tolist() == mocks.dataframe()["cve_id"].tolist()

def test_calidad_con_datos_cargados() -> None:
    _cargar()
    c = client.get("/api/datos/calidad").json()
    _revisar_calidad(c)
    eliminados = {p["paso"]: p["eliminados"] for p in c["pasos"]}
    assert (eliminados["4.2"], eliminados["4.3"], eliminados["4.6"]) == (1, 1, 1)
    assert c["conciliacion"]["N"] == 3

def test_calidad_cuenta_formato_y_dominio_invalidos() -> None:
    _subir_csv(
        "cve_id,publicado,estado,base_score,vector_ataque,privilegios\n"
        "CVE-1,2026-10-05T10:00:00,Analyzed,9.1,NETWORK,NONE\n"
        "CVE-2,2026-10-06T10:00:00,Analyzed,abc,NETWORK,NONE\n"
        "CVE-3,2026-10-07T10:00:00,Analyzed,7.0,SATELITAL,LOW\n"
    )
    c = client.get("/api/datos/calidad").json()
    _revisar_calidad(c)
    assert c["resumen"]["formato_invalido"] == 1 and c["conciliacion"]["N"] == 2
    vector = next(d for d in c["dominios"] if d["columna"] == "vector_ataque")
    assert vector["fuera_de_dominio"] == 1
    assert next(n for n in c["nulos"] if n["columna"] == "vector_ataque")["despues"] == 1

def test_calidad_marca_los_atipicos_sin_eliminarlos() -> None:
    cves = [
        cve(f"CVE-{i}", metricas={"cvssMetricV31": [metrica(5.0)]}, n_referencias=2 + i % 2) for i in range(8)
    ]
    cves.append(cve("CVE-99", metricas={"cvssMetricV31": [metrica(5.0)]}, n_referencias=60))
    _cargar(cves)
    c = client.get("/api/datos/calidad").json()
    referencias = c["atipicos"][0]
    assert referencias["cantidad"] == 1 and referencias["limite_superior"] < 60
    assert c["conciliacion"]["N"] == 9  # el atípico sigue en Ω

def test_calidad_con_periodo_sin_cve() -> None:
    _cargar([])
    c = client.get("/api/datos/calidad").json()
    assert c["conciliacion"] == {"descargados": 0, "eliminados": 0, "N": 0, "cuadra": True}
    assert all(a["cantidad"] == 0 for a in c["atipicos"])

# --- B19: bases para entregar ---

def test_exportar_crudo_de_los_simulados() -> None:
    df = _leer_csv(client.get("/api/exportar/crudo"))
    assert len(df) == 1300 and list(df.columns) == list(COLUMNAS)
    assert (df["estado"] == "Rejected").sum() == 50

def test_exportar_crudo_de_una_descarga_es_el_json_de_la_nvd() -> None:
    _cargar()
    r = client.get("/api/exportar/crudo")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/gzip"
    assert ".crudo.json.gz" in r.headers["content-disposition"]
    cuerpo = json.loads(gzip.decompress(r.content))
    assert [v["cve"] for v in cuerpo["vulnerabilities"]] == CVES  # con el rechazado y el duplicado

def test_exportar_crudo_de_un_csv_es_ese_csv() -> None:
    _subir_csv(
        "cve_id,publicado,estado,base_score,vector_ataque,privilegios\n"
        "CVE-1,2026-10-05T10:00:00,Analyzed,9.1,NETWORK,NONE\n"
        "CVE-2,2026-10-06T10:00:00,Rejected,,,\n"
    )
    df = _leer_csv(client.get("/api/exportar/crudo"))
    assert df["cve_id"].tolist() == ["CVE-1", "CVE-2"]

def test_exportar_crudo_sin_archivo_guardado() -> None:
    estado.establecer(a_dataframe(CVES), None, None, "api")
    r = client.get("/api/exportar/crudo")
    assert r.status_code == 404

def test_exportar_calidad() -> None:
    df = _leer_csv(client.get("/api/exportar/calidad"))
    assert list(df.columns) == ["paso", "descripcion", "antes", "despues", "eliminados", "justificacion"]
    assert df["paso"].astype(str).tolist() == ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"]
    assert df["eliminados"].sum() == 300

def test_exportar_base_limpia_con_critico() -> None:
    df = _leer_csv(client.get("/api/exportar/cve"))
    assert list(df.columns) == [*COLUMNAS, "critico"]
    assert df["critico"].sum() == 100
    df = _leer_csv(client.get("/api/exportar/cve", params={"umbral": 7}))
    assert df["critico"].sum() == 760  # |baseScore ≥ 7| del ejemplo del informe

def test_las_exportaciones_quedan_registradas() -> None:
    client.get("/api/exportar/cve")
    client.get("/api/exportar/crudo")
    client.get("/api/exportar/calidad")
    operaciones = [e.operacion for e in registro.leer()]
    assert operaciones == ["exportar_calidad", "exportar_crudo", "exportar_cve"]

# --- B24: indicadores clave ---

def test_kpis_simulados() -> None:
    k = client.get("/api/dashboard/kpis").json()
    assert (k["N"], k["criticos"], k["proporcion_criticos"]) == (1000, 100, 0.1)
    assert (k["red"], k["proporcion_red"]) == (750, 0.75)
    assert (k["origen"], k["fecha_consulta"]) == ("simulado", None)
    assert 0 <= k["kev"] <= 1000 and 0 <= k["media_puntuacion"] <= 10

def test_kpis_coinciden_con_los_eventos() -> None:
    k = client.get("/api/dashboard/kpis", params={"umbral": 7}).json()
    e = client.post("/api/eventos", json={"umbral": 7}).json()["eventos"]
    assert (k["criticos"], k["red"], k["sin_privilegios"]) == (e["A"]["conteo"], e["B"]["conteo"], e["C"]["conteo"])

def test_kpis_con_datos_cargados() -> None:
    c = _cargar()
    k = client.get("/api/dashboard/kpis").json()
    assert (k["N"], k["criticos"], k["kev"]) == (3, 1, 1)
    assert k["proporcion_criticos"] == pytest.approx(1 / 3)
    assert (k["periodo"], k["origen"], k["fecha_consulta"]) == (PERIODO, "api", c["fecha_consulta"])

def test_kpis_sin_cve() -> None:
    _cargar([])
    k = client.get("/api/dashboard/kpis").json()
    assert (k["N"], k["criticos"], k["proporcion_criticos"], k["media_puntuacion"]) == (0, 0, None, None)
