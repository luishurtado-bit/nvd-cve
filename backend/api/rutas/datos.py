from fastapi import APIRouter, HTTPException, UploadFile

from api import mocks
from api.esquemas import CargarIn, ResumenDatos

router = APIRouter(prefix="/datos", tags=["datos"])


@router.post("/cargar", response_model=ResumenDatos)
def cargar(datos: CargarIn) -> ResumenDatos:
    """Descarga los CVE del periodo desde la API de la NVD (simulado)."""
    return mocks.resumen(datos.inicio, datos.fin)


@router.post("/archivo", response_model=ResumenDatos)
def cargar_archivo(archivo: UploadFile) -> ResumenDatos:
    """Carga los CVE desde un archivo CSV subido (simulado)."""
    if not (archivo.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser CSV (.csv)")
    return mocks.resumen()


@router.get("/resumen", response_model=ResumenDatos)
def resumen() -> ResumenDatos:
    """Resumen del conjunto de datos cargado (simulado)."""
    return mocks.resumen()
