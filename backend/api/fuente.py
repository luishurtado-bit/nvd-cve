import pandas as pd
from fastapi import HTTPException

from api import mocks
from api.esquemas import CriteriosIn
from stats.eventos import Conteos, Criterios, contar_eventos

def dataframe() -> pd.DataFrame:
    """Ω actual. B7: cambiar por el DataFrame cargado desde la NVD o el CSV."""
    return mocks.dataframe()

def conteos(criterios: CriteriosIn) -> Conteos:
    c = contar_eventos(dataframe(), Criterios(**criterios.model_dump()))
    if c.N == 0:
        raise HTTPException(status_code=422, detail="No hay CVE cargados: N = 0")
    return c
