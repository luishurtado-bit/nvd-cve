"""Endpoints de eventos, reglas y Bayes sobre el Ω hipotético del informe:
N = 1000, |A| = 100, |B| = 750, |A ∩ B| = 90;
C: |C| = 500, |A ∩ C| = 65, |B ∩ C| = 460, |A ∩ B ∩ C| = 60.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

# --- /eventos ---

def test_eventos_con_criterios_por_defecto() -> None:
    r = client.post("/api/eventos", json={})
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["N"] == 1000
    assert cuerpo["criterios"] == {"umbral": 9.0, "vector": "NETWORK", "privilegios": "NONE"}

    ev = cuerpo["eventos"]
    conteos = {k: v["conteo"] for k, v in ev.items()}
    assert conteos == {"A": 100, "B": 750, "C": 500, "AB": 90, "AC": 65, "BC": 460, "ABC": 60}
    assert ev["A"]["probabilidad"] == pytest.approx(0.10)
    assert ev["B"]["probabilidad"] == pytest.approx(0.75)
    assert ev["AB"]["probabilidad"] == pytest.approx(0.09)

def test_eventos_con_umbral_editado() -> None:
    r = client.post("/api/eventos", json={"umbral": 7.0})
    assert r.json()["eventos"]["A"]["conteo"] == 760

def test_eventos_con_vector_editado() -> None:
    r = client.post("/api/eventos", json={"vector": "LOCAL"})
    assert r.json()["eventos"]["B"]["conteo"] == 250

@pytest.mark.parametrize(
    "criterios", [{"umbral": 11}, {"umbral": -1}, {"vector": "RED"}, {"privilegios": "X"}]
)
def test_eventos_con_criterios_invalidos(criterios: dict) -> None:
    assert client.post("/api/eventos", json=criterios).status_code == 422

# --- /reglas ---

def test_reglas_a_y_b_del_informe() -> None:
    r = client.post("/api/reglas", json={})
    assert r.status_code == 200
    c = r.json()
    assert (c["x"], c["y"]) == ("A", "B")
    assert c["p_x_complemento"] == pytest.approx(0.90)
    assert c["p_union"] == pytest.approx(0.76)
    assert c["p_interseccion"] == pytest.approx(0.09)
    assert c["producto"] == pytest.approx(0.075)
    assert c["independientes"] is False
    assert "propiedad de la métrica" in c["nota"]

def test_reglas_b_y_c_sin_nota() -> None:
    c = client.post("/api/reglas", json={"x": "B", "y": "C"}).json()
    assert c["p_interseccion"] == pytest.approx(0.46)
    assert c["producto"] == pytest.approx(0.375)
    assert c["p_union"] == pytest.approx(0.79)
    assert c["nota"] is None

def test_reglas_orden_de_los_eventos() -> None:
    c = client.post("/api/reglas", json={"x": "C", "y": "A"}).json()
    assert c["p_interseccion"] == pytest.approx(0.065)

def test_reglas_eventos_iguales() -> None:
    assert client.post("/api/reglas", json={"x": "A", "y": "A"}).status_code == 422

# --- /bayes ---

def test_bayes_por_b_del_informe() -> None:
    r = client.post("/api/bayes", json={})
    assert r.status_code == 200
    c = r.json()
    assert c["condicionante"] == "B"
    assert c["prior"] == pytest.approx(0.10)
    assert c["p_e_dado_a"] == pytest.approx(0.90)
    assert c["p_e_dado_ac"] == pytest.approx(0.7333, abs=1e-4)
    assert c["p_e"] == pytest.approx(0.75)
    assert c["p_a_dado_e"] == pytest.approx(0.12)
    assert c["posterior"] == pytest.approx(0.12)

def test_bayes_con_prior_editado() -> None:
    c = client.post("/api/bayes", json={"prior": 0.20}).json()
    assert c["prior"] == pytest.approx(0.20)
    assert c["posterior"] == pytest.approx(0.2348, abs=1e-4)
    # P(A | E) de los datos no cambia con el prior
    assert c["p_a_dado_e"] == pytest.approx(0.12)

def test_bayes_por_c() -> None:
    c = client.post("/api/bayes", json={"condicionante": "C"}).json()
    assert c["p_e_dado_a"] == pytest.approx(0.65)
    assert c["p_e_dado_ac"] == pytest.approx(0.435 / 0.9)
    assert c["p_e"] == pytest.approx(0.50)
    assert c["posterior"] == pytest.approx(0.13)

@pytest.mark.parametrize("cuerpo", [{"prior": 1.5}, {"condicionante": "A"}])
def test_bayes_entradas_invalidas(cuerpo: dict) -> None:
    assert client.post("/api/bayes", json=cuerpo).status_code == 422

@pytest.mark.parametrize("umbral", [0, 10])
def test_bayes_con_p_a_cero_o_uno(umbral: float) -> None:
    r = client.post("/api/bayes", json={"criterios": {"umbral": umbral}})
    assert r.status_code == 422
    assert "P(A)" in r.json()["detail"]

def test_bayes_con_condicionante_vacio() -> None:
    r = client.post("/api/bayes", json={"criterios": {"vector": "PHYSICAL"}})
    assert r.status_code == 422
    assert "P(B) = 0" in r.json()["detail"]
