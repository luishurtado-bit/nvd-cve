"""Fase 3: descargas en segundo plano (B10), validaciones (B9),
exportar a CSV (B14) y registro de ejecuciones (B15)."""

import io
from datetime import date, timedelta
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from api import descargas, registro
from api.main import app
from api.rutas.datos import obtener_cliente
from nvd.cliente import ClienteNVD
from tests.ejemplos_nvd import RespuestaFalsa, SesionFalsa, cve, metrica, pagina

client = TestClient(app)
PERIODO = {"inicio": "2026-11-01", "fin": "2026-11-02"}
CVES = [
    cve("CVE-1", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(9.8)]}),
    cve("CVE-2", "2026-11-02T11:00:00.000", metricas={"cvssMetricV31": [metrica(5.5, "LOCAL", "LOW")]}),
    cve("CVE-3", "2026-11-02T12:00:00.000", estado="Rejected"),
]

def _nvd_falsa(*respuestas: RespuestaFalsa) -> None:
    sesion = SesionFalsa(*respuestas)
    app.dependency_overrides[obtener_cliente] = lambda: ClienteNVD(
        sesion=sesion, dormir=lambda _: None, max_reintentos=1
    )

def _leer_csv(r) -> pd.DataFrame:  # type: ignore[no-untyped-def]
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/csv")
    assert r.content.startswith("﻿".encode())  # BOM para Excel
    return pd.read_csv(io.BytesIO(r.content), encoding="utf-8-sig")

# --- B10: descargas en segundo plano ---

def test_descarga_en_segundo_plano() -> None:
    _nvd_falsa(pagina(CVES))
    r = client.post("/api/datos/descargas", json=PERIODO)
    assert r.status_code == 202
    inicial = r.json()
    assert inicial["estado"] in {"en_curso", "terminada"}
    assert inicial["periodo"] == PERIODO and inicial["n_tramos"] == 1

    descargas.esperar(inicial["id"])
    final = client.get(f"/api/datos/descargas/{inicial['id']}").json()
    assert final["estado"] == "terminada"
    assert final["descargados"] == 3 and final["total_tramo"] == 3
    assert final["resumen"]["N"] == 2 and final["resumen"]["origen"] == "api"
    assert final["terminada"] is not None and final["error"] is None
    # Queda como conjunto actual
    assert client.get("/api/datos/resumen").json()["N"] == 2

def test_descarga_que_falla() -> None:
    _nvd_falsa(RespuestaFalsa(503), RespuestaFalsa(503))
    id_ = client.post("/api/datos/descargas", json=PERIODO).json()["id"]
    final = descargas.esperar(id_)
    assert final is not None and final.estado == "fallida"
    assert final.error is not None and "503" in final.error
    assert client.get("/api/datos/resumen").json()["origen"] == "simulado"

def test_solo_una_descarga_a_la_vez() -> None:
    class SesionLenta:
        def __init__(self) -> None:
            import threading
            self.liberar = threading.Event()

        def get(self, *args: object, **kwargs: object) -> RespuestaFalsa:
            self.liberar.wait(5)
            return pagina(CVES)

    sesion = SesionLenta()
    app.dependency_overrides[obtener_cliente] = lambda: ClienteNVD(sesion=sesion, dormir=lambda _: None)
    primera = client.post("/api/datos/descargas", json=PERIODO).json()
    segunda = client.post("/api/datos/descargas", json=PERIODO)
    assert segunda.status_code == 409
    sesion.liberar.set()
    assert descargas.esperar(primera["id"]).estado == "terminada"  # type: ignore[union-attr]

def test_descarga_inexistente() -> None:
    assert client.get("/api/datos/descargas/no-existe").status_code == 404

# --- B9: validaciones ---

def test_carga_directa_con_periodo_muy_largo() -> None:
    r = client.post("/api/datos/cargar", json={"inicio": "2024-01-01", "fin": "2025-06-30"})
    assert r.status_code == 422
    assert "/api/datos/descargas" in r.json()["detail"]

def test_inicio_en_el_futuro() -> None:
    manana = (date.today() + timedelta(days=1)).isoformat()
    r = client.post("/api/datos/cargar", json={"inicio": manana, "fin": manana})
    assert r.status_code == 422

def test_n_binomial_demasiado_grande() -> None:
    assert client.post("/api/binomial", json={"n": 10_001, "k": 1}).status_code == 422
    assert client.post("/api/binomial", json={"n": 10_000, "k": 1}).status_code == 200

def test_value_error_inesperado_responde_422(monkeypatch: pytest.MonkeyPatch) -> None:
    import api.rutas.probabilidad as rutas

    def falla(*args: object, **kwargs: object) -> float:
        raise ValueError("P(B) = 0: la probabilidad condicional no está definida")

    monkeypatch.setattr(rutas, "son_independientes", falla)
    r = client.post("/api/reglas", json={})
    assert r.status_code == 422
    assert r.json() == {"detail": "P(B) = 0: la probabilidad condicional no está definida"}

# --- B14: exportar ---

def test_exportar_cve() -> None:
    df = _leer_csv(client.get("/api/exportar/cve"))
    assert len(df) == 1000  # Ω simulado
    assert {"cve_id", "base_score", "vector_ataque", "privilegios"} <= set(df.columns)

