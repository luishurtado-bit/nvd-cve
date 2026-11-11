"""Ejemplo del informe (sección III-C): X ~ Bin(20; 0,10)."""

import pytest

from stats.binomial import (
    advertencias,
    calcular,
    desviacion,
    media,
    n_minimo,
    prob_a_lo_sumo,
    prob_al_menos,
    prob_igual,
    tabla_pmf,
    varianza,
)

n, p = 20, 0.10


def _codigos(n: int, k: int, p: float, N: int | None = None) -> set[str]:
    return {a.codigo for a in advertencias(n, k, p, N)}


def test_ejemplo_del_informe() -> None:
    # X ~ Bin(20; 0,10): P(X >= 3) ≈ 0,3231
    assert abs(prob_al_menos(20, 0.10, 3) - 0.3231) < 1e-4


@pytest.mark.parametrize(
    ("k", "esperado"), [(0, 0.12158), (1, 0.27017), (2, 0.28518)]
)
def test_prob_igual(k: int, esperado: float) -> None:
    assert prob_igual(n, p, k) == pytest.approx(esperado, abs=1e-5)


def test_prob_a_lo_sumo() -> None:
    # 0,12158 + 0,27017 + 0,28518
    assert prob_a_lo_sumo(n, p, 2) == pytest.approx(0.67693, abs=1e-5)


def test_al_menos_y_a_lo_sumo_son_complementarias() -> None:
    assert prob_al_menos(n, p, 3) == pytest.approx(1 - prob_a_lo_sumo(n, p, 2))


def test_media_varianza_y_desviacion() -> None:
    assert media(n, p) == pytest.approx(2)
    assert varianza(n, p) == pytest.approx(1.8)
    assert desviacion(n, p) == pytest.approx(1.342, abs=1e-3)


def test_tabla_pmf() -> None:
    tabla = tabla_pmf(n, p)
    assert len(tabla) == n + 1
    assert sum(tabla) == pytest.approx(1)
    assert tabla[2] == pytest.approx(0.28518, abs=1e-5)


def test_k_mayor_que_n() -> None:
    assert prob_igual(n, p, 25) == 0
    assert prob_al_menos(n, p, 25) == 0


def test_p_invalido() -> None:
    with pytest.raises(ValueError):
        prob_igual(n, 1.5, 3)


def test_n_minimo_del_informe() -> None:
    # n ≥ ln 0,05 / ln 0,90 ≈ 28,4 → n = 29
    assert n_minimo(0.10, 0.95) == 29
    assert 1 - 0.9**29 >= 0.95 > 1 - 0.9**28


def test_n_minimo_extremos() -> None:
    assert n_minimo(1.0, 0.95) == 1
    assert n_minimo(0.99, 0.5) == 1


@pytest.mark.parametrize(("p_", "confianza"), [(0.0, 0.95), (0.1, 1.0), (0.1, 0.0)])
def test_n_minimo_invalido(p_: float, confianza: float) -> None:
    with pytest.raises(ValueError):
        n_minimo(p_, confianza)


def test_sin_advertencias() -> None:
    assert _codigos(20, 3, 0.10, 1000) == set()
    assert _codigos(20, 3, 0.10) == set()


def test_advertencia_n_grande_frente_a_N() -> None:
    # 0,05·1000 = 50: n = 49 no avisa, n = 50 sí
    assert "n_grande_frente_a_N" not in _codigos(49, 3, 0.10, 1000)
    assert "n_grande_frente_a_N" in _codigos(50, 3, 0.10, 1000)


def test_advertencias_k_p_y_N() -> None:
    assert "k_mayor_que_n" in _codigos(20, 25, 0.10)
    assert "p_fuera_de_rango" in _codigos(20, 3, 1.2)
    assert "N_pequeno" in _codigos(1, 0, 0.10, 20)


def test_calcular() -> None:
    r = calcular(n, p, 3, confianza=0.95, N=1000)
    assert r.prob_al_menos == pytest.approx(0.3231, abs=1e-4)
    assert r.prob_igual == pytest.approx(prob_igual(n, p, 3))
    assert r.media == pytest.approx(2)
    assert r.n_minimo == 29
    assert len(r.pmf) == 21
    assert r.advertencias == []


def test_calcular_sin_confianza_ni_N() -> None:
    r = calcular(n, p, 3)
    assert r.n_minimo is None
    assert r.advertencias == []


def test_calcular_con_p_cero() -> None:
    # Con p = 0 no hay n mínimo posible; no debe fallar
    r = calcular(n, 0.0, 0, confianza=0.95)
    assert r.n_minimo is None
    assert r.prob_igual == pytest.approx(1)
