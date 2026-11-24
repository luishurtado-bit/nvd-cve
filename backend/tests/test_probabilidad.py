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

# --- B27: diferencia, razón y tabla 2×2 ---

from stats.probabilidad import Contingencia, contingencia, diferencia_independencia, razon_independencia

def test_diferencia_y_razon() -> None:
    assert diferencia_independencia(0.1, 0.75, 0.09) == pytest.approx(0.015)
    assert razon_independencia(0.1, 0.75, 0.09) == pytest.approx(1.2)
    assert razon_independencia(0.5, 0.5, 0.25) == 1.0  # independientes

def test_razon_menor_que_uno_si_ocurren_menos_juntos() -> None:
    assert razon_independencia(0.5, 0.5, 0.1) == pytest.approx(0.4)
    assert diferencia_independencia(0.5, 0.5, 0.1) < 0

def test_razon_no_existe_si_un_evento_es_imposible() -> None:
    assert razon_independencia(0.0, 0.5, 0.0) is None
    assert diferencia_independencia(0.0, 0.5, 0.0) == 0

def test_razon_y_diferencia_validan_probabilidades() -> None:
    with pytest.raises(ValueError, match="P\\(A\\)"):
        razon_independencia(1.5, 0.5, 0.2)
    with pytest.raises(ValueError, match="P\\(A ∩ B\\)"):
        diferencia_independencia(0.5, 0.5, -0.1)

def test_contingencia_suma_n() -> None:
    t = contingencia(1000, 100, 750, 90)
    assert t == Contingencia(x_y=90, x_no_y=10, no_x_y=660, no_x_no_y=240)
    assert t.x_y + t.x_no_y + t.no_x_y + t.no_x_no_y == 1000

@pytest.mark.parametrize(
    "conteos",
    [(10, 5, 3, 6), (10, 8, 7, 4), (10, 12, 3, 3), (10, 5, 5, -1)],  # n(X ∩ Y) > n(Y); X ∪ Y > N; n(X) > N; negativo
)
def test_contingencia_incoherente(conteos: tuple[int, int, int, int]) -> None:
    with pytest.raises(ValueError, match="incoherentes"):
        contingencia(*conteos)
