"""Iteración 3: filtros globales (B21), resumen numérico ampliado (B22) y
agrupaciones para P2 y P3 (B23)."""

from datetime import date
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from api.main import app
from stats.descriptiva import critico_por, resumen_numerico, serie_temporal, tabla_cruzada

client = TestClient(app)

def _get(ruta: str, **params: object) -> dict:
    r = client.get(f"/api/dashboard/{ruta}", params=params)
    assert r.status_code == 200, r.text
    return r.json()

# --- B22: resumen numérico (función pura) ---

def test_resumen_numerico_ampliado() -> None:
    r = resumen_numerico(pd.Series([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]))
    assert (r.minimo, r.q1, r.mediana, r.q3, r.maximo) == (2.0, 4.0, 4.5, 5.5, 9.0)
    assert r.asimetria is not None and r.asimetria > 0  # cola a la derecha

def test_resumen_numerico_entero_con_nulos() -> None:
    r = resumen_numerico(pd.Series([1, None, 3, 8], dtype="Int64"))
    assert (r.n, r.minimo, r.maximo) == (3, 1.0, 8.0)

@pytest.mark.parametrize("valores", [[5.0, 5.0, 5.0], [1.0, 2.0]])
def test_resumen_numerico_asimetria_no_definida(valores: list[float]) -> None:
    assert resumen_numerico(pd.Series(valores)).asimetria is None

def test_resumen_numerico_vacio() -> None:
    r = resumen_numerico(pd.Series([], dtype="float64"))
    assert (r.n, r.minimo, r.q1, r.asimetria) == (0, None, None, None)

# --- B23: series y agrupaciones (funciones puras) ---

FECHAS = pd.Series(pd.to_datetime(["2026-03-02T10:00Z", "2026-03-02T11:00Z", "2026-03-05T09:00Z", "2026-04-14T08:00Z"]))
CRITICOS = pd.Series([True, False, True, False])

def test_serie_por_dia_rellena_dias_sin_cve() -> None:
    puntos = serie_temporal(FECHAS, CRITICOS, "dia")
    assert (puntos[0].fecha, puntos[0].conteo, puntos[0].criticos) == (date(2026, 3, 2), 2, 1)
    assert puntos[1].conteo == 0 and len(puntos) == 44  # del 2 de marzo al 14 de abril

def test_serie_por_semana_empieza_en_lunes() -> None:
    puntos = serie_temporal(FECHAS, CRITICOS, "semana")
    assert all(p.fecha.weekday() == 0 for p in puntos)
    assert (puntos[0].fecha, puntos[0].conteo, puntos[0].criticos) == (date(2026, 3, 2), 3, 2)
    assert puntos[-1].fecha == date(2026, 4, 13) and sum(p.conteo for p in puntos) == 4

def test_serie_por_mes() -> None:
    puntos = serie_temporal(FECHAS, CRITICOS, "mes")
    assert [(p.fecha, p.conteo, p.criticos) for p in puntos] == [(date(2026, 3, 1), 3, 2), (date(2026, 4, 1), 1, 0)]

def test_serie_vacia() -> None:
    assert serie_temporal(pd.Series([], dtype="datetime64[ns, UTC]"), pd.Series([], dtype=bool), "semana") == []

def test_critico_por_grupo() -> None:
    grupos = pd.Series(["NETWORK", "NETWORK", "LOCAL", None, "NETWORK"])
    criticos = pd.Series([True, False, True, True, False])
    r = critico_por(grupos, criticos)
    assert [(g.grupo, g.total, g.criticos) for g in r] == [("NETWORK", 3, 1), ("LOCAL", 1, 1)]
    assert r[0].proporcion == pytest.approx(1 / 3)
    assert [g.grupo for g in critico_por(grupos, criticos, top=1)] == ["NETWORK"]

