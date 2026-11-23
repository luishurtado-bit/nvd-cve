from datetime import date
from typing import Annotated, Literal
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from api import fuente
from api.esquemas import (
    CeldaCruce,
    ConteoCategoria,
    CriticoPorOut,
    CruceOut,
    DistribucionOut,
    FilaCruceOut,
    GrupoCriticoOut,
    HistogramaOut,
    IntervaloHistograma,
    KpisOut,
    Privilegios,
    PuntoSerie,
    ResumenNumericoOut,
    SerieDiariaOut,
    Severidad,
    VariableCruce,
    VariableGrupo,
    VectorAtaque,
)
from api.fuente import Filtros
from nvd.depuracion import DOMINIOS
from nvd.extraccion import COL_FUENTE, COL_KEV, COL_REFERENCIAS, COL_VERSION
from stats.descriptiva import (
    Categoria,
    critico_por as calcular_critico_por,
    distribucion,
    histograma as calcular_histograma,
    resumen_numerico as calcular_resumen_numerico,
    serie_temporal,
    tabla_cruzada,
)
from stats.eventos import (
    COL_CWE,
    COL_PRIVILEGIOS,
    COL_PUBLICADO,
    COL_PUNTUACION,
    COL_SEVERIDAD,
    COL_VECTOR,
    Criterios,
    contar_eventos,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ORDEN_SEVERIDAD = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE")
# Del más al menos expuesto
ORDEN_VECTOR = DOMINIOS[COL_VECTOR]
ORDEN_PRIVILEGIOS = ("NONE", "LOW", "HIGH")
COLUMNAS_GRUPO = {"vector": COL_VECTOR, "privilegios": COL_PRIVILEGIOS, "version": COL_VERSION, "fuente": COL_FUENTE}
COLUMNAS_CRUCE = {"severidad": COL_SEVERIDAD, "vector": COL_VECTOR, "privilegios": COL_PRIVILEGIOS, "version": COL_VERSION}
ORDENES_CRUCE = {"severidad": ORDEN_SEVERIDAD, "vector": ORDEN_VECTOR, "privilegios": ORDEN_PRIVILEGIOS, "version": None}

Umbral = Annotated[float, Query(ge=0, le=10, description="Crítico: baseScore ≥ umbral")]

def leer_filtros(
    desde: Annotated[date | None, Query(description="Publicados desde este día (incluido)")] = None,
    hasta: Annotated[date | None, Query(description="Publicados hasta este día (incluido)")] = None,
    severidad: Annotated[list[Severidad] | None, Query(description="Una o varias; se repite el parámetro")] = None,
    vector: Annotated[list[VectorAtaque] | None, Query(description="Uno o varios vectores de ataque")] = None,
    privilegios: Annotated[list[Privilegios] | None, Query(description="Uno o varios niveles")] = None,
) -> Filtros:
    """Filtros globales: los aceptan todos los GET /dashboard/*."""
    if desde is not None and hasta is not None and hasta < desde:
        raise HTTPException(status_code=422, detail="hasta debe ser igual o posterior a desde")
    return Filtros(desde, hasta, tuple(severidad or ()), tuple(vector or ()), tuple(privilegios or ()))

Filtrado = Annotated[Filtros, Depends(leer_filtros)]

def _criticos(df: pd.DataFrame, umbral: float) -> pd.Series:
    return (df[COL_PUNTUACION] >= umbral).fillna(False).astype(bool)

def _distribucion(categorias: list[Categoria]) -> DistribucionOut:
    return DistribucionOut(
        total=sum(c.conteo for c in categorias),
        categorias=[
            ConteoCategoria(categoria=c.categoria, conteo=c.conteo, proporcion=c.proporcion)
            for c in categorias
        ],
    )

def _top(df: pd.DataFrame, columna: str, top: int) -> DistribucionOut:
    """Las `top` categorías más frecuentes; `total` cuenta todos los CVE con dato."""
    return DistribucionOut(
        total=int(df[columna].notna().sum()),
        categorias=_distribucion(distribucion(df[columna], top=top)).categorias,
    )

@router.get("/severidad", response_model=DistribucionOut)
def severidad(filtros: Filtrado) -> DistribucionOut:
    """Conteo por severidad, de CRITICAL a NONE."""
    return _distribucion(distribucion(fuente.filtrado(filtros)[COL_SEVERIDAD], orden=ORDEN_SEVERIDAD))

@router.get("/vector-ataque", response_model=DistribucionOut)
def vector_ataque(filtros: Filtrado) -> DistribucionOut:
    """Conteo por vector de ataque, de mayor a menor."""
    return _distribucion(distribucion(fuente.filtrado(filtros)[COL_VECTOR]))

@router.get("/privilegios", response_model=DistribucionOut)
def privilegios(filtros: Filtrado) -> DistribucionOut:
    """Conteo por privilegios requeridos: NONE, LOW, HIGH."""
    return _distribucion(distribucion(fuente.filtrado(filtros)[COL_PRIVILEGIOS], orden=ORDEN_PRIVILEGIOS))

@router.get("/fuentes", response_model=DistribucionOut)
def fuentes(filtros: Filtrado, top: Annotated[int, Query(ge=1, le=50)] = 10) -> DistribucionOut:
    """Las `top` fuentes (CNA) que más CVE publicaron."""
    return _top(fuente.filtrado(filtros), COL_FUENTE, top)

@router.get("/serie-diaria", response_model=SerieDiariaOut)
def serie_diaria(
    filtros: Filtrado,
    agrupar: Annotated[Literal["dia", "semana", "mes"], Query(description="Semanas de lunes a domingo")] = "dia",
    umbral: Umbral = 9.0,
) -> SerieDiariaOut:
    """CVE publicados y críticos por día, semana o mes. Con 120 días conviene
    agrupar por semana: por día son demasiados puntos para leerlos."""
    df = fuente.filtrado(filtros)
    puntos = serie_temporal(df[COL_PUBLICADO], _criticos(df, umbral), agrupar)
    return SerieDiariaOut(
        total=sum(p.conteo for p in puntos),
        agrupar=agrupar,
        umbral=umbral,
        puntos=[
            PuntoSerie(
                fecha=p.fecha,
                conteo=p.conteo,
                criticos=p.criticos,
                proporcion_criticos=p.criticos / p.conteo if p.conteo else None,
            )
            for p in puntos
        ],
    )

@router.get("/histograma", response_model=HistogramaOut)
def histograma(filtros: Filtrado, bins: Annotated[int, Query(ge=1, le=50)] = 10) -> HistogramaOut:
    """Histograma de baseScore en [0, 10] con media, mediana y desviación."""
    puntuaciones = fuente.filtrado(filtros)[COL_PUNTUACION]
    r = calcular_resumen_numerico(puntuaciones)
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
def cwe(filtros: Filtrado, top: Annotated[int, Query(ge=1, le=50)] = 10) -> DistribucionOut:
    """Los `top` CWE más frecuentes; `total` cuenta todos los CVE con CWE."""
    return _top(fuente.filtrado(filtros), COL_CWE, top)

@router.get("/resumen-numerico", response_model=list[ResumenNumericoOut])
def resumen_numerico(filtros: Filtrado) -> list[ResumenNumericoOut]:
    """Mínimo, cuartiles, máximo, media, desviación y asimetría de baseScore y n_referencias."""
    df = fuente.filtrado(filtros)
    return [
        ResumenNumericoOut(variable=columna, **vars(calcular_resumen_numerico(df[columna])))
        for columna in (COL_PUNTUACION, COL_REFERENCIAS)
    ]

@router.get("/critico-por", response_model=CriticoPorOut)
def critico_por(
    variable: VariableGrupo,
    filtros: Filtrado,
    umbral: Umbral = 9.0,
    top: Annotated[int | None, Query(ge=1, le=50, description="Solo los grupos con más CVE")] = None,
) -> CriticoPorOut:
    """Proporción de críticos en cada grupo (P2 y P3): ¿cambia según el vector, los
    privilegios, la versión de CVSS o la fuente? Es una observación, no una causa."""
    df = fuente.filtrado(filtros)
    columna = df[COLUMNAS_GRUPO[variable]]
    criticos = _criticos(df, umbral)
    con_dato = columna.notna().to_numpy()
    total, n_criticos = int(con_dato.sum()), int(criticos[con_dato].sum())
    return CriticoPorOut(
        variable=variable,
        umbral=umbral,
        total=total,
        criticos=n_criticos,
        proporcion_criticos=n_criticos / total if total else None,
        sin_dato=len(df) - total,
        grupos=[
            GrupoCriticoOut(grupo=g.grupo, total=g.total, criticos=g.criticos, proporcion_criticos=g.proporcion)
            for g in calcular_critico_por(columna, criticos, top)
        ],
    )

@router.get("/cruce", response_model=CruceOut)
def cruce(
    filtros: Filtrado,
    fila: VariableCruce = "severidad",
    columna: VariableCruce = "vector",
) -> CruceOut:
    """Tabla cruzada (por defecto severidad × vector de ataque), con conteos y
    proporción sobre el total de cada fila, para barras apiladas al 100 %."""
    if fila == columna:
        raise HTTPException(status_code=422, detail="fila y columna deben ser variables distintas")
    df = fuente.filtrado(filtros)
    columnas, filas = tabla_cruzada(
        df[COLUMNAS_CRUCE[fila]], df[COLUMNAS_CRUCE[columna]], ORDENES_CRUCE[fila], ORDENES_CRUCE[columna]
    )
    return CruceOut(
        fila=fila,
        columna=columna,
        total=sum(f.total for f in filas),
        columnas=columnas,
        filas=[
            FilaCruceOut(
                categoria=f.categoria,
                total=f.total,
                celdas=[
                    CeldaCruce(categoria=c, conteo=n, proporcion=n / f.total if f.total else 0.0)
                    for c, n in f.conteos.items()
                ],
            )
            for f in filas
        ],
    )

@router.get("/kpis", response_model=KpisOut)
def kpis(filtros: Filtrado, umbral: Umbral = 9.0) -> KpisOut:
    """Indicadores clave del conjunto: los mismos conteos que los eventos A, B y C
    (crítico, por red y sin privilegios), más la puntuación media y el KEV."""
    df = fuente.filtrado(filtros)
    datos = fuente.resumen()
    c = contar_eventos(df, Criterios(umbral=umbral))
    r = calcular_resumen_numerico(df[COL_PUNTUACION])

    def proporcion(conteo: int) -> float | None:
        return conteo / c.N if c.N else None

    return KpisOut(
        N=c.N,
        N_sin_filtro=len(fuente.dataframe()),
        umbral=umbral,
        criticos=c.A,
        proporcion_criticos=proporcion(c.A),
        media_puntuacion=r.media,
        mediana_puntuacion=r.mediana,
        red=c.B,
        proporcion_red=proporcion(c.B),
        sin_privilegios=c.C,
        proporcion_sin_privilegios=proporcion(c.C),
        kev=int(df[COL_KEV].fillna(False).astype(bool).sum()),
        periodo=datos.periodo,
        fecha_consulta=datos.fecha_consulta,
        origen=datos.origen,
    )
