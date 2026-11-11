from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles

from api.esquemas import BinomialIn, BinomialOut, Salud
from api.rutas import datos
from stats.binomial import prob_al_menos


app = FastAPI(title="NVD/CVE - Probabilidad")
router = APIRouter(prefix="/api")


@router.get("/salud", response_model=Salud)
def salud() -> Salud:
    return Salud(estado="ok")


@router.post("/binomial", response_model=BinomialOut)
def binomial(datos: BinomialIn) -> BinomialOut:
    return BinomialOut(
        prob_al_menos_k=prob_al_menos(
            datos.n, datos.p, datos.k
        )
    )


router.include_router(datos.router)
app.include_router(router)


# Sirve el frontend compilado si existe
_dist = Path(__file__).resolve().parents[2] / "frontend_dist"

if _dist.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=_dist, html=True),
        name="frontend"
    )