def test_exportar_cve_con_datos_cargados() -> None:
    _nvd_falsa(pagina(CVES))
    client.post("/api/datos/cargar", json=PERIODO)
    df = _leer_csv(client.get("/api/exportar/cve"))
    assert df["cve_id"].tolist() == ["CVE-1", "CVE-2"]  # sin el rechazado

def test_exportar_eventos() -> None:
    r = client.get("/api/exportar/eventos", params={"umbral": 7})
    assert 'filename="eventos.csv"' in r.headers["content-disposition"]
    df = _leer_csv(r)
    assert df["evento"].tolist() == ["A", "B", "C", "AB", "AC", "BC", "ABC"]
    fila_a = df[df["evento"] == "A"].iloc[0]
    assert fila_a["conteo"] == 760 and fila_a["descripcion"] == "baseScore >= 7"
    assert df[df["evento"] == "AB"]["descripcion"].iloc[0] == "A ∩ B"

def test_exportar_reglas() -> None:
    df = _leer_csv(client.get("/api/exportar/reglas"))
    valores = dict(zip(df["medida"], df["valor"]))
    assert float(valores["p_union"]) == pytest.approx(0.76)
    assert valores["independientes"] == "False"

def test_exportar_bayes_con_prior() -> None:
    df = _leer_csv(client.get("/api/exportar/bayes", params={"prior": 0.2}))
    valores = dict(zip(df["medida"], df["valor"]))
    assert float(valores["posterior"]) == pytest.approx(0.2348, abs=1e-4)

def test_exportar_binomial() -> None:
    r = client.get("/api/exportar/binomial", params={"n": 20, "p": 0.1})
    assert 'filename="binomial_n20.csv"' in r.headers["content-disposition"]
    df = _leer_csv(r)
    assert df.columns.tolist() == ["k", "P(X=k)", "P(X<=k)", "P(X>=k)"]
    assert len(df) == 21
    assert df.loc[3, "P(X>=k)"] == pytest.approx(0.3231, abs=1e-4)

@pytest.mark.parametrize(
    "ruta",
    [
        "/api/exportar/eventos?umbral=11",
        "/api/exportar/reglas?x=A&y=A",
        "/api/exportar/bayes?prior=2",
        "/api/exportar/binomial",
        "/api/exportar/binomial?n=0",
        "/api/exportar/nada",
    ],
)
def test_exportar_parametros_invalidos(ruta: str) -> None:
    assert client.get(ruta).status_code in {404, 422}

# --- B15: registro de ejecuciones ---

def test_sin_ejecuciones() -> None:
    assert client.get("/api/ejecuciones").json() == []

def test_se_registran_los_calculos() -> None:
    client.post("/api/eventos", json={"umbral": 7})
    client.post("/api/bayes", json={"prior": 0.2})
    client.post("/api/binomial", json={"n": 20, "k": 3})
    ejecuciones = client.get("/api/ejecuciones").json()
    assert [e["operacion"] for e in ejecuciones] == ["binomial", "bayes", "eventos"]  # más reciente primero
    binomial, bayes, eventos = ejecuciones
    assert eventos["parametros"]["umbral"] == 7
    assert eventos["resultado"]["eventos"]["A"]["conteo"] == 760
    assert bayes["parametros"]["prior"] == 0.2
    assert bayes["resultado"]["posterior"] == pytest.approx(0.2348, abs=1e-4)
    assert "pmf" not in binomial["resultado"]
    assert binomial["resultado"]["prob_al_menos"] == pytest.approx(0.3231, abs=1e-4)
    # Con qué datos se calculó
    assert all(e["origen"] == "simulado" and e["N"] == 1000 for e in ejecuciones)

def test_se_registra_la_carga() -> None:
    _nvd_falsa(pagina(CVES))
    client.post("/api/datos/cargar", json=PERIODO)
    client.post("/api/eventos", json={})
    cargar = client.get("/api/ejecuciones").json()[1]
    assert cargar["operacion"] == "cargar"
    assert cargar["parametros"] == PERIODO
    assert cargar["origen"] == "api" and cargar["N"] == 2

def test_los_calculos_fallidos_no_se_registran() -> None:
    client.post("/api/bayes", json={"criterios": {"umbral": 10}})  # 422
    assert client.get("/api/ejecuciones").json() == []

def test_limite_y_lineas_danadas() -> None:
    for _ in range(3):
        client.post("/api/eventos", json={})
    with registro.ruta().open("a", encoding="utf-8") as archivo:
        archivo.write("esto no es JSON\n")
    assert len(client.get("/api/ejecuciones", params={"limite": 2}).json()) == 2
    assert len(client.get("/api/ejecuciones").json()) == 3
    assert client.get("/api/ejecuciones", params={"limite": 0}).status_code == 422

def test_si_no_se_puede_escribir_el_calculo_responde_igual(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:  # type: ignore[no-untyped-def]
    # DIR_DATOS apunta a un archivo, no a una carpeta: no se puede escribir el registro
    archivo = tmp_path / "soy_un_archivo"
    archivo.write_text("x", encoding="utf-8")
    monkeypatch.setenv("DIR_DATOS", str(archivo))
    assert client.post("/api/eventos", json={}).status_code == 200
