"""Pruebas contra el ejemplo hipotético del informe:
N = 1000, |A| = 100 (críticos), |B| = 750 (red), |A ∩ B| = 90.
"""

import pytest

from stats.probabilidad import (
    bayes,
    complemento,
    condicional,
    interseccion,
    posterior,
    probabilidad,
    probabilidad_total,
    son_independientes,
    union,
)

N, N_A, N_B, N_AB = 1000, 100, 750, 90
P_A = probabilidad(N_A, N)
P_B = probabilidad(N_B, N)
P_AB = probabilidad(N_AB, N)
P_B_DADO_A = condicional(P_AB, P_A)  # 0,90
# P(B | Aᶜ) = P(B ∩ Aᶜ) / P(Aᶜ) = (0,75 − 0,09) / 0,90
P_B_DADO_AC = condicional(P_B - P_AB, complemento(P_A))


def test_probabilidades_de_los_eventos() -> None:
    assert P_A == pytest.approx(0.10)
    assert P_B == pytest.approx(0.75)
    assert P_AB == pytest.approx(0.09)


def test_complemento() -> None:
    assert complemento(P_A) == pytest.approx(0.90)


def test_union() -> None:
    assert union(P_A, P_B, P_AB) == pytest.approx(0.76)


def test_a_y_b_no_son_independientes() -> None:
    # P(A)·P(B) = 0,075 ≠ 0,09
    assert P_A * P_B == pytest.approx(0.075)
    assert not son_independientes(P_A, P_B, P_AB)


def test_eventos_independientes() -> None:
    assert son_independientes(0.5, 0.4, 0.2)


def test_condicional() -> None:
    assert condicional(P_AB, P_B) == pytest.approx(0.12)  # P(A | B)
    assert condicional(P_AB, P_A) == pytest.approx(0.90)  # P(B | A)


def test_regla_de_la_multiplicacion() -> None:
    assert interseccion(0.12, P_B) == pytest.approx(P_AB)


def test_condicional_con_p_b_cero() -> None:
    with pytest.raises(ValueError):
        condicional(0.0, 0.0)


@pytest.mark.parametrize(("conteo", "total"), [(1, 0), (-1, 10), (11, 10)])
def test_probabilidad_con_entradas_invalidas(conteo: int, total: int) -> None:
    with pytest.raises(ValueError):
        probabilidad(conteo, total)


def test_probabilidad_fuera_de_rango() -> None:
    with pytest.raises(ValueError):
        complemento(1.5)


def test_condicional_respecto_al_complemento() -> None:
    assert P_B_DADO_AC == pytest.approx(0.7333, abs=1e-4)


def test_probabilidad_total() -> None:
    # 0,90·0,10 + 0,7333·0,90 = 0,75
    assert probabilidad_total(P_B_DADO_A, P_B_DADO_AC, P_A) == pytest.approx(0.75)


def test_bayes() -> None:
    # (0,90·0,10) / 0,75 = 0,12
    assert bayes(P_B_DADO_A, P_A, P_B) == pytest.approx(0.12)


def test_bayes_con_p_b_cero() -> None:
    with pytest.raises(ValueError):
        bayes(0.5, 0.1, 0.0)


def test_posterior_con_el_prior_de_los_datos() -> None:
    # Sin editar el prior, el posterior es P(A | B) = 0,12
    assert posterior(P_A, P_B_DADO_A, P_B_DADO_AC) == pytest.approx(0.12)


def test_posterior_con_prior_editado() -> None:
    # 0,90·0,20 / (0,90·0,20 + 0,7333·0,80) = 0,18 / 0,76667 ≈ 0,2348
    assert posterior(0.20, P_B_DADO_A, P_B_DADO_AC) == pytest.approx(
        0.2348, abs=1e-4
    )


@pytest.mark.parametrize(("prior", "esperado"), [(0.0, 0.0), (1.0, 1.0)])
def test_posterior_en_los_extremos(prior: float, esperado: float) -> None:
    assert posterior(prior, P_B_DADO_A, P_B_DADO_AC) == pytest.approx(esperado)


def test_posterior_con_prior_invalido() -> None:
    with pytest.raises(ValueError):
        posterior(1.2, P_B_DADO_A, P_B_DADO_AC)
