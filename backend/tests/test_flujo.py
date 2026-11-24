"""B13: el flujo completo con datos sintéticos (no dependen de ningún periodo) y la demo del repositorio.

Una descarga falsa de la NVD pasa por todo el camino real: cliente → extracción → guardado en data/ →
depuración (pasos 4.1 a 4.7) → reporte de calidad → exportaciones → indicadores, y otra vez después de
reiniciar el backend. En cada paso se comprueba cuántos CVE salen y que descargados − eliminados = N.
"""

import gzip
import io
import json
import pandas as pd
import pytest
from fastapi.testclient import TestClient
import config
from api import estado
from api.main import app
from api.rutas.datos import obtener_cliente
from nvd import almacen
from nvd.cliente import ClienteNVD
from nvd.extraccion import COLUMNAS
from tests.ejemplos_nvd import SesionFalsa, cve, metrica, metrica_v4, pagina

client = TestClient(app)
PERIODO = {"inicio": "2026-11-01", "fin": "2026-11-02"}

# 8 filas descargadas. Cada una ejercita un paso distinto de la limpieza.
DESCARGADOS = [
    # Es la versión más reciente del CVE-0001: el duplicado (más viejo, 5,0 y local) viene después
    cve("CVE-2026-0001", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(9.8)]},
        cwes=["CWE-79"], fuente="Cna@Ejemplo.org ", n_referencias=4, kev=True, modificado="2026-11-03T08:00:00.000"),
    cve("CVE-2026-0001", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(5.0, "LOCAL", "LOW")]},
        modificado="2026-11-02T08:00:00.000"),
    cve("CVE-2026-0002", "2026-11-01T12:00:00.000", metricas={"cvssMetricV31": [metrica(5.5, "LOCAL", "LOW")]}),
    cve("CVE-2026-0003", "2026-11-02T09:00:00.000",
        metricas={"cvssMetricV40": [metrica_v4(8.1, "ADJACENT", "LOW", interaccion="PASSIVE")]}),
    cve("CVE-2026-0004", "2026-11-02T10:00:00.000", estado="Rejected"),  # 4.2
    cve("CVE-2026-0005", "2026-11-02T11:00:00.000", estado="Awaiting Analysis"),  # 4.6: sin puntuación
    cve("CVE-2026-0006", "2026-11-02T12:00:00.000", metricas={"cvssMetricV31": [metrica("abc", severidad="HIGH")]}),  # 4.4
    cve("CVE-2026-0007", "2026-11-02T13:00:00.000", metricas={"cvssMetricV31": [metrica(9.5, "SATELITAL")]}),  # 4.5
]
OMEGA = ["CVE-2026-0001", "CVE-2026-0002", "CVE-2026-0003", "CVE-2026-0007"]

# paso → CVE que salen de la tabla en ese paso
ELIMINADOS = {"4.1": 0, "4.2": 1, "4.3": 1, "4.4": 0, "4.5": 0, "4.6": 2, "4.7": 0}

def _descarga_falsa() -> None:
    sesion = SesionFalsa(pagina(DESCARGADOS))
    app.dependency_overrides[obtener_cliente] = lambda: ClienteNVD(
        sesion=sesion, dormir=lambda _: None, max_reintentos=1
    )

def _csv(r) -> pd.DataFrame:  # type: ignore[no-untyped-def]
    assert r.status_code == 200, r.text
    return pd.read_csv(io.BytesIO(r.content), encoding="utf-8-sig")

@pytest.fixture
def cargado() -> dict:
    _descarga_falsa()
    r = client.post("/api/datos/cargar", json=PERIODO)
    assert r.status_code == 200, r.text
    return r.json()

# --- El resumen y la conciliación ---

def test_resumen_de_la_descarga(cargado: dict) -> None:
    claves = ("descargados", "rechazados", "duplicados", "sin_puntuacion", "formato_invalido", "N")
    assert {k: cargado[k] for k in claves} == {
        "descargados": 8, "rechazados": 1, "duplicados": 1, "sin_puntuacion": 1, "formato_invalido": 1, "N": 4,
    }
    assert cargado["origen"] == "api" and cargado["fecha_consulta"] is not None

def test_conciliacion_descargados_menos_eliminados_igual_n(cargado: dict) -> None:
    calidad = client.get("/api/datos/calidad").json()
    con = calidad["conciliacion"]
    assert (con["descargados"], con["eliminados"], con["N"], con["cuadra"]) == (8, 4, 4, True)
    assert con["descargados"] - con["eliminados"] == con["N"] == cargado["N"]
    assert all(v["cumple"] for v in calidad["validaciones"])

# --- Un caso por paso ---

@pytest.mark.parametrize(("paso", "eliminados"), list(ELIMINADOS.items()))
def test_cada_paso_elimina_lo_que_debe(cargado: dict, paso: str, eliminados: int) -> None:
    pasos = {p["paso"]: p for p in client.get("/api/datos/calidad").json()["pasos"]}
    assert pasos[paso]["eliminados"] == eliminados
    assert pasos[paso]["antes"] - pasos[paso]["despues"] == eliminados
    assert pasos[paso]["justificacion"]

def test_los_pasos_encadenan_de_8_a_4(cargado: dict) -> None:
    pasos = client.get("/api/datos/calidad").json()["pasos"]
    assert [p["paso"] for p in pasos] == list(ELIMINADOS)
    assert [(p["antes"], p["despues"]) for p in pasos] == [
        (8, 8), (8, 7), (7, 6), (6, 6), (6, 6), (6, 4), (4, 4)
    ]

