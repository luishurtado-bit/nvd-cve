from stats.binomial import prob_al_menos


def test_ejemplo_del_informe() -> None:
    # X ~ Bin(20; 0,10): P(X >= 3) ≈ 0,3231
    assert abs(prob_al_menos(20, 0.10, 3) - 0.3231) < 1e-4