from typing import Annotated
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
import config
from api import descargas, estado, fuente, registro
from api.esquemas import CargarIn, DescargaOut, ResumenDatos
from nvd import almacen
from nvd.cliente import ClienteNVD, ErrorNVD
from nvd.descargar import descargar_periodo
from stats.eventos import COL_PUBLICADO

router = APIRouter(prefix="/datos", tags=["datos"])

# Menos reintentos que el script: la petición HTTP no debe quedar colgada minutos
REINTENTOS_EN_API = 3
# /datos/cargar espera a que termine la descarga; más allá de esto, usar /datos/descargas
MAX_DIAS_CARGA_DIRECTA = 366

def obtener_cliente() -> ClienteNVD:
    return ClienteNVD(api_key=config.nvd_api_key(), max_reintentos=REINTENTOS_EN_API)

def _periodo(datos: CargarIn) -> dict[str, str]:
    return {"inicio": datos.inicio.isoformat(), "fin": datos.fin.isoformat()}

@router.post("/cargar", response_model=ResumenDatos)
def cargar(datos: CargarIn, cliente: Annotated[ClienteNVD, Depends(obtener_cliente)]) -> ResumenDatos:
    """Descarga de la API de la NVD los CVE publicados en el periodo, los guarda en
    data/ y los deja como conjunto actual. Responde al terminar; para periodos
    largos conviene POST /datos/descargas o el script `python -m nvd.descargar`."""
    dias = (datos.fin - datos.inicio).days + 1
    if dias > MAX_DIAS_CARGA_DIRECTA:
        raise HTTPException(
            status_code=422,
            detail=f"El periodo tiene {dias} días; para más de {MAX_DIAS_CARGA_DIRECTA} "
            "usa la descarga en segundo plano (POST /api/datos/descargas)",
        )
    try:
        crudo = descargar_periodo(datos.inicio, datos.fin, cliente)
    except ErrorNVD as e:
        raise HTTPException(status_code=502, detail=f"La NVD no respondió bien: {e}") from e
    almacen.guardar(crudo, datos.inicio, datos.fin, "api")
    resumen = estado.establecer(crudo, datos.inicio, datos.fin, "api").resumen
    registro.registrar("cargar", _periodo(datos), resumen.model_dump(mode="json"))
    return resumen

@router.post("/descargas", response_model=DescargaOut, status_code=status.HTTP_202_ACCEPTED)
def iniciar_descarga(datos: CargarIn, cliente: Annotated[ClienteNVD, Depends(obtener_cliente)]) -> DescargaOut:
    """Lanza la descarga en segundo plano y responde enseguida con su `id`.
    El progreso se consulta con GET /datos/descargas/{id}. Solo una a la vez."""
    try:
        return descargas.iniciar(datos.inicio, datos.fin, cliente)
    except descargas.DescargaEnCurso as e:
        raise HTTPException(status_code=409, detail=str(e)) from e

@router.get("/descargas/{id_}", response_model=DescargaOut)
def consultar_descarga(id_: str) -> DescargaOut:
    """Progreso de una descarga: estado, tramo, CVE descargados y, al terminar, el resumen."""
    d = descargas.consultar(id_)
    if d is None:
        raise HTTPException(status_code=404, detail="No existe esa descarga")
    return d

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
    resumen = estado.establecer(crudo, inicio, fin, "csv").resumen
    registro.registrar("archivo", {"nombre": archivo.filename}, resumen.model_dump(mode="json"))
    return resumen

@router.get("/resumen", response_model=ResumenDatos)
def resumen() -> ResumenDatos:
    """Resumen del conjunto actual (origen = "simulado" si no se ha cargado ninguno)."""
    return fuente.resumen()
