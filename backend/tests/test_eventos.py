"""DataFrame sintético que reproduce el ejemplo del informe:
N = 1000, |A| = 100, |B| = 750, |A ∩ B| = 90.
C (sin privilegios) se reparte para probar sus intersecciones.
"""

import pandas as pd
import pytest

from stats.eventos import Criterios, contar_eventos, mascaras


def _grupo(cantidad: int, puntuacion: float, vector: str, sin_priv: int) -> pd.DataFrame:
    """`cantidad` filas iguales; las primeras `sin_priv` tienen PR:N."""
    return pd.DataFrame(
        {
            "base_score": [puntuacion] * cantidad,
            "vector_ataque": [vector] * cantidad,
            "privilegios": ["NONE"] * sin_priv + ["LOW"] * (cantidad - sin_priv),
        }
    )


@pytest.fixture
def df() -> pd.DataFrame:
    return pd.concat(
        [
            _grupo(90, 9.8, "NETWORK", 60),  # A ∩ B
            _grupo(10, 9.1, "LOCAL", 5),  # A ∩ Bᶜ
            _grupo(660, 7.5, "NETWORK", 400),  # Aᶜ ∩ B
            _grupo(240, 5.0, "LOCAL", 35),  # Aᶜ ∩ Bᶜ
        ],
        ignore_index=True,
    )


def test_conteos_del_informe(df: pd.DataFrame) -> None:
    c = contar_eventos(df)
    assert (c.N, c.A, c.B, c.AB) == (1000, 100, 750, 90)


def test_conteos_de_c(df: pd.DataFrame) -> None:
    c = contar_eventos(df)
    assert c.C == 60 + 5 + 400 + 35
    assert c.AC == 60 + 5
    assert c.BC == 60 + 400
    assert c.ABC == 60


def test_umbral_editable(df: pd.DataFrame) -> None:
    # Con umbral 7,0 también cuentan los 660 de puntuación 7,5
    assert contar_eventos(df, Criterios(umbral=7.0)).A == 760


def test_umbral_inclusivo() -> None:
    datos = _grupo(1, 9.0, "NETWORK", 0)
    assert contar_eventos(datos).A == 1


def test_vector_editable(df: pd.DataFrame) -> None:
    assert contar_eventos(df, Criterios(vector="LOCAL")).B == 250


def test_mascaras_por_fila(df: pd.DataFrame) -> None:
    m = mascaras(df)
    assert bool(m.A.iloc[0]) and bool(m.B.iloc[0]) and bool(m.C.iloc[0])
    assert not m.A.iloc[-1] and not m.B.iloc[-1] and not m.C.iloc[-1]


def test_dataframe_vacio() -> None:
    vacio = pd.DataFrame(columns=["base_score", "vector_ataque", "privilegios"])
    assert contar_eventos(vacio).N == 0


def test_faltan_columnas() -> None:
    with pytest.raises(ValueError, match="privilegios"):
        contar_eventos(pd.DataFrame({"base_score": [9.5], "vector_ataque": ["NETWORK"]}))
