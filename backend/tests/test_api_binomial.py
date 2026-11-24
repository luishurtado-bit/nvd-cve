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
    c = _post(n=20, k=3, umbral=7.0)
    assert c["K"] == 760
    assert c["p"] == pytest.approx(0.76)

def test_n_minimo_del_informe() -> None:
    c = _post(n=20, k=3, confianza=0.95)
    assert c["confianza"] == pytest.approx(0.95)
    assert c["n_minimo"] == 29

def test_n_minimo_con_p_cero() -> None:
    # Con umbral 10 no hay críticos: p = 0 y no existe n mínimo
    c = _post(n=20, k=0, confianza=0.95, umbral=10)
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

# --- B26: binomial más clara ---

def _supuestos(cuerpo: dict) -> dict[str, dict]:
    return {s["codigo"]: s for s in cuerpo["supuestos"]}

def test_los_cuatro_supuestos_en_orden() -> None:
    c = _post(n=20, k=3)
    assert [s["codigo"] for s in c["supuestos"]] == ["n_fijo", "dos_resultados", "p_constante", "independencia"]
    assert {s["estado"] for s in c["supuestos"]} == {"cumple"}
    assert all(s["texto"] for s in c["supuestos"])
    s = _supuestos(c)
    assert "n = 20" in s["n_fijo"]["texto"]
    assert "baseScore ≥ 9" in s["dos_resultados"]["texto"]
    assert "10,0 % (100 de 1000)" in s["p_constante"]["texto"]
    assert "n = 20" in s["independencia"]["texto"] and "49" in s["independencia"]["texto"]

def test_n_maximo_recomendado_es_el_mayor_con_n_menor_que_el_5_por_ciento() -> None:
    c = _post(n=20, k=3)
    assert (c["N"], c["n_max_recomendado"]) == (1000, 49)  # 0,05·N = 50 y n debe ser menor
    # Coincide con el aviso: el límite no lo dispara y el siguiente sí
    assert "n_grande_frente_a_N" not in _codigos(_post(n=49, k=3))
    assert "n_grande_frente_a_N" in _codigos(_post(n=50, k=3))

def test_la_independencia_pasa_a_advertencia_con_lotes_grandes() -> None:
    c = _post(n=50, k=3)
    assert _supuestos(c)["independencia"]["estado"] == "advertencia"
    assert {s["estado"] for s in c["supuestos"] if s["codigo"] != "independencia"} == {"cumple"}
    assert "n_grande_frente_a_N" in _codigos(c)  # las advertencias de antes siguen

def test_p_a_mano_se_dice_en_los_supuestos() -> None:
    c = _post(n=20, k=3, p=0.25)
    assert "escrita a mano" in _supuestos(c)["p_constante"]["texto"]
    assert _supuestos(c)["p_constante"]["estado"] == "cumple"

def test_p_estimada_con_pocos_cve_es_poco_fiable() -> None:
    client.post(
        "/api/datos/archivo",
        files={"archivo": ("cves.csv", (
            "cve_id,publicado,estado,base_score,vector_ataque,privilegios\n"
            "CVE-1,2026-10-05T10:00:00,Analyzed,9.1,NETWORK,NONE\n"
            "CVE-2,2026-10-06T10:00:00,Analyzed,5.0,LOCAL,LOW\n"
        ).encode(), "text/csv")},
    )
    c = _post(n=1, k=1)
    assert (c["N"], c["n_max_recomendado"]) == (2, 0)
    p = _supuestos(c)["p_constante"]
    assert p["estado"] == "advertencia" and "poco fiable" in p["texto"]
    assert _supuestos(c)["independencia"]["estado"] == "advertencia"

def test_la_respuesta_trae_el_umbral() -> None:
    assert _post(n=20, k=3)["umbral"] == 9.0
    c = _post(n=20, k=3, umbral=7)
    assert c["umbral"] == 7 and "baseScore ≥ 7" in _supuestos(c)["dos_resultados"]["texto"]

@pytest.mark.parametrize(
    "cuerpo",
    [
        {"n": 20, "k": 3, "criterios": {"umbral": 7.0}},  # la forma anterior ya no existe
        {"n": 20, "k": 3, "vector": "LOCAL"},
        {"n": 20, "k": 3, "privilegios": "LOW"},
        {"n": 20, "k": 3, "umbral": 11},
    ],
)
def test_vector_y_privilegios_ya_no_se_aceptan(cuerpo: dict) -> None:
    assert client.post("/api/binomial", json=cuerpo).status_code == 422

def test_el_umbral_queda_en_el_registro() -> None:
    from api import registro
    _post(n=20, k=3, umbral=7)
    assert registro.leer()[0].parametros["umbral"] == 7
