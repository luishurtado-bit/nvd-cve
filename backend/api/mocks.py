from datetime import date, timedelta
from functools import lru_cache

import numpy as np
import pandas as pd

from api.esquemas import Periodo, ResumenDatos
from stats.eventos import (
    COL_CWE,
    COL_ID,
    COL_PRIVILEGIOS,
    COL_PUBLICADO,
    COL_PUNTUACION,
    COL_SEVERIDAD,
    COL_VECTOR,
)

# Ω del informe: N = 1000. Rechazados y sin puntuación son también hipotéticos.
N = 1000
RECHAZADOS = 50
SIN_PUNTUACION = 250

# (cantidad, baseScore mínimo y máximo, vector, cuántos con PR:N)
# Reproduce |A| = 100, |B| = 750, |A ∩ B| = 90; C se reparte para tener ejemplo.
# Los rangos de baseScore no se cruzan con 7,0 ni con 9,0, así que los conteos
# no cambian aunque las puntuaciones varíen dentro de cada grupo.
_GRUPOS = (
    (90, 9.0, 9.9, "NETWORK", 60),  # A ∩ B
    (10, 9.0, 9.9, "LOCAL", 5),  # A ∩ Bᶜ
    (660, 7.0, 8.9, "NETWORK", 400),  # Aᶜ ∩ B
    (240, 0.1, 6.9, "LOCAL", 35),  # Aᶜ ∩ Bᶜ
)

# Periodo hipotético para las fechas de publicación del dashboard
_INICIO = date(2026, 1, 1)
_DIAS = 90

_CWE = ("CWE-79", "CWE-787", "CWE-89", "CWE-20", "CWE-125", "CWE-22", "CWE-416", "NVD-CWE-noinfo")
_PESOS_CWE = (0.25, 0.15, 0.12, 0.12, 0.1, 0.1, 0.08, 0.08)

def _severidad(puntuacion: float) -> str:
    """Escala cualitativa de CVSS v3.1."""
    if puntuacion == 0:
        return "NONE"
    if puntuacion < 4:
        return "LOW"
    if puntuacion < 7:
        return "MEDIUM"
    if puntuacion < 9:
        return "HIGH"
    return "CRITICAL"

def resumen(inicio: date | None = None, fin: date | None = None) -> ResumenDatos:
    return ResumenDatos(
        periodo=Periodo(inicio=inicio, fin=fin),
        descargados=N + RECHAZADOS + SIN_PUNTUACION,
        rechazados=RECHAZADOS,
        sin_puntuacion=SIN_PUNTUACION,
        N=N,
    )

@lru_cache(maxsize=1)
def dataframe() -> pd.DataFrame:
    """Ω hipotético con las columnas de `stats.eventos` (semilla fija)."""
    rng = np.random.default_rng(2026)
    filas = []
    for cantidad, minimo, maximo, vector, sin_priv in _GRUPOS:
        # Puntuaciones en décimas dentro de [minimo, maximo]
        decimas = rng.integers(round(minimo * 10), round(maximo * 10) + 1, size=cantidad)
        for i, d in enumerate(decimas):
            puntuacion = float(d) / 10
            filas.append(
                {
                    COL_PUNTUACION: puntuacion,
                    COL_SEVERIDAD: _severidad(puntuacion),
                    COL_VECTOR: vector,
                    COL_PRIVILEGIOS: "NONE" if i < sin_priv else "LOW",
                }
            )
    df = pd.DataFrame(filas)
    df[COL_ID] = [f"CVE-2026-{i:05d}" for i in range(1, len(df) + 1)]
    df[COL_PUBLICADO] = [
        _INICIO + timedelta(days=int(d)) for d in rng.integers(0, _DIAS, size=len(df))
    ]
    df[COL_CWE] = rng.choice(_CWE, size=len(df), p=_PESOS_CWE)
    return df
