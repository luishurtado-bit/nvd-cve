from scipy.stats import binom


def prob_al_menos(n: int, p: float, k: int) -> float:
    """P(X >= k) para X ~ Bin(n, p)."""
    return float(binom.sf(k - 1, n, p))