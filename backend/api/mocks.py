from datetime import date
from functools import lru_cache

import pandas as pd

from api.esquemas import Periodo, ResumenDatos
from stats.eventos import COL_PRIVILEGIOS, COL_PUNTUACION, COL_VECTOR

# Ω del informe: N = 1000. Rechazados y sin puntuación son también hipotéticos.
N = 1000
RECHAZADOS = 50
SIN_PUNTUACION = 250

# (cantidad, baseScore, vector, cuántos con PR:N)
# Reproduce |A| = 100, |B| = 750, |A ∩ B| = 90; C se reparte para tener ejemplo.
_GRUPOS = (
    (90, 9.8, "NETWORK", 60),  # A ∩ B
    (10, 9.1, "LOCAL", 5),  # A ∩ Bᶜ
    (660, 7.5, "NETWORK", 400),  # Aᶜ ∩ B
    (240, 5.0, "LOCAL", 35),  # Aᶜ ∩ Bᶜ
)

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
    """Ω hipotético con las columnas de `stats.eventos`."""
    filas = []
    for cantidad, puntuacion, vector, sin_priv in _GRUPOS:
        for i in range(cantidad):
            filas.append(
                {
                    COL_PUNTUACION: puntuacion,
                    COL_VECTOR: vector,
                    COL_PRIVILEGIOS: "NONE" if i < sin_priv else "LOW",
                }
            )
    return pd.DataFrame(filas)
