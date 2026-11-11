"""Endpoint /binomial con el ejemplo del informe: X ~ Bin(20; 0,10), N = 1000, K = 100."""

import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def _post(**cuerpo: object) -> dict:
    r = client.post("/api/binomial", json=cuerpo)
    assert r.status_code == 200, r.text
    return r.json()

def _codigos(cuerpo: dict) -> set[str]:
    return {a["codigo"] for a in cuerpo["advertencias"]}

def test_ejemplo_del_informe_con_p_manual() -> None:
    c = _post(n=20, k=3, p=0.10)
    assert c["p_estimada"] is False
    assert (c["N"], c["K"]) == (1000, 100)
    assert c["prob_al_menos"] == pytest.approx(0.3231, abs=1e-4)
    assert c["prob_a_lo_sumo"] == pytest.approx(0.86705, abs=1e-5)
    assert c["prob_igual"] == pytest.approx(0.19012, abs=1e-5)
    assert c["media"] == pytest.approx(2)
    assert c["varianza"] == pytest.approx(1.8)
    assert c["desviacion"] == pytest.approx(1.342, abs=1e-3)
    assert c["n_minimo"] is None
    assert c["advertencias"] == []

def test_tabla_pmf() -> None:
    pmf = _post(n=20, k=3, p=0.10)["pmf"]
    assert [punto["k"] for punto in pmf] == list(range(21))
    assert pmf[0]["probabilidad"] == pytest.approx(0.12158, abs=1e-5)
    assert sum(punto["probabilidad"] for punto in pmf) == pytest.approx(1)

def test_p_estimada_como_k_sobre_n() -> None:
    c = _post(n=20, k=3)
    assert c["p_estimada"] is True
    assert c["p"] == pytest.approx(0.10)
    assert c["prob_al_menos"] == pytest.approx(0.3231, abs=1e-4)

def test_p_estimada_con_umbral_editado() -> None:
    c = _post(n=20, k=3, criterios={"umbral": 7.0})
    assert c["K"] == 760
    assert c["p"] == pytest.approx(0.76)

def test_n_minimo_del_informe() -> None:
    c = _post(n=20, k=3, confianza=0.95)
    assert c["confianza"] == pytest.approx(0.95)
    assert c["n_minimo"] == 29

def test_n_minimo_con_p_cero() -> None:
    # Con umbral 10 no hay críticos: p = 0 y no existe n mínimo
    c = _post(n=20, k=0, confianza=0.95, criterios={"umbral": 10})
    assert c["p"] == 0
    assert c["n_minimo"] is None
    assert c["prob_igual"] == pytest.approx(1)

def test_advertencia_n_grande_frente_a_N() -> None:
    assert "n_grande_frente_a_N" not in _codigos(_post(n=49, k=3, p=0.10))
    assert "n_grande_frente_a_N" in _codigos(_post(n=50, k=3, p=0.10))

def test_k_mayor_que_n() -> None:
    c = _post(n=20, k=25, p=0.10)
    assert c["prob_igual"] == 0
    assert c["prob_al_menos"] == 0
    assert "k_mayor_que_n" in _codigos(c)

@pytest.mark.parametrize(
    "cuerpo",
    [
        {"n": 20, "k": 3, "p": 1.5},
        {"n": 0, "k": 3},
        {"n": 20, "k": -1},
        {"n": 20, "k": 3, "confianza": 1},
        {"n": 20, "k": 3, "confianza": 0},
        {"k": 3},
    ],
)
def test_entradas_invalidas(cuerpo: dict) -> None:
    assert client.post("/api/binomial", json=cuerpo).status_code == 422
