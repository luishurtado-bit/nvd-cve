from typing import Annotated, Any
import pandas as pd
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse
from api import estado, fuente, mocks, registro
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
from nvd import almacen
from stats.binomial import tabla_acumulada
from stats.eventos import COL_PUNTUACION

router = APIRouter(prefix="/exportar", tags=["exportar"])

_RESPUESTA_CSV: dict[int | str, dict[str, Any]] = {
    200: {"content": {"text/csv": {}}, "description": "Archivo CSV (UTF-8 con BOM, para Excel)"}
}
_RESPUESTA_CRUDO: dict[int | str, dict[str, Any]] = {
    200: {
        "content": {"application/gzip": {}, "text/csv": {}},
        "description": "JSON de la NVD comprimido (.json.gz) o, si no lo hay, el CSV sin depurar",
    },
    404: {"description": "El conjunto cargado no tiene archivo guardado"},
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
def exportar_cve(umbral: float = Query(9.0, ge=0, le=10)) -> Response:
    """Base limpia: los CVE de Ω (20 variables) y `critico` (baseScore ≥ umbral)."""
    df = fuente.dataframe().copy()
    df["critico"] = df[COL_PUNTUACION] >= umbral
    registro.registrar("exportar_cve", {"umbral": umbral}, {"filas": len(df)})
    return _csv(df, "cve")

@router.get("/crudo", response_class=Response, responses=_RESPUESTA_CRUDO)
def exportar_crudo() -> Response:
    """Base original, sin depurar. De una descarga, el JSON de la NVD tal cual llegó
    (comprimido); de un CSV subido, ese CSV; de los simulados, su versión sin depurar."""
    conjunto = estado.actual()
    if conjunto is None:
        registro.registrar("exportar_crudo", {}, {"archivo": "crudo_simulado.csv"})
        return _csv(mocks.crudo(), "crudo_simulado")
    if conjunto.ruta is None or not conjunto.ruta.is_file():
        raise HTTPException(status_code=404, detail="El conjunto cargado no tiene archivo guardado")
    gz = almacen.ruta_crudo(conjunto.ruta)
    archivo = gz if gz.is_file() else conjunto.ruta
    registro.registrar("exportar_crudo", {}, {"archivo": archivo.name})
    tipo = "application/gzip" if archivo is gz else "text/csv; charset=utf-8"
    return FileResponse(archivo, media_type=tipo, filename=archivo.name)

@router.get("/calidad", response_class=Response, responses=_RESPUESTA_CSV)
def exportar_calidad() -> Response:
    """Pasos de la limpieza (4.1 a 4.7) con lo eliminado y su justificación."""
    pasos = fuente.depuracion().pasos
    registro.registrar("exportar_calidad", {}, {"pasos": len(pasos)})
    return _csv(pd.DataFrame([vars(p) for p in pasos]), "calidad")

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