def test_tabla_cruzada_con_orden_y_ceros() -> None:
    filas = pd.Series(["HIGH", "CRITICAL", "HIGH", None, "LOW"])
    columnas = pd.Series(["NETWORK", "NETWORK", "LOCAL", "NETWORK", None])
    cols, tabla = tabla_cruzada(filas, columnas, orden_filas=("CRITICAL", "HIGH", "MEDIUM", "LOW"))
    assert cols == ["NETWORK", "LOCAL"]
    assert [f.categoria for f in tabla] == ["CRITICAL", "HIGH"]  # LOW no tiene vector
    assert tabla[0].conteos == {"NETWORK": 1, "LOCAL": 0}
    assert tabla[1].total == 2

# --- B21: filtros globales ---

FILTRO = {"desde": "2026-01-15", "hasta": "2026-02-20", "severidad": ["CRITICAL", "HIGH"], "vector": ["NETWORK"]}

def test_con_el_mismo_filtro_todos_cuentan_lo_mismo() -> None:
    n = _get("kpis", **FILTRO)["N"]
    assert 0 < n < 1000
    assert _get("severidad", **FILTRO)["total"] == n
    assert _get("vector-ataque", **FILTRO)["total"] == n
    assert _get("privilegios", **FILTRO)["total"] == n
    assert _get("fuentes", **FILTRO, top=50)["total"] == n
    assert _get("serie-diaria", **FILTRO)["total"] == n
    assert _get("serie-diaria", **FILTRO, agrupar="mes")["total"] == n
    assert _get("histograma", **FILTRO)["n"] == n
    assert _get("resumen-numerico", **FILTRO)[0]["n"] == n
    assert _get("critico-por", variable="privilegios", **FILTRO)["total"] == n
    assert _get("cruce", **FILTRO)["total"] == n

def test_filtro_por_fechas_incluye_los_extremos() -> None:
    puntos = _get("serie-diaria")["puntos"]
    dia = puntos[10]
    assert _get("kpis", desde=dia["fecha"], hasta=dia["fecha"])["N"] == dia["conteo"]
    serie = _get("serie-diaria", desde=puntos[3]["fecha"], hasta=puntos[5]["fecha"])
    assert [p["fecha"] for p in serie["puntos"]] == [p["fecha"] for p in puntos[3:6]]

def test_filtro_con_varios_valores() -> None:
    k = _get("kpis", severidad=["CRITICAL", "HIGH"])
    assert (k["N"], k["N_sin_filtro"]) == (760, 1000)  # |baseScore ≥ 7| del ejemplo
    assert _get("kpis", vector=["LOCAL"], privilegios=["NONE"])["N"] == 40

def test_filtro_sin_resultados() -> None:
    k = _get("kpis", desde="2027-01-01")
    assert (k["N"], k["proporcion_criticos"]) == (0, None)
    assert _get("serie-diaria", desde="2027-01-01")["puntos"] == []
    assert _get("critico-por", variable="vector", desde="2027-01-01")["grupos"] == []
    assert _get("cruce", desde="2027-01-01")["filas"] == []

@pytest.mark.parametrize(
    "params",
    [
        {"desde": "2026-02-01", "hasta": "2026-01-01"},
        {"severidad": "ALTA"},
        {"vector": "SATELITAL"},
        {"desde": "ayer"},
    ],
)
def test_filtros_invalidos(params: dict) -> None:
    assert client.get("/api/dashboard/kpis", params=params).status_code == 422

# --- B22 y B23: endpoints ---

def test_resumen_numerico_endpoint() -> None:
    r = _get("resumen-numerico")
    assert [v["variable"] for v in r] == ["base_score", "n_referencias"]
    for v in r:
        assert v["n"] == 1000
        assert v["minimo"] <= v["q1"] <= v["mediana"] <= v["q3"] <= v["maximo"]
    assert r[0]["asimetria"] < 0  # en el ejemplo abundan las puntuaciones altas

