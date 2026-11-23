from datetime import date, timedelta
from functools import lru_cache

import numpy as np
import pandas as pd

from api.esquemas import Periodo, ResumenDatos
from nvd.extraccion import severidad_cvss
from nvd.extraccion import (
    COL_COMPLEJIDAD,
    COL_ESTADO,
    COL_EXPLOTABILIDAD,
    COL_FUENTE,
    COL_IMPACTO,
    COL_IMPACTO_C,
    COL_IMPACTO_D,
    COL_IMPACTO_I,
    COL_INTERACCION,
    COL_KEV,
    COL_MODIFICADO,
    COL_REFERENCIAS,
    COL_VERSION,
    COLUMNAS,
)
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

_FUENTES = ("nvd@nist.gov", "security-advisories@github.com", "cve@mitre.org", "psirt@ejemplo.com", "cna@ejemplo.org")
_PESOS_FUENTES = (0.4, 0.25, 0.15, 0.12, 0.08)

_CWE = ("CWE-79", "CWE-787", "CWE-89", "CWE-20", "CWE-125", "CWE-22", "CWE-416", "NVD-CWE-noinfo")
_PESOS_CWE = (0.25, 0.15, 0.12, 0.12, 0.1, 0.1, 0.08, 0.08)

def resumen(inicio: date | None = None, fin: date | None = None) -> ResumenDatos:
    return ResumenDatos(
        periodo=Periodo(inicio=inicio, fin=fin),
        descargados=N + RECHAZADOS + SIN_PUNTUACION,
        rechazados=RECHAZADOS,
        sin_puntuacion=SIN_PUNTUACION,
        N=N,
        origen="simulado",
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
                    COL_SEVERIDAD: severidad_cvss(puntuacion),
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
    # Las variables restantes se generan al final para no alterar las anteriores
    n = len(df)
    df[COL_PUBLICADO] = pd.to_datetime(df[COL_PUBLICADO]).dt.tz_localize("UTC") + pd.to_timedelta(
        rng.integers(0, 86_400, size=n), unit="s"
    )
    df[COL_ESTADO] = "Analyzed"
    df[COL_VERSION] = "3.1"
    df[COL_COMPLEJIDAD] = rng.choice(["LOW", "HIGH"], size=n, p=[0.8, 0.2])
    df[COL_INTERACCION] = rng.choice(["NONE", "REQUIRED"], size=n, p=[0.7, 0.3])
    for col in (COL_IMPACTO_C, COL_IMPACTO_I, COL_IMPACTO_D):
        df[col] = rng.choice(["NONE", "LOW", "HIGH"], size=n, p=[0.15, 0.3, 0.55])
    df[COL_EXPLOTABILIDAD] = np.round(rng.uniform(0.1, 3.9, size=n), 1)
    df[COL_IMPACTO] = np.round(rng.uniform(0.0, 6.0, size=n), 1)
    df[COL_FUENTE] = rng.choice(_FUENTES, size=n, p=_PESOS_FUENTES)
    df[COL_REFERENCIAS] = pd.array(rng.negative_binomial(2, 0.3, size=n), dtype="Int64")
    df[COL_KEV] = pd.array(rng.random(size=n) < 0.01, dtype="boolean")
    df[COL_MODIFICADO] = df[COL_PUBLICADO] + pd.to_timedelta(rng.integers(0, 10 * 86_400, size=n), unit="s")
    return df.loc[:, list(COLUMNAS)]
