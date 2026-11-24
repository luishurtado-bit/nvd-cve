import math
from dataclasses import dataclass


def _validar_prob(valor: float, nombre: str) -> None:
    if not 0.0 <= valor <= 1.0:
        raise ValueError(f"{nombre} debe estar en [0, 1] y vale {valor}")


def probabilidad(conteo: int, N: int) -> float:
    """P(E) = n(E) / N con resultados equiprobables."""
    if N <= 0:
        raise ValueError("N debe ser mayor que 0")
    if not 0 <= conteo <= N:
        raise ValueError(f"el conteo debe estar entre 0 y N ({N}) y vale {conteo}")
    return conteo / N


def complemento(p_a: float) -> float:
    """P(Aᶜ) = 1 − P(A). Ecuación (1)."""
    _validar_prob(p_a, "P(A)")
    return 1.0 - p_a


def union(p_a: float, p_b: float, p_ab: float) -> float:
    """P(A ∪ B) = P(A) + P(B) − P(A ∩ B). Ecuación (2)."""
    for valor, nombre in ((p_a, "P(A)"), (p_b, "P(B)"), (p_ab, "P(A ∩ B)")):
        _validar_prob(valor, nombre)
    return p_a + p_b - p_ab


def condicional(p_ab: float, p_b: float) -> float:
    """P(A | B) = P(A ∩ B) / P(B), con P(B) > 0. Ecuación (3)."""
    _validar_prob(p_ab, "P(A ∩ B)")
    _validar_prob(p_b, "P(B)")
    if p_b == 0:
        raise ValueError("P(B) = 0: la probabilidad condicional no está definida")
    return p_ab / p_b


def interseccion(p_a_dado_b: float, p_b: float) -> float:
    """P(A ∩ B) = P(A | B) · P(B). Regla de la multiplicación, ecuación (4)."""
    _validar_prob(p_a_dado_b, "P(A | B)")
    _validar_prob(p_b, "P(B)")
    return p_a_dado_b * p_b


def son_independientes(
    p_a: float, p_b: float, p_ab: float, tolerancia: float = 1e-9
) -> bool:
    """A y B son independientes si P(A ∩ B) = P(A) · P(B)."""
    for valor, nombre in ((p_a, "P(A)"), (p_b, "P(B)"), (p_ab, "P(A ∩ B)")):
        _validar_prob(valor, nombre)
    return math.isclose(p_ab, p_a * p_b, abs_tol=tolerancia)


def diferencia_independencia(p_a: float, p_b: float, p_ab: float) -> float:
    """P(A ∩ B) − P(A)·P(B): 0 si A y B fueran independientes."""
    for valor, nombre in ((p_a, "P(A)"), (p_b, "P(B)"), (p_ab, "P(A ∩ B)")):
        _validar_prob(valor, nombre)
    return p_ab - p_a * p_b


def razon_independencia(p_a: float, p_b: float, p_ab: float) -> float | None:
    """P(A ∩ B) / (P(A)·P(B)): cuántas veces ocurren juntos frente a lo esperado si fueran
    independientes (1 = igual). None si P(A)·P(B) = 0, donde la razón no existe."""
    for valor, nombre in ((p_a, "P(A)"), (p_b, "P(B)"), (p_ab, "P(A ∩ B)")):
        _validar_prob(valor, nombre)
    producto = p_a * p_b
    return p_ab / producto if producto > 0 else None


@dataclass(frozen=True)
class Contingencia:
    """Reparto de los N resultados según cumplan X y Y (las cuatro celdas suman N)."""

    x_y: int
    x_no_y: int
    no_x_y: int
    no_x_no_y: int


def contingencia(N: int, n_x: int, n_y: int, n_xy: int) -> Contingencia:
    """Tabla 2×2 a partir de n(X), n(Y) y n(X ∩ Y)."""
    if not 0 <= n_xy <= min(n_x, n_y) or max(n_x, n_y) > N or n_x + n_y - n_xy > N:
        raise ValueError(
            f"conteos incoherentes: N = {N}, n(X) = {n_x}, n(Y) = {n_y}, n(X ∩ Y) = {n_xy}"
        )
    return Contingencia(
        x_y=n_xy, x_no_y=n_x - n_xy, no_x_y=n_y - n_xy, no_x_no_y=N - n_x - n_y + n_xy
    )


def probabilidad_total(p_b_dado_a: float, p_b_dado_ac: float, p_a: float) -> float:
    """P(B) = P(B | A)·P(A) + P(B | Aᶜ)·P(Aᶜ). Ecuación (5)."""
    _validar_prob(p_b_dado_a, "P(B | A)")
    _validar_prob(p_b_dado_ac, "P(B | Aᶜ)")
    return p_b_dado_a * p_a + p_b_dado_ac * complemento(p_a)


def bayes(p_b_dado_a: float, p_a: float, p_b: float) -> float:
    """P(A | B) = P(B | A)·P(A) / P(B). Ecuación (6)."""
    _validar_prob(p_b_dado_a, "P(B | A)")
    _validar_prob(p_a, "P(A)")
    _validar_prob(p_b, "P(B)")
    if p_b == 0:
        raise ValueError("P(B) = 0: el teorema de Bayes no está definido")
    return p_b_dado_a * p_a / p_b


def posterior(prior: float, p_b_dado_a: float, p_b_dado_ac: float) -> float:
    """Probabilidad posterior de A al observar B, con prior editable.

    Las verosimilitudes P(B | A) y P(B | Aᶜ) salen de los datos; el prior
    reemplaza a P(A) en la probabilidad total (5) y en Bayes (6). Si el
    prior es el P(A) de los datos, el resultado coincide con P(A | B).
    """
    _validar_prob(prior, "prior")
    p_b = probabilidad_total(p_b_dado_a, p_b_dado_ac, prior)
    return bayes(p_b_dado_a, prior, p_b)
