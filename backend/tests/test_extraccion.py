import pytest
from nvd.extraccion import COLUMNAS, a_dataframe, extraer, extraer_cwe, severidad_cvss
from tests.ejemplos_nvd import cve, metrica, metrica_v4

def test_cve_con_v31_primary_y_secondary() -> None:
    # La Secondary viene primero en la lista, pero se prefiere la Primary
    c = cve(
        "CVE-2026-0001",
        metricas={"cvssMetricV31": [metrica(5.0, "LOCAL", "LOW", tipo="Secondary"), metrica(9.8)]},
        cwes=["CWE-79"],
        fuente="Security@Ejemplo.org ",
        n_referencias=3,
        kev=True,
        modificado="2026-11-05T08:00:00.000",
    )
    fila = extraer(c)
    assert fila == {
        "cve_id": "CVE-2026-0001",
        "publicado": "2026-11-01T10:00:00.000",
        "estado": "Analyzed",
        "version_cvss": "3.1",
        "base_score": 9.8,
        "severidad": "CRITICAL",
        "vector_ataque": "NETWORK",
        "complejidad_ataque": "LOW",
        "privilegios": "NONE",
        "interaccion_usuario": "NONE",
        "impacto_confidencialidad": "HIGH",
        "impacto_integridad": "HIGH",
        "impacto_disponibilidad": "HIGH",
        "puntaje_explotabilidad": 3.9,
        "puntaje_impacto": 5.9,
        "cwe": "CWE-79",
        "fuente": "security@ejemplo.org",
        "n_referencias": 3,
        "kev": True,
        "ultima_modificacion": "2026-11-05T08:00:00.000",
    }

def test_son_20_variables() -> None:
    assert len(COLUMNAS) == 20 and len(set(COLUMNAS)) == 20
    assert set(extraer(cve("X"))) == set(COLUMNAS)

def test_v31_complejidad_interaccion_e_impactos() -> None:
    m = metrica(6.1, "NETWORK", "NONE", complejidad="HIGH", interaccion="REQUIRED", impactos=("LOW", "NONE", "HIGH"))
    fila = extraer(cve("X", metricas={"cvssMetricV31": [m]}))
    assert fila["complejidad_ataque"] == "HIGH"
    assert fila["interaccion_usuario"] == "REQUIRED"
    assert (fila["impacto_confidencialidad"], fila["impacto_integridad"], fila["impacto_disponibilidad"]) == (
        "LOW", "NONE", "HIGH"
    )

def test_v40_impactos_salen_de_las_claves_vuln() -> None:
    m = metrica_v4(8.7, "ADJACENT", "LOW", complejidad="HIGH", impactos=("HIGH", "LOW", "NONE"))
    fila = extraer(cve("X", metricas={"cvssMetricV40": [m]}))
    assert fila["version_cvss"] == "4.0"
    assert fila["complejidad_ataque"] == "HIGH"
    assert (fila["impacto_confidencialidad"], fila["impacto_integridad"], fila["impacto_disponibilidad"]) == (
        "HIGH", "LOW", "NONE"
    )

@pytest.mark.parametrize(("v4", "esperado"), [("NONE", "NONE"), ("PASSIVE", "REQUIRED"), ("ACTIVE", "REQUIRED")])
def test_v40_interaccion_pasiva_o_activa_es_requerida(v4: str, esperado: str) -> None:
    fila = extraer(cve("X", metricas={"cvssMetricV40": [metrica_v4(5.0, interaccion=v4)]}))
    assert fila["interaccion_usuario"] == esperado

def test_puntajes_de_explotabilidad_e_impacto_solo_en_v3() -> None:
    v3 = extraer(cve("A", metricas={"cvssMetricV31": [metrica(9.8, explotabilidad=3.9, impacto=5.9)]}))
    assert (v3["puntaje_explotabilidad"], v3["puntaje_impacto"]) == (3.9, 5.9)
    v4 = extraer(cve("B", metricas={"cvssMetricV40": [metrica_v4(9.3)]}))
    assert v4["puntaje_explotabilidad"] is None and v4["puntaje_impacto"] is None

def test_fuente_referencias_kev_y_modificacion() -> None:
    fila = extraer(cve("X", fuente="CNA@Ejemplo.COM", n_referencias=2, kev=True, modificado="2026-11-09T01:02:03.004"))
    assert (fila["fuente"], fila["n_referencias"], fila["kev"]) == ("cna@ejemplo.com", 2, True)
    assert fila["ultima_modificacion"] == "2026-11-09T01:02:03.004"

