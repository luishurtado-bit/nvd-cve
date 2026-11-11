from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
import numpy as np
import pandas as pd

@dataclass(frozen=True)
class Categoria:
    categoria: str
    conteo: int
    proporcion: float

@dataclass(frozen=True)
class Intervalo:
    desde: float
    hasta: float
    conteo: int

@dataclass(frozen=True)
class ResumenNumerico:
    n: int
    media: float | None
    mediana: float | None
    desviacion: float | None  # muestral (n − 1); None si n < 2

def distribucion(
    serie: pd.Series, orden: Sequence[str] | None = None, top: int | None = None
) -> list[Categoria]:
    """Frecuencia de cada categoría.

    Con `orden`, las categorías salen en ese orden (incluidas las de conteo 0)
    y las que no estén en él van al final; sin `orden`, de mayor a menor.
    """
    conteos = serie.dropna().value_counts()
    total = int(conteos.sum())
    if orden is not None:
        claves = list(orden) + sorted(c for c in conteos.index if c not in orden)
    else:
        claves = sorted(conteos.index, key=lambda c: (-conteos[c], c))
    if top is not None:
        claves = claves[:top]
    return [
        Categoria(
            categoria=str(c),
            conteo=int(conteos.get(c, 0)),
            proporcion=int(conteos.get(c, 0)) / total if total else 0.0,
        )
        for c in claves
    ]

def serie_diaria(fechas: pd.Series) -> list[tuple[date, int]]:
    """CVE por día, incluidos los días sin publicaciones dentro del rango."""
    dias = pd.to_datetime(fechas.dropna()).dt.normalize()
    if dias.empty:
        return []
    conteos = dias.value_counts().sort_index()
    rango = pd.date_range(conteos.index.min(), conteos.index.max(), freq="D")
    conteos = conteos.reindex(rango, fill_value=0)
    return [(dia.date(), int(v)) for dia, v in conteos.items()]

def histograma(
    puntuaciones: pd.Series, bins: int = 10, rango: tuple[float, float] = (0.0, 10.0)
) -> list[Intervalo]:
    """Intervalos de igual ancho sobre la escala CVSS; el último incluye el 10."""
    if bins < 1:
        raise ValueError("bins debe ser al menos 1")
    conteos, bordes = np.histogram(puntuaciones.dropna(), bins=bins, range=rango)
    return [
        Intervalo(desde=float(bordes[i]), hasta=float(bordes[i + 1]), conteo=int(c))
        for i, c in enumerate(conteos)
    ]

def resumen_numerico(puntuaciones: pd.Series) -> ResumenNumerico:
    valores = puntuaciones.dropna()
    n = len(valores)
    if n == 0:
        return ResumenNumerico(n=0, media=None, mediana=None, desviacion=None)
    return ResumenNumerico(
        n=n,
        media=float(valores.mean()),
        mediana=float(valores.median()),
        desviacion=float(valores.std(ddof=1)) if n > 1 else None,
    )