def test_critico_por_vector() -> None:
    r = _get("critico-por", variable="vector")
    assert (r["total"], r["criticos"], r["proporcion_criticos"], r["sin_dato"]) == (1000, 100, 0.1, 0)
    grupos = {g["grupo"]: (g["total"], g["criticos"]) for g in r["grupos"]}
    assert grupos == {"NETWORK": (750, 90), "LOCAL": (250, 10)}  # |A ∩ B| = 90 del informe

def test_critico_por_fuente_con_top_y_umbral() -> None:
    r = _get("critico-por", variable="fuente", top=2, umbral=7)
    assert len(r["grupos"]) == 2 and r["criticos"] == 760
    assert r["grupos"][0]["total"] >= r["grupos"][1]["total"]

def test_critico_por_cuenta_los_sin_dato() -> None:
    client.post(
        "/api/datos/archivo",
        files={"archivo": ("cves.csv", (
            "cve_id,publicado,estado,base_score,vector_ataque,privilegios\n"
            "CVE-1,2026-10-05T10:00:00,Analyzed,9.1,NETWORK,NONE\n"
            "CVE-2,2026-10-06T10:00:00,Analyzed,5.0,,LOW\n"
        ).encode(), "text/csv")},
    )
    r = _get("critico-por", variable="vector")
    assert (r["total"], r["sin_dato"], r["grupos"][0]["grupo"]) == (1, 1, "NETWORK")

def test_critico_por_variable_invalida() -> None:
    assert client.get("/api/dashboard/critico-por", params={"variable": "color"}).status_code == 422
    assert client.get("/api/dashboard/critico-por").status_code == 422

def test_cruce_severidad_por_vector() -> None:
    r = _get("cruce")
    assert (r["fila"], r["columna"], r["total"]) == ("severidad", "vector", 1000)
    assert r["columnas"] == ["NETWORK", "LOCAL"]
    criticos = r["filas"][0]
    assert criticos["categoria"] == "CRITICAL"
    assert [(c["categoria"], c["conteo"]) for c in criticos["celdas"]] == [("NETWORK", 90), ("LOCAL", 10)]
    for fila in r["filas"]:
        assert sum(c["conteo"] for c in fila["celdas"]) == fila["total"]
        assert sum(c["proporcion"] for c in fila["celdas"]) == pytest.approx(1)

def test_cruce_otras_variables_y_misma_variable() -> None:
    r = _get("cruce", fila="privilegios", columna="vector")
    assert [f["categoria"] for f in r["filas"]] == ["NONE", "LOW"]
    assert client.get("/api/dashboard/cruce", params={"fila": "vector", "columna": "vector"}).status_code == 422

def test_serie_con_criticos_y_agrupada() -> None:
    dia = _get("serie-diaria")
    assert dia["agrupar"] == "dia" and sum(p["criticos"] for p in dia["puntos"]) == 100
    for p in dia["puntos"]:
        assert p["proporcion_criticos"] == (p["criticos"] / p["conteo"] if p["conteo"] else None)
    mes = _get("serie-diaria", agrupar="mes")
    assert [p["fecha"] for p in mes["puntos"]] == ["2026-01-01", "2026-02-01", "2026-03-01"]
    assert sum(p["conteo"] for p in mes["puntos"]) == 1000
    semana = _get("serie-diaria", agrupar="semana")
    assert all(date.fromisoformat(p["fecha"]).weekday() == 0 for p in semana["puntos"])
    assert client.get("/api/dashboard/serie-diaria", params={"agrupar": "año"}).status_code == 422

def test_privilegios_en_orden() -> None:
    r = _get("privilegios")
    assert [(c["categoria"], c["conteo"]) for c in r["categorias"]] == [("NONE", 500), ("LOW", 500), ("HIGH", 0)]

def test_fuentes_top() -> None:
    r = _get("fuentes", top=3)
    assert r["total"] == 1000 and len(r["categorias"]) == 3
    conteos = [c["conteo"] for c in r["categorias"]]
    assert conteos == sorted(conteos, reverse=True)
