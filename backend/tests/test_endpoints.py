"""B11: una prueba por endpoint.

1. `test_endpoint`: cada endpoint de la API responde bien con una petición mínima (sin red).
2. `test_todo_endpoint_tiene_su_caso`: si se agrega o se quita una ruta y no se toca este archivo, falla.
3. `COBERTURA` (endpoint → pruebas): dónde se prueba cada uno con detalle. `test_la_cobertura_...` revisa
   que cada referencia exista y que la prueba nombre el endpoint, para que la tabla no se desactualice.

Para saber qué prueba cubre un endpoint, buscarlo en `COBERTURA`; para agregar uno, ver los pasos al final.
"""

import ast
import io
from collections.abc import Callable
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from httpx import Response
from api import descargas
from api.main import app
from api.rutas.datos import obtener_cliente
from nvd.cliente import ClienteNVD
from tests.ejemplos_nvd import cve, metrica, pagina

client = TestClient(app)
TESTS = Path(__file__).parent
PERIODO = {"inicio": "2026-11-01", "fin": "2026-11-02"}
CVES = [
    cve("CVE-1", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(9.8)]}, cwes=["CWE-79"]),
    cve("CVE-2", "2026-11-02T11:00:00.000", metricas={"cvssMetricV31": [metrica(5.5, "LOCAL", "LOW")]}),
    cve("CVE-3", "2026-11-02T12:00:00.000", estado="Rejected"),
]
CSV = (
    "cve_id,publicado,estado,base_score,vector_ataque,privilegios\n"
    "CVE-9,2026-10-05T10:00:00,Analyzed,9.1,NETWORK,NONE\n"
    "CVE-8,2026-10-07T10:00:00,Analyzed,7.5,NETWORK,LOW\n"
).encode()

class NvdFalsa:
    """Responde siempre la misma página: ninguna prueba toca la red."""

    def get(self, *args: object, **kwargs: object):  # type: ignore[no-untyped-def]
        return pagina(CVES)

@pytest.fixture(autouse=True)
def nvd_falsa() -> None:
    app.dependency_overrides[obtener_cliente] = lambda: ClienteNVD(sesion=NvdFalsa(), dormir=lambda _: None)

def _descarga_y_consulta() -> Response:
    id_ = client.post("/api/datos/descargas", json=PERIODO).json()["id"]
    descargas.esperar(id_)
    return client.get(f"/api/datos/descargas/{id_}")

def _get(ruta: str, **params: object) -> Callable[[], Response]:
    return lambda: client.get(ruta, params=params)

def _post(ruta: str, **cuerpo: object) -> Callable[[], Response]:
    return lambda: client.post(ruta, json=cuerpo)

JSON, CSV_TIPO = "application/json", "text/csv"

# (método, ruta) → (cómo se llama, estado esperado, tipo de contenido)
CASOS: dict[tuple[str, str], tuple[Callable[[], Response], int, str]] = {
    ("GET", "/api/salud"): (_get("/api/salud"), 200, JSON),
    # Datos
    ("GET", "/api/datos/resumen"): (_get("/api/datos/resumen"), 200, JSON),
    ("GET", "/api/datos/calidad"): (_get("/api/datos/calidad"), 200, JSON),
    ("POST", "/api/datos/cargar"): (_post("/api/datos/cargar", **PERIODO), 200, JSON),
    ("POST", "/api/datos/descargas"): (_post("/api/datos/descargas", **PERIODO), 202, JSON),
    ("GET", "/api/datos/descargas/{id_}"): (_descarga_y_consulta, 200, JSON),
    ("POST", "/api/datos/archivo"): (
        lambda: client.post("/api/datos/archivo", files={"archivo": ("cves.csv", CSV, "text/csv")}), 200, JSON,
    ),
    # Probabilidad
    ("POST", "/api/eventos"): (_post("/api/eventos"), 200, JSON),
    ("POST", "/api/reglas"): (_post("/api/reglas"), 200, JSON),
    ("POST", "/api/bayes"): (_post("/api/bayes"), 200, JSON),
    ("POST", "/api/binomial"): (_post("/api/binomial", n=20, k=3), 200, JSON),
    # Dashboard
    ("GET", "/api/dashboard/severidad"): (_get("/api/dashboard/severidad"), 200, JSON),
    ("GET", "/api/dashboard/vector-ataque"): (_get("/api/dashboard/vector-ataque"), 200, JSON),
    ("GET", "/api/dashboard/privilegios"): (_get("/api/dashboard/privilegios"), 200, JSON),
    ("GET", "/api/dashboard/fuentes"): (_get("/api/dashboard/fuentes"), 200, JSON),
    ("GET", "/api/dashboard/serie-diaria"): (_get("/api/dashboard/serie-diaria", agrupar="semana"), 200, JSON),
    ("GET", "/api/dashboard/histograma"): (_get("/api/dashboard/histograma"), 200, JSON),
    ("GET", "/api/dashboard/cwe"): (_get("/api/dashboard/cwe"), 200, JSON),
    ("GET", "/api/dashboard/resumen-numerico"): (_get("/api/dashboard/resumen-numerico"), 200, JSON),
    ("GET", "/api/dashboard/critico-por"): (_get("/api/dashboard/critico-por", variable="vector"), 200, JSON),
    ("GET", "/api/dashboard/cruce"): (_get("/api/dashboard/cruce"), 200, JSON),
    ("GET", "/api/dashboard/kpis"): (_get("/api/dashboard/kpis"), 200, JSON),
    # Exportar
    ("GET", "/api/exportar/cve"): (_get("/api/exportar/cve"), 200, CSV_TIPO),
    ("GET", "/api/exportar/crudo"): (_get("/api/exportar/crudo"), 200, CSV_TIPO),
    ("GET", "/api/exportar/calidad"): (_get("/api/exportar/calidad"), 200, CSV_TIPO),
    ("GET", "/api/exportar/eventos"): (_get("/api/exportar/eventos"), 200, CSV_TIPO),
    ("GET", "/api/exportar/reglas"): (_get("/api/exportar/reglas"), 200, CSV_TIPO),
    ("GET", "/api/exportar/bayes"): (_get("/api/exportar/bayes"), 200, CSV_TIPO),
    ("GET", "/api/exportar/binomial"): (_get("/api/exportar/binomial", n=20, k=3), 200, CSV_TIPO),
    # Registro
    ("GET", "/api/ejecuciones"): (_get("/api/ejecuciones"), 200, JSON),
}

