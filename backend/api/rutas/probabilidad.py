from fastapi import APIRouter, HTTPException

from api import mocks
from api.esquemas import (
    BayesIn,
    BayesOut,
    ConteoProb,
    CriteriosIn,
    EventosOut,
    ReglasIn,
    ReglasOut,
    TablaEventos,
)
from stats.eventos import Conteos, Criterios, contar_eventos
from stats.probabilidad import (
    bayes,
    complemento,
    condicional,
    probabilidad,
    probabilidad_total,
    son_independientes,
    union,
)

router = APIRouter(tags=["probabilidad"])

NOTA_DEPENDENCIA = (
    "A se define con baseScore, que el CVSS calcula a partir del vector de ataque "
    "y de los privilegios requeridos: la dependencia entre A y {otro} es una "
    "propiedad de la métrica, no un hallazgo empírico."
)

def _conteos(criterios: CriteriosIn) -> Conteos:
    # B7: cambiar mocks.dataframe() por el DataFrame cargado
    c = contar_eventos(mocks.dataframe(), Criterios(**criterios.model_dump()))
    if c.N == 0:
        raise HTTPException(status_code=422, detail="No hay CVE cargados: N = 0")
    return c

def _interseccion(c: Conteos, x: str, y: str) -> int:
    return getattr(c, "".join(sorted(x + y)))

@router.post("/eventos", response_model=EventosOut)
def eventos(criterios: CriteriosIn) -> EventosOut:
    """N, conteos y probabilidades de A, B, C y sus intersecciones."""
    c = _conteos(criterios)

    def fila(conteo: int) -> ConteoProb:
        return ConteoProb(conteo=conteo, probabilidad=probabilidad(conteo, c.N))

    return EventosOut(
        criterios=criterios,
        N=c.N,
        eventos=TablaEventos(
            A=fila(c.A),
            B=fila(c.B),
            C=fila(c.C),
            AB=fila(c.AB),
            AC=fila(c.AC),
            BC=fila(c.BC),
            ABC=fila(c.ABC),
        ),
    )

@router.post("/reglas", response_model=ReglasOut)
def reglas(datos: ReglasIn) -> ReglasOut:
    """Complemento, unión, intersección e independencia de dos eventos."""
    c = _conteos(datos.criterios)
    x, y = datos.x, datos.y
    p_x = probabilidad(getattr(c, x), c.N)
    p_y = probabilidad(getattr(c, y), c.N)
    p_xy = probabilidad(_interseccion(c, x, y), c.N)

    nota = None
    if "A" in (x, y):
        nota = NOTA_DEPENDENCIA.format(otro=y if x == "A" else x)

    return ReglasOut(
        x=x,
        y=y,
        p_x=p_x,
        p_y=p_y,
        p_x_complemento=complemento(p_x),
        p_y_complemento=complemento(p_y),
        p_interseccion=p_xy,
        p_union=union(p_x, p_y, p_xy),
        producto=p_x * p_y,
        independientes=son_independientes(p_x, p_y, p_xy),
        nota=nota,
    )

@router.post("/bayes", response_model=BayesOut)
def bayes_(datos: BayesIn) -> BayesOut:
    """Actualización de P(A) al observar E (B o C), con prior editable."""
    c = _conteos(datos.criterios)
    e = datos.condicionante
    n_e = getattr(c, e)
    n_ae = _interseccion(c, "A", e)

    if c.A in (0, c.N):
        raise HTTPException(
            status_code=422,
            detail=f"P(A) = {c.A / c.N:g} con estos criterios: "
            "P(E | A) o P(E | Aᶜ) no están definidas",
        )
    if n_e == 0:
        raise HTTPException(
            status_code=422, detail=f"P({e}) = 0: no se puede condicionar por {e}"
        )

    p_a = probabilidad(c.A, c.N)
    p_e_dado_a = condicional(probabilidad(n_ae, c.N), p_a)
    p_e_dado_ac = condicional(probabilidad(n_e - n_ae, c.N), complemento(p_a))
    prior = p_a if datos.prior is None else datos.prior
    p_e = probabilidad_total(p_e_dado_a, p_e_dado_ac, prior)

    if p_e == 0:
        raise HTTPException(
            status_code=422, detail=f"Con prior = {prior:g}, P({e}) = 0"
        )

    return BayesOut(
        condicionante=e,
        p_a=p_a,
        prior=prior,
        p_e_dado_a=p_e_dado_a,
        p_e_dado_ac=p_e_dado_ac,
        p_e=p_e,
        p_a_dado_e=condicional(probabilidad(n_ae, c.N), probabilidad(n_e, c.N)),
        posterior=bayes(p_e_dado_a, prior, p_e),
    )
