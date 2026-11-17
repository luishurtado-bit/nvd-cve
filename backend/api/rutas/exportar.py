from typing import Annotated, Any
import pandas as pd
from fastapi import APIRouter, Query, Response
from api import fuente
from api.esquemas import (
    BayesIn,
    BayesQuery,
    BinomialIn,
    BinomialQuery,
    CriteriosIn,
    ReglasIn,
    ReglasQuery,
)
from api.rutas.binomial import binomial
from api.rutas.probabilidad import bayes_, eventos, reglas
from stats.binomial import tabla_acumulada

router = APIRouter(prefix="/exportar", tags=["exportar"])

_RESPUESTA_CSV: dict[int | str, dict[str, Any]] = {
    200: {"content": {"text/csv": {}}, "description": "Archivo CSV (UTF-8 con BOM, para Excel)"}
}

def _csv(df: pd.DataFrame, nombre: str) -> Response:
    # El BOM hace que Excel reconozca las tildes y símbolos como ∩
    contenido = "﻿" + df.to_csv(index=False)
    return Response(
        content=contenido.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{nombre}.csv"'},
    )

def _criterios(q: CriteriosIn) -> CriteriosIn:
    return CriteriosIn(umbral=q.umbral, vector=q.vector, privilegios=q.privilegios)

def _medidas(datos: dict[str, Any]) -> pd.DataFrame:
    return pd.DataFrame({"medida": list(datos), "valor": list(datos.values())})

@router.get("/cve", response_class=Response, responses=_RESPUESTA_CSV)
def exportar_cve() -> Response:
    """CVE del espacio muestral Ω actual (ya depurados)."""
    return _csv(fuente.dataframe(), "cve")

@router.get("/eventos", response_class=Response, responses=_RESPUESTA_CSV)
def exportar_eventos(q: Annotated[CriteriosIn, Query()]) -> Response:
    """Conteo y probabilidad de A, B, C y sus intersecciones."""
    r = eventos(_criterios(q))
    descripciones = {
        "A": f"baseScore >= {q.umbral:g}",
        "B": f"vector de ataque {q.vector}",
        "C": f"privilegios {q.privilegios}",
        "AB": "A ∩ B",
        "AC": "A ∩ C",
        "BC": "B ∩ C",
        "ABC": "A ∩ B ∩ C",
    }
    filas = [
        {"evento": nombre, "descripcion": descripciones[nombre], "conteo": f.conteo, "probabilidad": f.probabilidad}
        for nombre, f in r.eventos
    ]
    return _csv(pd.DataFrame(filas), "eventos")

@router.get("/reglas", response_class=Response, responses=_RESPUESTA_CSV)
def exportar_reglas(q: Annotated[ReglasQuery, Query()]) -> Response:
    """Complemento, unión, intersección e independencia de X e Y."""
    r = reglas(ReglasIn(criterios=_criterios(q), x=q.x, y=q.y))
    return _csv(_medidas(r.model_dump()), f"reglas_{q.x}_{q.y}")

@router.get("/bayes", response_class=Response, responses=_RESPUESTA_CSV)
def exportar_bayes(q: Annotated[BayesQuery, Query()]) -> Response:
    """Probabilidad total y teorema de Bayes, paso a paso."""
    r = bayes_(BayesIn(criterios=_criterios(q), condicionante=q.condicionante, prior=q.prior))
    return _csv(_medidas(r.model_dump()), f"bayes_{q.condicionante}")

@router.get("/binomial", response_class=Response, responses=_RESPUESTA_CSV)
def exportar_binomial(q: Annotated[BinomialQuery, Query()]) -> Response:
    """Tabla de X ~ Bin(n, p): P(X = k), P(X ≤ k) y P(X ≥ k) para k = 0…n."""
    r = binomial(BinomialIn(n=q.n, k=q.k, p=q.p, criterios=_criterios(q)))
    df = pd.DataFrame(tabla_acumulada(r.n, r.p), columns=["k", "P(X=k)", "P(X<=k)", "P(X>=k)"])
    return _csv(df, f"binomial_n{r.n}")
