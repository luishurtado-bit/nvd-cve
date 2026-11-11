from fastapi import APIRouter
from api import fuente
from api.esquemas import Advertencia, BinomialIn, BinomialOut, PuntoPmf
from stats.binomial import calcular
from stats.probabilidad import probabilidad

router = APIRouter(tags=["binomial"])

@router.post("/binomial", response_model=BinomialOut)
def binomial(datos: BinomialIn) -> BinomialOut:
    """X ~ Bin(n, p): número de CVE críticos en un lote de n (RF6)."""
    c = fuente.conteos(datos.criterios)
    p_estimada = datos.p is None
    p = probabilidad(c.A, c.N) if p_estimada else datos.p

    r = calcular(datos.n, p, datos.k, confianza=datos.confianza, N=c.N)

    return BinomialOut(
        n=r.n,
        k=r.k,
        p=r.p,
        p_estimada=p_estimada,
        N=c.N,
        K=c.A,
        pmf=[PuntoPmf(k=i, probabilidad=v) for i, v in enumerate(r.pmf)],
        prob_igual=r.prob_igual,
        prob_a_lo_sumo=r.prob_a_lo_sumo,
        prob_al_menos=r.prob_al_menos,
        media=r.media,
        varianza=r.varianza,
        desviacion=r.desviacion,
        confianza=datos.confianza,
        n_minimo=r.n_minimo,
        advertencias=[Advertencia(codigo=a.codigo, mensaje=a.mensaje) for a in r.advertencias],
    )