def test_4_3_el_duplicado_conserva_la_version_mas_reciente(cargado: dict) -> None:
    df = _csv(client.get("/api/exportar/cve")).set_index("cve_id")
    assert df.loc["CVE-2026-0001", "base_score"] == 9.8  # no el 5,0 de la versión vieja
    assert df.loc["CVE-2026-0001", "vector_ataque"] == "NETWORK"

def test_4_4_la_puntuacion_invalida_se_cuenta_aparte_de_la_que_falta(cargado: dict) -> None:
    assert (cargado["sin_puntuacion"], cargado["formato_invalido"]) == (1, 1)

def test_4_5_texto_normalizado_y_dominio_validado(cargado: dict) -> None:
    calidad = client.get("/api/datos/calidad").json()
    vector = next(d for d in calidad["dominios"] if d["columna"] == "vector_ataque")
    assert vector["fuera_de_dominio"] == 1  # SATELITAL
    df = _csv(client.get("/api/exportar/cve")).set_index("cve_id")
    assert pd.isna(df.loc["CVE-2026-0007", "vector_ataque"])  # queda nulo, pero el CVE se conserva
    assert df.loc["CVE-2026-0001", "fuente"] == "cna@ejemplo.org"  # sin espacios y en minúsculas
    assert df.loc["CVE-2026-0003", "interaccion_usuario"] == "REQUIRED"  # PASSIVE de la v4.0

def test_4_6_los_nulos_se_conservan_salvo_la_puntuacion(cargado: dict) -> None:
    nulos = {n["columna"]: (n["antes"], n["despues"]) for n in client.get("/api/datos/calidad").json()["nulos"]}
    # Al descargar solo faltan en el rechazado y el sin puntuación; el "abc" no es nulo hasta el paso 4.4
    assert nulos["base_score"] == (2, 0)
    assert nulos["vector_ataque"] == (2, 1)  # solo queda el SATELITAL anulado
    assert nulos["puntaje_explotabilidad"][1] == 1  # el v4.0 no lo trae y se queda en Ω

# --- La base original y las bases limpias ---

def test_se_guardan_la_base_original_el_csv_y_los_metadatos(cargado: dict) -> None:
    ruta = estado.actual().ruta  # type: ignore[union-attr]
    assert ruta.parent == config.dir_datos() and ruta.suffix == ".csv"
    assert ruta.with_suffix(".json").is_file()
    assert len(almacen.leer_crudo(almacen.ruta_crudo(ruta))) == 8
    assert list(pd.read_csv(ruta).columns) == list(COLUMNAS)

def test_exportar_crudo_devuelve_lo_que_mando_la_nvd(cargado: dict) -> None:
    r = client.get("/api/exportar/crudo")
    cuerpo = json.loads(gzip.decompress(r.content))
    assert [v["cve"] for v in cuerpo["vulnerabilities"]] == DESCARGADOS
    assert cuerpo["periodo"] == PERIODO

def test_exportar_cve_es_omega_con_critico(cargado: dict) -> None:
    df = _csv(client.get("/api/exportar/cve"))
    assert df["cve_id"].tolist() == OMEGA and list(df.columns) == [*COLUMNAS, "critico"]
    assert df["critico"].tolist() == [True, False, False, True]  # 9,8 y 9,5

def test_los_indicadores_salen_de_omega(cargado: dict) -> None:
    k = client.get("/api/dashboard/kpis").json()
    assert (k["N"], k["criticos"], k["red"], k["kev"]) == (4, 2, 1, 1)
    eventos = client.post("/api/eventos", json={}).json()
    assert eventos["N"] == 4 and eventos["eventos"]["A"]["conteo"] == 2

# --- Después de reiniciar el backend ---

def test_al_reiniciar_la_limpieza_da_lo_mismo(cargado: dict) -> None:
    antes = client.get("/api/datos/calidad").json()
    estado.reiniciar()
    with TestClient(app) as arrancado:
        despues = arrancado.get("/api/datos/calidad").json()
    assert despues["pasos"] == antes["pasos"]
    assert despues["conciliacion"] == antes["conciliacion"]
    assert despues["resumen"] == antes["resumen"]  # incluida la fecha de consulta

# --- La demo que viaja en el repositorio ---

def test_la_demo_del_repositorio_carga_y_cuadra() -> None:
    carpeta = config.RAIZ / "data" / "demo"  # no config.dir_demo(): las pruebas aíslan DIR_DATOS
    ruta = almacen.ultimo(carpeta)
    assert ruta is not None, f"Falta el conjunto de la demo en {carpeta} (ver README, «Datos de la demo»)"
    conjunto = estado.cargar(ruta)
    r = conjunto.resumen
    assert r.origen == "api" and r.fecha_consulta is not None
    assert r.periodo.inicio is not None and r.periodo.fin is not None and r.periodo.inicio <= r.periodo.fin
    assert r.N > 0 and r.descargados - r.rechazados - r.duplicados - r.sin_puntuacion - r.formato_invalido == r.N
    assert all(v.cumple for v in conjunto.depuracion.validaciones)
    assert r.descargados != 1300  # la depuración del CSV guardado, no la de los simulados
    assert (r.periodo.fin - r.periodo.inicio).days + 1 <= 366, "más que el máximo de /api/datos/cargar"
    publicados = conjunto.omega["publicado"]
    assert publicados.min().date() >= r.periodo.inicio and publicados.max().date() <= r.periodo.fin
