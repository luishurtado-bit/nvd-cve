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

@dataclass(frozen=True)
class Atipicos:
    """Valores fuera de [Q1 − k·IQR, Q3 + k·IQR]. Se marcan, no se eliminan."""

    q1: float | None
    q3: float | None
    limite_inferior: float | None
    limite_superior: float | None
    cantidad: int
    marcados: pd.Series  # máscara booleana con el índice de la serie original

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
    # Acepta fechas ya convertidas y texto ISO8601 (la NVD manda fechas con y sin
    # milisegundos). Todo se lee como UTC, que es la zona de la NVD
    sin_nulos = fechas.dropna()
    if sin_nulos.empty:
        return []
    if not pd.api.types.is_datetime64_any_dtype(sin_nulos):
        sin_nulos = sin_nulos.astype(str)
    dias = pd.to_datetime(sin_nulos, utc=True, format="ISO8601").dt.tz_localize(None).dt.normalize()
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

def atipicos_iqr(serie: pd.Series, k: float = 1.5) -> Atipicos:
    """Atípicos por el método IQR: fuera de [Q1 − k·IQR, Q3 + k·IQR].

    Con menos de 4 datos no hay cuartiles fiables y no se marca nada. Los atípicos
    de CVE (por ejemplo, muchas referencias) son datos reales: se marcan para
    informarlos, no se quitan, porque eliminarlos sesgaría las proporciones.
    """
    valores = pd.to_numeric(serie, errors="coerce")
    sin_marcar = pd.Series(False, index=serie.index)
    if valores.notna().sum() < 4:
        return Atipicos(None, None, None, None, 0, sin_marcar)
    q1, q3 = float(valores.quantile(0.25)), float(valores.quantile(0.75))
    iqr = q3 - q1
    inferior, superior = q1 - k * iqr, q3 + k * iqr
    marcados = valores.notna() & ((valores < inferior) | (valores > superior))
    return Atipicos(q1, q3, inferior, superior, int(marcados.sum()), marcados)