# endpoint → dónde se prueba con detalle («archivo::prueba»). Cada una debe existir y nombrar el endpoint.
COBERTURA: dict[tuple[str, str], tuple[str, ...]] = {
    ("GET", "/api/salud"): ("test_api.py::test_salud",),
    ("GET", "/api/datos/resumen"): ("test_api_datos.py::test_resumen_simulado",),
    ("GET", "/api/datos/calidad"): (
        "test_api_calidad.py::test_calidad_con_los_simulados",
        "test_flujo.py::test_conciliacion_descargados_menos_eliminados_igual_n",
    ),
    ("POST", "/api/datos/cargar"): (
        "test_api_datos.py::test_cargar_desde_la_nvd",
        "test_api_calidad.py::test_rango_largo_se_consulta_por_tramos_y_por_un_solo_camino",
    ),
    ("POST", "/api/datos/descargas"): (
        "test_api_fase3.py::test_descarga_en_segundo_plano",
        "test_api_fase3.py::test_solo_una_descarga_a_la_vez",
    ),
    ("GET", "/api/datos/descargas/{id_}"): (
        "test_api_fase3.py::test_descarga_en_segundo_plano",
        "test_api_fase3.py::test_descarga_inexistente",
    ),
    ("POST", "/api/datos/archivo"): ("test_api_datos.py::test_cargar_archivo_csv", "test_api_datos.py::test_csv_invalido"),
    ("POST", "/api/eventos"): (
        "test_api_probabilidad.py::test_eventos_con_criterios_por_defecto",
        "test_api_probabilidad.py::test_eventos_con_criterios_invalidos",
    ),
    ("POST", "/api/reglas"): (
        "test_api_probabilidad.py::test_reglas_a_y_b_del_informe",
        "test_api_probabilidad.py::test_reglas_tabla_2x2_suma_n",
    ),
    ("POST", "/api/bayes"): (
        "test_api_probabilidad.py::test_bayes_por_b_del_informe",
        "test_api_probabilidad.py::test_bayes_entradas_invalidas",
    ),
    ("POST", "/api/binomial"): (
        "test_api_binomial.py::test_ejemplo_del_informe_con_p_manual",
        "test_api_binomial.py::test_los_cuatro_supuestos_en_orden",
    ),
    ("GET", "/api/dashboard/severidad"): ("test_api_dashboard.py::test_severidad",),
    ("GET", "/api/dashboard/vector-ataque"): ("test_api_dashboard.py::test_vector_ataque",),
    ("GET", "/api/dashboard/privilegios"): ("test_api_descriptivo.py::test_privilegios_en_orden",),
    ("GET", "/api/dashboard/fuentes"): ("test_api_descriptivo.py::test_fuentes_top",),
    ("GET", "/api/dashboard/serie-diaria"): (
        "test_api_dashboard.py::test_serie_diaria",
        "test_api_descriptivo.py::test_serie_con_criticos_y_agrupada",
    ),
    ("GET", "/api/dashboard/histograma"): (
        "test_api_dashboard.py::test_histograma_por_defecto",
        "test_api_dashboard.py::test_histograma_con_bins",
    ),
    ("GET", "/api/dashboard/cwe"): ("test_api_dashboard.py::test_cwe_top", "test_api_dashboard.py::test_cwe_por_defecto"),
    ("GET", "/api/dashboard/resumen-numerico"): ("test_api_descriptivo.py::test_resumen_numerico_endpoint",),
    ("GET", "/api/dashboard/critico-por"): (
        "test_api_descriptivo.py::test_critico_por_vector",
        "test_api_descriptivo.py::test_critico_por_variable_invalida",
    ),
    ("GET", "/api/dashboard/cruce"): (
        "test_api_descriptivo.py::test_cruce_severidad_por_vector",
        "test_api_descriptivo.py::test_cruce_otras_variables_y_misma_variable",
    ),
    ("GET", "/api/dashboard/kpis"): (
        "test_api_calidad.py::test_kpis_simulados",
        "test_api_descriptivo.py::test_con_el_mismo_filtro_todos_cuentan_lo_mismo",
    ),
    ("GET", "/api/exportar/cve"): ("test_api_calidad.py::test_exportar_base_limpia_con_critico", "test_api_fase3.py::test_exportar_cve"),
    ("GET", "/api/exportar/crudo"): (
        "test_api_calidad.py::test_exportar_crudo_de_los_simulados",
        "test_api_calidad.py::test_exportar_crudo_de_una_descarga_es_el_json_de_la_nvd",
    ),
    ("GET", "/api/exportar/calidad"): ("test_api_calidad.py::test_exportar_calidad",),
    ("GET", "/api/exportar/eventos"): ("test_api_fase3.py::test_exportar_eventos",),
    ("GET", "/api/exportar/reglas"): ("test_api_fase3.py::test_exportar_reglas",),
    ("GET", "/api/exportar/bayes"): ("test_api_fase3.py::test_exportar_bayes_con_prior",),
    ("GET", "/api/exportar/binomial"): ("test_api_fase3.py::test_exportar_binomial",),
    ("GET", "/api/ejecuciones"): ("test_api_fase3.py::test_sin_ejecuciones", "test_api_fase3.py::test_se_registran_los_calculos"),
}

