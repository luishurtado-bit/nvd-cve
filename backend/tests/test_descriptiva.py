from datetime import date
import pandas as pd
import pytest
from stats.descriptiva import atipicos_iqr, distribucion, histograma, resumen_numerico, serie_diaria

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

def test_serie_diaria_con_fechas_ya_convertidas_a_utc() -> None:
    fechas = pd.to_datetime(pd.Series(["2026-01-01T10:00:00.000", "2026-01-03T00:00:00"]), utc=True, format="ISO8601")
    assert serie_diaria(fechas) == [(date(2026, 1, 1), 1), (date(2026, 1, 2), 0), (date(2026, 1, 3), 1)]

def test_atipicos_iqr_marca_sin_eliminar() -> None:
    serie = pd.Series([1, 2, 2, 3, 3, 3, 4, 4, 5, 40])
    r = atipicos_iqr(serie)
    # Q1 = 2,25 y Q3 = 4 → IQR = 1,75 → límites −0,375 y 6,625
    assert (r.q1, r.q3) == (pytest.approx(2.25), pytest.approx(4.0))
    assert (r.limite_inferior, r.limite_superior) == (pytest.approx(-0.375), pytest.approx(6.625))
    assert r.cantidad == 1
    assert r.marcados.tolist() == [False] * 9 + [True]
    assert len(serie) == 10  # la serie original no cambia

def test_atipicos_iqr_en_los_dos_extremos() -> None:
    r = atipicos_iqr(pd.Series([-50, 10, 11, 12, 12, 13, 14, 80]))
    assert r.cantidad == 2 and r.marcados.tolist() == [True] + [False] * 6 + [True]

def test_atipicos_iqr_sin_atipicos() -> None:
    # base_score va de 0 a 10: con datos así no hay atípicos
    r = atipicos_iqr(pd.Series([0.0, 2.5, 5.0, 7.5, 10.0]))
    assert r.cantidad == 0 and not r.marcados.any()

def test_atipicos_iqr_pocos_datos_o_vacios() -> None:
    for serie in (pd.Series([1.0, 100.0, 2.0]), pd.Series([], dtype=float), pd.Series([None, None, 5.0, 6.0])):
        r = atipicos_iqr(serie)
        assert r.cantidad == 0 and r.limite_superior is None and len(r.marcados) == len(serie)

def test_atipicos_iqr_ignora_nulos_y_conserva_el_indice() -> None:
    serie = pd.Series([1, 2, 2, 3, None, 3, 3, 4, 4, 5, 40], index=list("abcdefghijk"))
    r = atipicos_iqr(serie)
    assert r.cantidad == 1 and r.marcados["k"] and not r.marcados["e"]
