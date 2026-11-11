"""Endpoints del dashboard sobre el Ω hipotético (N = 1000)."""

from datetime import date
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def _get(ruta: str, **params: object) -> dict:
    r = client.get(f"/api/dashboard/{ruta}", params=params)
    assert r.status_code == 200, r.text
    return r.json()

def _conteos(cuerpo: dict) -> dict[str, int]:
    return {c["categoria"]: c["conteo"] for c in cuerpo["categorias"]}

def test_severidad() -> None:
    c = _get("severidad")
    assert c["total"] == 1000
    assert [x["categoria"] for x in c["categorias"]] == ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"]
    conteos = _conteos(c)
    # Críticos = |A| del informe; HIGH = el grupo Aᶜ ∩ B (7,0 a 8,9)
    assert conteos["CRITICAL"] == 100
    assert conteos["HIGH"] == 660
    assert conteos["MEDIUM"] + conteos["LOW"] == 240
    assert conteos["NONE"] == 0
    assert sum(x["proporcion"] for x in c["categorias"]) == pytest.approx(1)

def test_vector_ataque() -> None:
    c = _get("vector-ataque")
    assert c["total"] == 1000
    assert _conteos(c) == {"NETWORK": 750, "LOCAL": 250}
    assert c["categorias"][0]["proporcion"] == pytest.approx(0.75)

def test_serie_diaria() -> None:
    c = _get("serie-diaria")
    assert c["total"] == 1000
    fechas = [date.fromisoformat(p["fecha"]) for p in c["puntos"]]
    assert fechas[0] >= date(2026, 1, 1) and fechas[-1] <= date(2026, 3, 31)
    # Días consecutivos, sin huecos
    assert all((b - a).days == 1 for a, b in zip(fechas, fechas[1:]))
    assert sum(p["conteo"] for p in c["puntos"]) == 1000

def test_histograma_por_defecto() -> None:
    c = _get("histograma")
    assert c["n"] == 1000
    assert len(c["intervalos"]) == 10
    assert c["intervalos"][0]["desde"] == 0 and c["intervalos"][-1]["hasta"] == 10
    assert sum(i["conteo"] for i in c["intervalos"]) == 1000
    # Los 100 críticos (9,0 a 9,9) caen en el último intervalo [9, 10]
    assert c["intervalos"][-1]["conteo"] == 100
    assert 0 < c["media"] < 10 and 0 < c["mediana"] < 10 and c["desviacion"] > 0

def test_histograma_con_bins() -> None:
    assert len(_get("histograma", bins=5)["intervalos"]) == 5

def test_cwe_top() -> None:
    c = _get("cwe", top=3)
    assert c["total"] == 1000
    assert len(c["categorias"]) == 3
    conteos = [x["conteo"] for x in c["categorias"]]
    assert conteos == sorted(conteos, reverse=True)

def test_cwe_por_defecto() -> None:
    assert len(_get("cwe")["categorias"]) <= 10

@pytest.mark.parametrize(
    "ruta", ["histograma?bins=0", "histograma?bins=51", "cwe?top=0", "cwe?top=abc"]
)
def test_parametros_invalidos(ruta: str) -> None:
    assert client.get(f"/api/dashboard/{ruta}").status_code == 422
