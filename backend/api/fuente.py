import pandas as pd
from fastapi import HTTPException
from api import estado, mocks
from api.esquemas import CriteriosIn, ResumenDatos
from nvd.depuracion import ResultadoDepuracion
from stats.eventos import Conteos, Criterios, contar_eventos

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
