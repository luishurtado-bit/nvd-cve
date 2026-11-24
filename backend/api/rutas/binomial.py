from fastapi import APIRouter
from api import fuente, registro
from api.esquemas import Advertencia, BinomialIn, BinomialOut, CriteriosIn, PuntoPmf, Supuesto
from stats.binomial import calcular, n_max_recomendado, supuestos
from stats.probabilidad import probabilidad

router = APIRouter(tags=["binomial"])

@router.post("/binomial", response_model=BinomialOut)
def binomial(datos: BinomialIn) -> BinomialOut:
    """X ~ Bin(n, p): número de CVE críticos en un lote de n (RF6)."""
    # Solo A (crítico) interviene en p; B y C no, así que no se piden
    c = fuente.conteos(CriteriosIn(umbral=datos.umbral))
    p_estimada = datos.p is None
    p = probabilidad(c.A, c.N) if p_estimada else datos.p

    r = calcular(datos.n, p, datos.k, confianza=datos.confianza, N=c.N)

    salida = BinomialOut(
        n=r.n,
        k=r.k,
        p=r.p,
        p_estimada=p_estimada,
        umbral=datos.umbral,
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
        n_max_recomendado=n_max_recomendado(c.N),
        supuestos=[
            Supuesto(codigo=a.codigo, estado=a.estado, texto=a.texto)  # type: ignore[arg-type]
            for a in supuestos(r.n, r.p, c.N, c.A, datos.umbral, p_estimada)
        ],
        advertencias=[Advertencia(codigo=a.codigo, mensaje=a.mensaje) for a in r.advertencias],
    )
    # Sin la tabla de la pmf: puede tener hasta 10 001 filas
    registro.registrar("binomial", datos.model_dump(), salida.model_dump(mode="json", exclude={"pmf"}))
    return salida