def test_sin_fuente_ni_referencias_ni_kev() -> None:
    fila = extraer(cve("X"))
    assert (fila["fuente"], fila["n_referencias"], fila["kev"], fila["ultima_modificacion"]) == (None, 0, False, None)

def test_solo_secondary() -> None:
    fila = extraer(cve("X", metricas={"cvssMetricV31": [metrica(7.5, tipo="Secondary")]}))
    assert fila["base_score"] == 7.5

@pytest.mark.parametrize(
    ("metricas", "version", "puntuacion"),
    [
        ({"cvssMetricV40": [metrica(9.3)], "cvssMetricV31": [metrica(8.1)]}, "3.1", 8.1),
        ({"cvssMetricV40": [metrica(9.3)], "cvssMetricV30": [metrica(6.5)]}, "3.0", 6.5),
        ({"cvssMetricV31": [metrica(4.0)], "cvssMetricV30": [metrica(6.5)]}, "3.1", 4.0),
        ({"cvssMetricV40": [metrica(9.3, "ADJACENT")]}, "4.0", 9.3),
    ],
)
def test_prioridad_de_versiones(metricas: dict, version: str, puntuacion: float) -> None:
    fila = extraer(cve("X", metricas=metricas))
    assert (fila["version_cvss"], fila["base_score"]) == (version, puntuacion)

def test_v40_conserva_su_vector() -> None:
    fila = extraer(cve("X", metricas={"cvssMetricV40": [metrica(5.1, "ADJACENT", "HIGH")]}))
    assert (fila["vector_ataque"], fila["privilegios"]) == ("ADJACENT", "HIGH")

def test_sin_metricas() -> None:
    fila = extraer(cve("X", estado="Awaiting Analysis"))
    assert fila["estado"] == "Awaiting Analysis"
    sin_metrica = (
        "version_cvss", "base_score", "severidad", "vector_ataque", "complejidad_ataque", "privilegios",
        "interaccion_usuario", "impacto_confidencialidad", "impacto_integridad", "impacto_disponibilidad",
        "puntaje_explotabilidad", "puntaje_impacto",
    )
    assert all(fila[c] is None for c in sin_metrica)

def test_metricas_v2_se_ignoran() -> None:
    fila = extraer(cve("X", metricas={"cvssMetricV2": [metrica(10.0)]}))
    assert fila["base_score"] is None

def test_rechazado() -> None:
    assert extraer(cve("X", estado="Rejected"))["estado"] == "Rejected"

def test_severidad_faltante_se_deduce() -> None:
    fila = extraer(cve("X", metricas={"cvssMetricV31": [metrica(7.2, severidad="")]}))
    assert fila["severidad"] == "HIGH"

@pytest.mark.parametrize(
    ("valores", "esperado"),
    [
        (["NVD-CWE-Other", "CWE-79", "CWE-89"], "CWE-79"),
        (["NVD-CWE-noinfo"], "NVD-CWE-noinfo"),
        ([], None),
    ],
)
def test_cwe(valores: list[str], esperado: str | None) -> None:
    assert extraer(cve("X", cwes=valores))["cwe"] == esperado

def test_cwe_primary_antes_que_secondary() -> None:
    debilidades = [
        {"type": "Secondary", "description": [{"lang": "en", "value": "CWE-20"}]},
        {"type": "Primary", "description": [{"lang": "en", "value": "CWE-787"}]},
    ]
    assert extraer_cwe(debilidades) == "CWE-787"

@pytest.mark.parametrize(
    ("puntuacion", "severidad"),
    [(0.0, "NONE"), (0.1, "LOW"), (3.9, "LOW"), (4.0, "MEDIUM"), (6.9, "MEDIUM"), (7.0, "HIGH"), (8.9, "HIGH"), (9.0, "CRITICAL"), (10.0, "CRITICAL")],
)
def test_severidad_cvss(puntuacion: float, severidad: str) -> None:
    assert severidad_cvss(puntuacion) == severidad

def test_a_dataframe() -> None:
    df = a_dataframe([cve("A", metricas={"cvssMetricV31": [metrica(9.8)]}), cve("B")])
    assert list(df.columns) == list(COLUMNAS)
    assert len(df) == 2
    # Sin convertir: los tipos son el paso 4.4 de la depuración
    assert df["base_score"].isna().tolist() == [False, True]
    assert df["kev"].tolist() == [False, False]

def test_a_dataframe_vacio() -> None:
    df = a_dataframe([])
    assert list(df.columns) == list(COLUMNAS) and df.empty
