from fastapi import APIRouter, Query
from api import registro
from api.esquemas import Ejecucion

router = APIRouter(tags=["ejecuciones"])

@router.get("/ejecuciones", response_model=list[Ejecucion])
def ejecuciones(limite: int = Query(50, ge=1, le=500)) -> list[Ejecucion]:
    """Últimos cálculos y cargas, con sus parámetros y los datos usados (más reciente primero)."""
    return registro.leer(limite)
