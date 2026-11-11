import math
from dataclasses import dataclass, field

from scipy.stats import binom

# Regla práctica del informe: sin reemplazo ≈ independiente si n < 0,05·N
FRACCION_MAXIMA_DE_N = 0.05
# Por debajo de este N la estimación p = K/N es poco fiable
N_PEQUENO = 30


def _validar(n: int, p: float) -> None:
    if n < 0:
        raise ValueError(f"n debe ser mayor o igual que 0 y vale {n}")
    if not 0.0 <= p <= 1.0:
        raise ValueError(f"p debe estar en [0, 1] y vale {p}")


def prob_igual(n: int, p: float, k: int) -> float:
    """P(X = k) = C(n, k)·p^k·(1 − p)^(n−k). Ecuación (7)."""
    _validar(n, p)
    return float(binom.pmf(k, n, p))


def prob_a_lo_sumo(n: int, p: float, k: int) -> float:
    """P(X ≤ k)."""
    _validar(n, p)
    return float(binom.cdf(k, n, p))


def prob_al_menos(n: int, p: float, k: int) -> float:
    """P(X ≥ k) = 1 − P(X ≤ k − 1)."""
    _validar(n, p)
    return float(binom.sf(k - 1, n, p))


def media(n: int, p: float) -> float:
    """E(X) = n·p. Ecuación (8)."""
    _validar(n, p)
    return n * p


def varianza(n: int, p: float) -> float:
    """Var(X) = n·p·(1 − p). Ecuación (8)."""
    _validar(n, p)
    return n * p * (1 - p)


def desviacion(n: int, p: float) -> float:
    return math.sqrt(varianza(n, p))


def tabla_pmf(n: int, p: float) -> list[float]:
    """[P(X = 0), P(X = 1), …, P(X = n)]."""
    _validar(n, p)
    return [float(v) for v in binom.pmf(range(n + 1), n, p)]


def n_minimo(p: float, confianza: float) -> int:
    """Menor n con P(X ≥ 1) = 1 − (1 − p)^n ≥ confianza.

    Equivale a n ≥ ln(1 − confianza) / ln(1 − p).
    """
    if not 0.0 < p <= 1.0:
        raise ValueError("p debe estar en (0, 1]: con p = 0 nunca hay críticos")
    if not 0.0 < confianza < 1.0:
        raise ValueError(f"la confianza debe estar en (0, 1) y vale {confianza}")
    if p == 1.0:
        return 1
    n = max(1, math.ceil(math.log(1 - confianza) / math.log(1 - p)))
    # Corrige posibles errores de redondeo en el límite
    while n > 1 and 1 - (1 - p) ** (n - 1) >= confianza:
        n -= 1
    while 1 - (1 - p) ** n < confianza:
        n += 1
    return n


@dataclass(frozen=True)
class Advertencia:
    codigo: str
    mensaje: str


def advertencias(n: int, k: int, p: float, N: int | None = None) -> list[Advertencia]:
    avisos: list[Advertencia] = []
    if not 0.0 <= p <= 1.0:
        avisos.append(Advertencia("p_fuera_de_rango", f"p = {p} está fuera de [0, 1]"))
    if k > n:
        avisos.append(
            Advertencia("k_mayor_que_n", f"k = {k} es mayor que n = {n}: P(X = k) = 0")
        )
    if N is not None:
        if N < N_PEQUENO:
            avisos.append(
                Advertencia(
                    "N_pequeno",
                    f"N = {N} es menor que {N_PEQUENO}: la estimación de p es poco fiable",
                )
            )
        if n >= FRACCION_MAXIMA_DE_N * N:
            avisos.append(
                Advertencia(
                    "n_grande_frente_a_N",
                    f"n = {n} ≥ 0,05·N = {FRACCION_MAXIMA_DE_N * N:g}: "
                    "el supuesto de independencia se debilita",
                )
            )
    return avisos


@dataclass(frozen=True)
class ResultadoBinomial:
    n: int
    p: float
    k: int
    pmf: list[float]
    prob_igual: float
    prob_a_lo_sumo: float
    prob_al_menos: float
    media: float
    varianza: float
    desviacion: float
    n_minimo: int | None
    advertencias: list[Advertencia] = field(default_factory=list)


def calcular(
    n: int,
    p: float,
    k: int,
    confianza: float | None = None,
    N: int | None = None,
) -> ResultadoBinomial:
    _validar(n, p)
    return ResultadoBinomial(
        n=n,
        p=p,
        k=k,
        pmf=tabla_pmf(n, p),
        prob_igual=prob_igual(n, p, k),
        prob_a_lo_sumo=prob_a_lo_sumo(n, p, k),
        prob_al_menos=prob_al_menos(n, p, k),
        media=media(n, p),
        varianza=varianza(n, p),
        desviacion=desviacion(n, p),
        n_minimo=n_minimo(p, confianza) if confianza is not None and p > 0 else None,
        advertencias=advertencias(n, k, p, N),
    )