def _endpoints_de_la_api() -> set[tuple[str, str]]:
    return {(metodo.upper(), ruta) for ruta, operaciones in app.openapi()["paths"].items() for metodo in operaciones}

def _nombre(clave: tuple[str, str]) -> str:
    return f"{clave[0]} {clave[1]}"

@pytest.mark.parametrize("clave", sorted(CASOS), ids=_nombre)
def test_endpoint(clave: tuple[str, str]) -> None:
    llamar, estado, tipo = CASOS[clave]
    r = llamar()
    assert r.status_code == estado, r.text[:300]
    assert r.headers["content-type"].startswith(tipo)
    if tipo == JSON:
        assert r.json() is not None

def test_todo_endpoint_tiene_su_caso() -> None:
    api = _endpoints_de_la_api()
    assert set(CASOS) == api, (
        f"sin caso: {sorted(api - set(CASOS))}; casos de rutas que ya no existen: {sorted(set(CASOS) - api)}"
    )
    assert set(COBERTURA) == api, f"fuera de COBERTURA: {sorted(api ^ set(COBERTURA))}"

def _fuente_de(archivo: str, prueba: str) -> tuple[str, str] | None:
    """(código de la prueba, código del archivo), o None si la prueba no existe."""
    modulo = (TESTS / archivo).read_text(encoding="utf-8")
    for nodo in ast.walk(ast.parse(modulo)):
        if isinstance(nodo, ast.FunctionDef) and nodo.name == prueba:
            return ast.get_source_segment(modulo, nodo) or "", modulo
    return None

def _referencias() -> list[tuple[tuple[str, str], str]]:
    return [(clave, ref) for clave, refs in sorted(COBERTURA.items()) for ref in refs]

@pytest.mark.parametrize(("clave", "referencia"), _referencias(), ids=lambda v: v if isinstance(v, str) else _nombre(v))
def test_la_cobertura_apunta_a_pruebas_que_existen_y_nombran_el_endpoint(
    clave: tuple[str, str], referencia: str
) -> None:
    archivo, prueba = referencia.split("::")
    encontrada = _fuente_de(archivo, prueba)
    assert encontrada is not None, f"{referencia} no existe"
    codigo, modulo = encontrada
    # O la prueba nombra el último tramo de la ruta (en «descargas/{id_}», «descargas»; también vale su
    # nombre), o el archivo llama a la ruta completa desde una función auxiliar (_post, _subir…)
    tramo = [t for t in clave[1].split("/") if not t.startswith("{")][-1]
    nombrada = tramo.replace("-", "_") in codigo.replace("-", "_")
    assert nombrada or clave[1] in modulo, f"{referencia} no menciona «{tramo}» ni llama a {clave[1]}"

# Para agregar un endpoint:
#   1. Probarlo con detalle en el archivo que corresponda (test_api_*.py).
#   2. Agregar su caso mínimo en CASOS y sus pruebas en COBERTURA.
#   3. Documentarlo en la tabla del contrato del README y regenerar los tipos del frontend.
