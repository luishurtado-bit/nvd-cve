from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles
from api import estado
from api.errores import registrar_manejadores
from api.esquemas import Salud
from api.rutas import binomial, dashboard, datos, ejecuciones, exportar, probabilidad

@asynccontextmanager
async def ciclo_de_vida(_: FastAPI) -> AsyncIterator[None]:
    # Al arrancar, retoma el último conjunto guardado en data/ (si hay)
    estado.cargar_ultimo()
    yield

app = FastAPI(title="NVD/CVE - Probabilidad", lifespan=ciclo_de_vida)
registrar_manejadores(app)
router = APIRouter(prefix="/api")

@router.get("/salud", response_model=Salud)
def salud() -> Salud:
    return Salud(estado="ok")

router.include_router(datos.router)
router.include_router(probabilidad.router)
router.include_router(binomial.router)
router.include_router(dashboard.router)
router.include_router(exportar.router)
router.include_router(ejecuciones.router)
app.include_router(router)

# Sirve el frontend compilado si existe
_dist = Path(__file__).resolve().parents[2] / "frontend_dist"

if _dist.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=_dist, html=True),
        name="frontend"
    )
