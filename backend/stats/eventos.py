from dataclasses import dataclass

import pandas as pd

# Columnas del DataFrame depurado (las produce la depuración, B5)
COL_ID = "cve_id"
COL_PUBLICADO = "publicado"
COL_PUNTUACION = "base_score"
COL_SEVERIDAD = "severidad"
COL_VECTOR = "vector_ataque"
COL_PRIVILEGIOS = "privilegios"
COL_CWE = "cwe"

COLUMNAS_EVENTOS = (COL_PUNTUACION, COL_VECTOR, COL_PRIVILEGIOS)


@dataclass(frozen=True)
class Criterios:
    """Criterios de los eventos (Tabla I del informe)."""

    umbral: float = 9.0  # A: baseScore ≥ umbral
    vector: str = "NETWORK"  # B: vector de ataque (AV:N)
    privilegios: str = "NONE"  # C: privilegios requeridos (PR:N)


@dataclass(frozen=True)
class Conteos:
    """Tamaño de Ω y de cada evento e intersección."""

    N: int
    A: int
    B: int
    C: int
    AB: int
    AC: int
    BC: int
    ABC: int


@dataclass(frozen=True)
class Mascaras:
    """Qué filas del DataFrame pertenecen a cada evento."""

    A: pd.Series
    B: pd.Series
    C: pd.Series


def mascaras(df: pd.DataFrame, criterios: Criterios = Criterios()) -> Mascaras:
    faltantes = [c for c in COLUMNAS_EVENTOS if c not in df.columns]
    if faltantes:
        raise ValueError(f"faltan columnas en el DataFrame: {faltantes}")
    return Mascaras(
        A=df[COL_PUNTUACION] >= criterios.umbral,
        B=df[COL_VECTOR] == criterios.vector,
        C=df[COL_PRIVILEGIOS] == criterios.privilegios,
    )


def contar_eventos(df: pd.DataFrame, criterios: Criterios = Criterios()) -> Conteos:
    m = mascaras(df, criterios)
    return Conteos(
        N=len(df),
        A=int(m.A.sum()),
        B=int(m.B.sum()),
        C=int(m.C.sum()),
        AB=int((m.A & m.B).sum()),
        AC=int((m.A & m.C).sum()),
        BC=int((m.B & m.C).sum()),
        ABC=int((m.A & m.B & m.C).sum()),
    )
