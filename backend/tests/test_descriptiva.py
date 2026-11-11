from datetime import date
import pandas as pd
import pytest
from stats.descriptiva import distribucion, histograma, resumen_numerico, serie_diaria

def test_distribucion_de_mayor_a_menor() -> None:
    d = distribucion(pd.Series(["b", "a", "b", "c", "b", "a"]))
    assert [(c.categoria, c.conteo) for c in d] == [("b", 3), ("a", 2), ("c", 1)]
    assert sum(c.proporcion for c in d) == pytest.approx(1)

def test_distribucion_empates_por_nombre() -> None:
    d = distribucion(pd.Series(["y", "x"]))
    assert [c.categoria for c in d] == ["x", "y"]

def test_distribucion_con_orden_y_ceros() -> None:
    d = distribucion(pd.Series(["LOW", "HIGH", "HIGH", "RARA"]), orden=["HIGH", "MEDIUM", "LOW"])
    assert [(c.categoria, c.conteo) for c in d] == [
        ("HIGH", 2), ("MEDIUM", 0), ("LOW", 1), ("RARA", 1)
    ]

def test_distribucion_top() -> None:
    d = distribucion(pd.Series(["a"] * 3 + ["b"] * 2 + ["c"]), top=2)
    assert [c.categoria for c in d] == ["a", "b"]
    # La proporción es sobre el total, no sobre el top
    assert d[0].proporcion == pytest.approx(0.5)

def test_distribucion_ignora_vacios() -> None:
    d = distribucion(pd.Series(["a", None, "a"]))
    assert [(c.categoria, c.conteo, c.proporcion) for c in d] == [("a", 2, 1.0)]

def test_serie_diaria_rellena_dias_sin_cve() -> None:
    fechas = pd.Series(["2026-01-01T10:00", "2026-01-01T23:59", "2026-01-03T00:00"])
    assert serie_diaria(fechas) == [
        (date(2026, 1, 1), 2), (date(2026, 1, 2), 0), (date(2026, 1, 3), 1)
    ]

def test_serie_diaria_vacia() -> None:
    assert serie_diaria(pd.Series([], dtype="object")) == []

def test_histograma() -> None:
    h = histograma(pd.Series([0.0, 1.5, 9.9, 10.0]), bins=2)
    assert [(i.desde, i.hasta, i.conteo) for i in h] == [(0.0, 5.0, 2), (5.0, 10.0, 2)]

def test_histograma_bins_invalido() -> None:
    with pytest.raises(ValueError):
        histograma(pd.Series([5.0]), bins=0)

def test_resumen_numerico() -> None:
    r = resumen_numerico(pd.Series([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]))
    assert r.n == 8
    assert r.media == pytest.approx(5.0)
    assert r.mediana == pytest.approx(4.5)
    assert r.desviacion == pytest.approx(2.13809, abs=1e-5)  # muestral

def test_resumen_numerico_casos_limite() -> None:
    assert resumen_numerico(pd.Series([], dtype=float)).media is None
    uno = resumen_numerico(pd.Series([7.5]))
    assert (uno.media, uno.mediana, uno.desviacion) == (7.5, 7.5, None)
