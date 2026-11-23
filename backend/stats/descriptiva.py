from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from typing import Literal
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

Agrupacion = Literal["dia", "semana", "mes"]

@dataclass(frozen=True)
class ResumenNumerico:
    n: int
    media: float | None
    mediana: float | None
    desviacion: float | None  # muestral (n − 1); None si n < 2
    minimo: float | None = None
    q1: float | None = None
    q3: float | None = None
    maximo: float | None = None
    asimetria: float | None = None  # coeficiente de Fisher-Pearson ajustado; None si n < 3

@dataclass(frozen=True)
class PuntoTemporal:
    fecha: date  # primer día del día, la semana (lunes) o el mes
    conteo: int
    criticos: int

@dataclass(frozen=True)
class GrupoCritico:
    grupo: str
    total: int
    criticos: int
    proporcion: float  # criticos / total

@dataclass(frozen=True)
class FilaCruce:
    categoria: str
    total: int
    conteos: dict[str, int]  # columna → conteo, en el orden de las columnas

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

def resumen_numerico(serie: pd.Series) -> ResumenNumerico:
    """Medidas de tendencia, dispersión, posición y forma de una variable numérica."""
    valores = pd.to_numeric(serie, errors="coerce").dropna().astype("float64")
    n = len(valores)
    if n == 0:
        return ResumenNumerico(n=0, media=None, mediana=None, desviacion=None)
    asimetria = float(valores.skew()) if n > 2 else None
    return ResumenNumerico(
        n=n,
        media=float(valores.mean()),
        mediana=float(valores.median()),
        desviacion=float(valores.std(ddof=1)) if n > 1 else None,
        minimo=float(valores.min()),
        q1=float(valores.quantile(0.25)),
        q3=float(valores.quantile(0.75)),
        maximo=float(valores.max()),
        # Todos iguales: la asimetría no está definida (pandas da 0 o NaN)
        asimetria=asimetria if asimetria is not None and np.isfinite(asimetria) and valores.nunique() > 1 else None,
    )

def serie_temporal(fechas: pd.Series, criticos: pd.Series, agrupar: Agrupacion = "dia") -> list[PuntoTemporal]:
    """CVE y críticos por día, semana (de lunes a domingo) o mes, incluidos los
    periodos sin publicaciones dentro del rango. La primera y la última semana
    o mes pueden estar incompletas si el periodo no empieza o termina en su borde."""
    validas = fechas.notna()
    if not validas.any():
        return []
    dias = pd.to_datetime(fechas[validas], utc=True, format="ISO8601").dt.tz_localize(None).dt.normalize()
    if agrupar == "semana":
        inicio = dias - pd.to_timedelta(dias.dt.day_of_week, unit="D")
        frecuencia = "W-MON"
    elif agrupar == "mes":
        inicio = dias.dt.to_period("M").dt.start_time
        frecuencia = "MS"
    else:
        inicio, frecuencia = dias, "D"
    tabla = pd.DataFrame({"inicio": inicio, "critico": criticos[validas].fillna(False).astype(bool)})
    grupos = tabla.groupby("inicio")["critico"].agg(["size", "sum"])
    rango = pd.date_range(grupos.index.min(), grupos.index.max(), freq=frecuencia)
    grupos = grupos.reindex(rango, fill_value=0)
    return [PuntoTemporal(f.date(), int(fila["size"]), int(fila["sum"])) for f, fila in grupos.iterrows()]

def critico_por(grupos: pd.Series, criticos: pd.Series, top: int | None = None) -> list[GrupoCritico]:
    """Proporción de críticos dentro de cada grupo, de más a menos CVE.
    Las filas sin dato en el grupo no se cuentan."""
    tabla = pd.DataFrame({"grupo": grupos, "critico": criticos.fillna(False).astype(bool)}).dropna(subset=["grupo"])
    conteos = tabla.groupby("grupo")["critico"].agg(["size", "sum"])
    orden = sorted(conteos.index, key=lambda g: (-conteos.loc[g, "size"], str(g)))
    if top is not None:
        orden = orden[:top]
    return [
        GrupoCritico(str(g), int(conteos.loc[g, "size"]), int(conteos.loc[g, "sum"]),
                     int(conteos.loc[g, "sum"]) / int(conteos.loc[g, "size"]))
        for g in orden
    ]

def _ordenar(presentes: pd.Index, totales: pd.Series, orden: Sequence[str] | None) -> list[str]:
    """Las categorías presentes en el orden dado (las demás al final) o de más a menos frecuente."""
    if orden is not None:
        return [c for c in orden if c in presentes] + sorted(str(c) for c in presentes if c not in orden)
    return sorted(presentes, key=lambda c: (-totales[c], str(c)))

def tabla_cruzada(
    filas: pd.Series,
    columnas: pd.Series,
    orden_filas: Sequence[str] | None = None,
    orden_columnas: Sequence[str] | None = None,
) -> tuple[list[str], list[FilaCruce]]:
    """Conteos de filas × columnas (sin las filas con algún dato faltante).
    Devuelve las columnas que aparecen y una fila por categoría que aparece,
    en el orden dado o, si no hay, de más a menos frecuente."""
    tabla = pd.crosstab(filas, columnas)
    cols = _ordenar(tabla.columns, tabla.sum(axis=0), orden_columnas)
    fils = _ordenar(tabla.index, tabla.sum(axis=1), orden_filas)
    return cols, [
        FilaCruce(str(f), int(tabla.loc[f].sum()), {str(c): int(tabla.loc[f, c]) for c in cols}) for f in fils
    ]

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
