from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from stats.binomial import prob_al_menos


app = FastAPI(title="NVD/CVE - Probabilidad")
router = APIRouter(prefix="/api")


class BinomialIn(BaseModel):
    n: int = Field(gt=0)
    p: float = Field(ge=0, le=1)
    k: int = Field(ge=0)


class BinomialOut(BaseModel):
    prob_al_menos_k: float


@router.get("/salud")
def salud() -> dict[str, str]:
    return {"estado": "ok"}


@router.post("/binomial", response_model=BinomialOut)
def binomial(datos: BinomialIn) -> BinomialOut:
    return BinomialOut(
        prob_al_menos_k=prob_al_menos(
            datos.n, datos.p, datos.k
        )
    )


app.include_router(router)


# Sirve el frontend compilado si existe
_dist = Path(__file__).resolve().parents[2] / "frontend_dist"

if _dist.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=_dist, html=True),
        name="frontend"
    )