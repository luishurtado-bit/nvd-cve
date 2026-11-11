from fastapi import APIRouter, Query
from api import fuente
from api.esquemas import (
    ConteoCategoria,
    DistribucionOut,
    HistogramaOut,
    IntervaloHistograma,
    PuntoSerie,
    SerieDiariaOut,
)
from stats.descriptiva import (
    Categoria,
    distribucion,
    histograma as calcular_histograma,
    resumen_numerico,
    serie_diaria as calcular_serie_diaria,
)
from stats.eventos import COL_CWE, COL_PUBLICADO, COL_PUNTUACION, COL_SEVERIDAD, COL_VECTOR

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ORDEN_SEVERIDAD = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE")

def _distribucion(categorias: list[Categoria]) -> DistribucionOut:
    return DistribucionOut(
        total=sum(c.conteo for c in categorias),
        categorias=[
            ConteoCategoria(categoria=c.categoria, conteo=c.conteo, proporcion=c.proporcion)
            for c in categorias
        ],
    )

@router.get("/severidad", response_model=DistribucionOut)
def severidad() -> DistribucionOut:
    """Conteo por severidad, de CRITICAL a NONE."""
    df = fuente.dataframe()
    return _distribucion(distribucion(df[COL_SEVERIDAD], orden=ORDEN_SEVERIDAD))

@router.get("/vector-ataque", response_model=DistribucionOut)
def vector_ataque() -> DistribucionOut:
    """Conteo por vector de ataque, de mayor a menor."""
    return _distribucion(distribucion(fuente.dataframe()[COL_VECTOR]))

@router.get("/serie-diaria", response_model=SerieDiariaOut)
def serie_diaria() -> SerieDiariaOut:
    """CVE publicados por día."""
    puntos = calcular_serie_diaria(fuente.dataframe()[COL_PUBLICADO])
    return SerieDiariaOut(
        total=sum(c for _, c in puntos),
        puntos=[PuntoSerie(fecha=f, conteo=c) for f, c in puntos],
    )

@router.get("/histograma", response_model=HistogramaOut)
def histograma(bins: int = Query(10, ge=1, le=50)) -> HistogramaOut:
    """Histograma de baseScore en [0, 10] con media, mediana y desviación."""
    puntuaciones = fuente.dataframe()[COL_PUNTUACION]
    r = resumen_numerico(puntuaciones)
    return HistogramaOut(
        n=r.n,
        media=r.media,
        mediana=r.mediana,
        desviacion=r.desviacion,
        intervalos=[
            IntervaloHistograma(desde=i.desde, hasta=i.hasta, conteo=i.conteo)
            for i in calcular_histograma(puntuaciones, bins)
        ],
    )

@router.get("/cwe", response_model=DistribucionOut)
def cwe(top: int = Query(10, ge=1, le=50)) -> DistribucionOut:
    """Los `top` CWE más frecuentes; `total` cuenta todos los CVE con CWE."""
    df = fuente.dataframe()
    categorias = distribucion(df[COL_CWE], top=top)
    return DistribucionOut(
        total=int(df[COL_CWE].notna().sum()),
        categorias=_distribucion(categorias).categorias,
    )
