from pathlib import Path
from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles
from api.esquemas import Salud
from api.rutas import binomial, datos, probabilidad

app = FastAPI(title="NVD/CVE - Probabilidad")
router = APIRouter(prefix="/api")

@router.get("/salud", response_model=Salud)
def salud() -> Salud:
    return Salud(estado="ok")

router.include_router(datos.router)
router.include_router(probabilidad.router)
router.include_router(binomial.router)
app.include_router(router)

# Sirve el frontend compilado si existe
_dist = Path(__file__).resolve().parents[2] / "frontend_dist"

if _dist.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=_dist, html=True),
        name="frontend"
    )
