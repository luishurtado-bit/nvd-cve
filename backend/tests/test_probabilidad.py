"""Pruebas contra el ejemplo hipotético del informe:
N = 1000, |A| = 100 (críticos), |B| = 750 (red), |A ∩ B| = 90.
"""

import pytest

from stats.probabilidad import (
    complemento,
    condicional,
    interseccion,
    probabilidad,
    son_independientes,
    union,
)

N, N_A, N_B, N_AB = 1000, 100, 750, 90
P_A = probabilidad(N_A, N)
P_B = probabilidad(N_B, N)
P_AB = probabilidad(N_AB, N)


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
