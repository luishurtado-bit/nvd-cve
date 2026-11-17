from dataclasses import dataclass
import pandas as pd
from nvd.extraccion import COL_ESTADO, COLUMNAS
from stats.eventos import COL_ID, COL_PUNTUACION

ESTADO_RECHAZADO = "Rejected"

@dataclass(frozen=True)
class ConteoDepuracion:
    descargados: int  # CVE distintos descargados
    rechazados: int  # estado Rejected
    sin_puntuacion: int  # no rechazados y sin puntuación CVSS
    N: int  # tamaño de Ω

def depurar(df: pd.DataFrame) -> tuple[pd.DataFrame, ConteoDepuracion]:
    """Ω = CVE no rechazados y con puntuación (RF2). Devuelve Ω y los conteos."""
    faltantes = [c for c in COLUMNAS if c not in df.columns]
    if faltantes:
        raise ValueError(f"faltan columnas: {faltantes}")
    # Un CVE repetido (por ejemplo, entre páginas) cuenta una sola vez
    df = df.drop_duplicates(subset=COL_ID, keep="last")
    rechazado = df[COL_ESTADO].eq(ESTADO_RECHAZADO).fillna(False).astype(bool)
    sin_puntuacion = ~rechazado & df[COL_PUNTUACION].isna()
    omega = df[~rechazado & ~sin_puntuacion].reset_index(drop=True)
    return omega, ConteoDepuracion(
        descargados=len(df),
        rechazados=int(rechazado.sum()),
        sin_puntuacion=int(sin_puntuacion.sum()),
        N=len(omega),
    )
