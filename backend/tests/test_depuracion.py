import pandas as pd
import pytest
from nvd.depuracion import depurar
from nvd.extraccion import a_dataframe
from stats.eventos import contar_eventos
from tests.ejemplos_nvd import cve, metrica

def _crudo() -> pd.DataFrame:
    return a_dataframe(
        [
            cve("CVE-1", metricas={"cvssMetricV31": [metrica(9.8)]}),
            cve("CVE-2", metricas={"cvssMetricV31": [metrica(5.5, "LOCAL", "LOW")]}),
            cve("CVE-3", estado="Rejected"),
            # Rechazado aunque tenga puntuación: cuenta como rechazado, no entra a Ω
            cve("CVE-4", estado="Rejected", metricas={"cvssMetricV31": [metrica(7.0)]}),
            cve("CVE-5", estado="Awaiting Analysis"),  # sin puntuación
            cve("CVE-1", metricas={"cvssMetricV31": [metrica(9.8)]}),  # repetido
        ]
    )

def test_conteos() -> None:
    _, c = depurar(_crudo())
    assert (c.descargados, c.rechazados, c.sin_puntuacion, c.N) == (5, 2, 1, 2)
    assert c.N == c.descargados - c.rechazados - c.sin_puntuacion

def test_omega() -> None:
    omega, _ = depurar(_crudo())
    assert omega["cve_id"].tolist() == ["CVE-2", "CVE-1"]
    assert omega["base_score"].notna().all()
    # Ω sirve directo para los eventos de stats/
    eventos = contar_eventos(omega)
    assert (eventos.N, eventos.A, eventos.B, eventos.C) == (2, 1, 1, 1)

def test_sin_datos() -> None:
    omega, c = depurar(a_dataframe([]))
    assert omega.empty and c.N == 0 and c.descargados == 0

def test_todos_rechazados() -> None:
    _, c = depurar(a_dataframe([cve("A", estado="Rejected"), cve("B", estado="Rejected")]))
    assert (c.rechazados, c.N) == (2, 0)

def test_estado_vacio_no_falla() -> None:
    df = _crudo()
    df["estado"] = pd.NA
    _, c = depurar(df)
    assert c.rechazados == 0

def test_faltan_columnas() -> None:
    with pytest.raises(ValueError, match="estado"):
        depurar(_crudo().drop(columns=["estado"]))
