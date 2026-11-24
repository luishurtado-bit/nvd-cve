from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.types import Scope
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

class FrontendEstatico(StaticFiles):
    """Sirve el frontend compilado. El router del navegador (BrowserRouter) maneja rutas como
    /binomial, que no son archivos: al recargar la página devuelve index.html en vez de 404.
    Un archivo con extensión que no existe (/assets/x.js) y cualquier /api/... siguen dando 404."""

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as e:
            # En Windows la ruta llega con "\\" en vez de "/"
            ruta = path.replace("\\", "/")
            es_ruta_del_front = ruta != "api" and not ruta.startswith("api/") and "." not in ruta.rsplit("/", 1)[-1]
            if e.status_code == 404 and es_ruta_del_front:
                return await super().get_response("index.html", scope)
            raise

def montar_frontend(aplicacion: FastAPI, dist: Path) -> bool:
    """Sirve `dist` (el resultado de `npm run build`) en la raíz. False si no existe."""
    if not dist.is_dir():
        return False
    aplicacion.mount("/", FrontendEstatico(directory=dist, html=True), name="frontend")
    return True

# Resultado de `npm run build` en frontend/; en la imagen de Docker se copia a la misma ruta
DIST_FRONTEND = Path(__file__).resolve().parents[2] / "frontend" / "dist"
montar_frontend(app, DIST_FRONTEND)
