from dataclasses import dataclass
from datetime import date, timedelta
import pandas as pd
from fastapi import HTTPException
from api import estado, mocks
from api.esquemas import CriteriosIn, ResumenDatos
from nvd.depuracion import ResultadoDepuracion
from stats.eventos import (
    COL_PRIVILEGIOS,
    COL_PUBLICADO,
    COL_SEVERIDAD,
    COL_VECTOR,
    Conteos,
    Criterios,
    contar_eventos,
)

@dataclass(frozen=True)
class Filtros:
    """Filtros globales del dashboard; un campo vacío no filtra."""

    desde: date | None = None  # fecha de publicación (UTC), incluida
    hasta: date | None = None  # incluida
    severidad: tuple[str, ...] = ()
    vector: tuple[str, ...] = ()
    privilegios: tuple[str, ...] = ()

def dataframe() -> pd.DataFrame:
    """Ω actual: el conjunto cargado (API o CSV) o, si no hay, el simulado."""
    conjunto = estado.actual()
    return conjunto.omega if conjunto is not None else mocks.dataframe()

def resumen() -> ResumenDatos:
    conjunto = estado.actual()
    return conjunto.resumen if conjunto is not None else mocks.resumen()

def depuracion() -> ResultadoDepuracion:
    """Pasos de la limpieza del conjunto actual (o de los simulados)."""
    conjunto = estado.actual()
    return conjunto.depuracion if conjunto is not None else mocks.depuracion()

def conteos(criterios: CriteriosIn) -> Conteos:
    c = contar_eventos(dataframe(), Criterios(**criterios.model_dump()))
    if c.N == 0:
        raise HTTPException(status_code=422, detail="No hay CVE en el espacio muestral: N = 0")
    return c

def filtrar(df: pd.DataFrame, filtros: Filtros) -> pd.DataFrame:
    """Las filas de Ω que cumplen todos los filtros. Es la misma función para todos
    los indicadores y gráficos, así que con un mismo filtro todos cuentan lo mismo."""
    seleccion = pd.Series(True, index=df.index)
    publicado = pd.to_datetime(df[COL_PUBLICADO], utc=True)
    if filtros.desde is not None:
        seleccion &= publicado >= pd.Timestamp(filtros.desde, tz="UTC")
    if filtros.hasta is not None:
        seleccion &= publicado < pd.Timestamp(filtros.hasta + timedelta(days=1), tz="UTC")
    for columna, valores in (
        (COL_SEVERIDAD, filtros.severidad),
        (COL_VECTOR, filtros.vector),
        (COL_PRIVILEGIOS, filtros.privilegios),
    ):
        if valores:
            seleccion &= df[columna].isin(valores).fillna(False).astype(bool)
    return df[seleccion.to_numpy()]

def filtrado(filtros: Filtros) -> pd.DataFrame:
    return filtrar(dataframe(), filtros)
