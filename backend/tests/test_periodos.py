from datetime import date, timedelta
import pytest
from nvd.periodos import MAX_DIAS, fin_del_dia, inicio_del_dia, parametros_tramo, partir_periodo

def _dias(tramo: tuple[date, date]) -> int:
    return (tramo[1] - tramo[0]).days + 1

def test_un_solo_dia() -> None:
    dia = date(2026, 11, 1)
    assert partir_periodo(dia, dia) == [(dia, dia)]

def test_exactamente_120_dias_es_un_tramo() -> None:
    inicio = date(2026, 1, 1)
    fin = inicio + timedelta(days=MAX_DIAS - 1)  # 30 de abril
    assert partir_periodo(inicio, fin) == [(inicio, fin)]

def test_121_dias_son_dos_tramos() -> None:
    inicio = date(2026, 1, 1)
    tramos = partir_periodo(inicio, inicio + timedelta(days=MAX_DIAS))
    assert [_dias(t) for t in tramos] == [120, 1]

def test_un_anio() -> None:
    tramos = partir_periodo(date(2025, 1, 1), date(2025, 12, 31))
    assert [_dias(t) for t in tramos] == [120, 120, 120, 5]
    assert tramos[0][0] == date(2025, 1, 1)
    assert tramos[-1][1] == date(2025, 12, 31)

def test_tramos_contiguos_y_sin_solapes() -> None:
    tramos = partir_periodo(date(2024, 2, 1), date(2025, 3, 15))
    for (_, hasta), (desde, _) in zip(tramos, tramos[1:]):
        assert desde == hasta + timedelta(days=1)
    assert all(_dias(t) <= MAX_DIAS for t in tramos)
    assert sum(_dias(t) for t in tramos) == (date(2025, 3, 15) - date(2024, 2, 1)).days + 1

def test_max_dias_configurable() -> None:
    tramos = partir_periodo(date(2026, 1, 1), date(2026, 1, 10), max_dias=4)
    assert [_dias(t) for t in tramos] == [4, 4, 2]

def test_fin_antes_de_inicio() -> None:
    with pytest.raises(ValueError):
        partir_periodo(date(2026, 2, 1), date(2026, 1, 1))

def test_max_dias_invalido() -> None:
    with pytest.raises(ValueError):
        partir_periodo(date(2026, 1, 1), date(2026, 1, 2), max_dias=0)

def test_formato_de_fechas() -> None:
    assert inicio_del_dia(date(2026, 1, 5)) == "2026-01-05T00:00:00.000"
    assert fin_del_dia(date(2026, 1, 5)) == "2026-01-05T23:59:59.999"

def test_parametros_tramo() -> None:
    assert parametros_tramo(date(2026, 1, 1), date(2026, 4, 30)) == {
        "pubStartDate": "2026-01-01T00:00:00.000",
        "pubEndDate": "2026-04-30T23:59:59.999",
    }
