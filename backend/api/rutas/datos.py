from typing import Annotated
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile
import config
from api import estado, fuente
from api.esquemas import CargarIn, ResumenDatos
from nvd import almacen
from nvd.cliente import ClienteNVD, ErrorNVD
from nvd.descargar import descargar_periodo
from stats.eventos import COL_PUBLICADO

router = APIRouter(prefix="/datos", tags=["datos"])

# Menos reintentos que el script: la petición HTTP no debe quedar colgada minutos
REINTENTOS_EN_API = 3

def obtener_cliente() -> ClienteNVD:
    return ClienteNVD(api_key=config.nvd_api_key(), max_reintentos=REINTENTOS_EN_API)

@router.post("/cargar", response_model=ResumenDatos)
def cargar(datos: CargarIn, cliente: Annotated[ClienteNVD, Depends(obtener_cliente)]) -> ResumenDatos:
    """Descarga de la API de la NVD los CVE publicados en el periodo, los guarda en
    data/ y los deja como conjunto actual. Para periodos largos conviene el script
    `python -m nvd.descargar`."""
    try:
        crudo = descargar_periodo(datos.inicio, datos.fin, cliente)
    except ErrorNVD as e:
        raise HTTPException(status_code=502, detail=f"La NVD no respondió bien: {e}") from e
    almacen.guardar(crudo, datos.inicio, datos.fin, "api")
    return estado.establecer(crudo, datos.inicio, datos.fin, "api").resumen

@router.post("/archivo", response_model=ResumenDatos)
def cargar_archivo(archivo: UploadFile) -> ResumenDatos:
    """Carga los CVE desde un CSV con las columnas del formato guardado (ver README)."""
    if not (archivo.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser CSV (.csv)")
    try:
        crudo = almacen.leer_csv(archivo.file.read())
    except almacen.ErrorCSV as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    # El periodo se deduce de las fechas de publicación
    fechas = pd.to_datetime(crudo[COL_PUBLICADO], errors="coerce", format="ISO8601").dropna()
    inicio = fechas.min().date() if not fechas.empty else None
    fin = fechas.max().date() if not fechas.empty else None
    almacen.guardar(crudo, inicio, fin, "csv")
    return estado.establecer(crudo, inicio, fin, "csv").resumen

@router.get("/resumen", response_model=ResumenDatos)
def resumen() -> ResumenDatos:
    """Resumen del conjunto actual (origen = "simulado" si no se ha cargado ninguno)."""
    return fuente.resumen()
