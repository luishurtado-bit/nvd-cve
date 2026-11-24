import type { CriticoPorOut, KpisOut, SerieDiariaOut } from '@/api/tipos'
import { etiquetaDe, PRIVILEGIOS, VECTORES } from '@/lib/dominio'
import { fechaCorta, fraccion, mesAnio, numero, porcentaje } from '@/lib/formato'
import type { ClavePregunta } from '@/lib/preguntas'

export interface Hallazgo {
  id: 'proporcion' | 'contraste' | 'pico' | 'vacio'
  pregunta: ClavePregunta | null
  texto: string
  /** Aclaración que va debajo de la frase. */
  nota?: string
}

export interface EntradaHallazgos {
  kpis: KpisOut
  vector: CriticoPorOut
  privilegios: CriticoPorOut
  serie: SerieDiariaOut
}

// Un grupo con muy pocos CVE no sirve para comparar: su porcentaje salta con cualquier caso
const MIN_CVE_POR_GRUPO = 30
const MIN_FRACCION_POR_GRUPO = 0.01
// Debajo de esta diferencia (en proporción, 0,5 puntos) se dice que casi no cambia
const DIFERENCIA_DESPRECIABLE = 0.005

type Grupo = CriticoPorOut['grupos'][number]

function gruposComparables(variable: CriticoPorOut): Grupo[] {
  const minimo = Math.max(MIN_CVE_POR_GRUPO, MIN_FRACCION_POR_GRUPO * variable.total)
  return variable.grupos.filter((g) => g.total >= minimo)
}

function extremos(grupos: Grupo[]): { alto: Grupo; bajo: Grupo } {
  let alto = grupos[0]
  let bajo = grupos[0]
  for (const g of grupos) {
    if (g.proporcion_criticos > alto.proporcion_criticos) alto = g
    if (g.proporcion_criticos < bajo.proporcion_criticos) bajo = g
  }
  return { alto, bajo }
}

function hallazgoProporcion(kpis: KpisOut): Hallazgo {
  return {
    id: 'proporcion',
    pregunta: 'P1',
    texto: `De los CVE con puntuación ${cuandoSePublicaron(kpis)}, ${fraccion(kpis.criticos, kpis.N)} son críticos (CVSS ≥ ${numero(kpis.umbral, 1)}).`,
  }
}

function cuandoSePublicaron(kpis: KpisOut): string {
  const { inicio, fin } = kpis.periodo
  if (!inicio || !fin) return 'cargados' // los datos simulados no tienen periodo
  return `publicados entre ${fechaCorta(inicio)} y ${fechaCorta(fin)}`
}

function hallazgoContraste(vector: CriticoPorOut, privilegios: CriticoPorOut): Hallazgo | null {
  const candidatos = [
    { variable: vector, grupos: gruposComparables(vector), nombre: 'el vector de ataque' },
    { variable: privilegios, grupos: gruposComparables(privilegios), nombre: 'los privilegios requeridos' },
  ]
    .filter((c) => c.grupos.length >= 2)
    .map((c) => ({ ...c, ...extremos(c.grupos) }))
    .map((c) => ({ ...c, diferencia: c.alto.proporcion_criticos - c.bajo.proporcion_criticos }))
  if (candidatos.length === 0) return null

  // La variable donde más cambia el porcentaje de críticos; si empatan, gana el vector
  const elegido = candidatos.reduce((a, b) => (b.diferencia > a.diferencia ? b : a))
  const esVector = elegido.variable.variable === 'vector'
  const grupoEnFrase = (g: Grupo) =>
    esVector
      ? `los CVE de vector «${etiquetaDe(VECTORES, g.grupo)}»`
      : `los CVE con privilegios «${etiquetaDe(PRIVILEGIOS, g.grupo)}»`
  const puntos = numero(elegido.diferencia * 100, 1)
  const alto = `${fraccion(elegido.alto.criticos, elegido.alto.total)} entre ${grupoEnFrase(elegido.alto)}`
  const bajo = `${fraccion(elegido.bajo.criticos, elegido.bajo.total)} entre ${grupoEnFrase(elegido.bajo)}`

  const texto =
    elegido.diferencia < DIFERENCIA_DESPRECIABLE
      ? `El porcentaje de críticos casi no cambia según ${elegido.nombre}: va de ${porcentaje(elegido.bajo.proporcion_criticos)} a ${porcentaje(elegido.alto.proporcion_criticos)}.`
      : `El porcentaje de críticos cambia según ${elegido.nombre}: ${alto}, frente a ${bajo}; una diferencia de ${puntos} puntos porcentuales.`
  return {
    id: 'contraste',
    pregunta: 'P2',
    texto,
    nota: 'La puntuación CVSS se calcula en parte con el vector de ataque y los privilegios, así que esta relación viene del propio cálculo.',
  }
}

function hallazgoPico(serie: SerieDiariaOut): Hallazgo | null {
  const puntos = serie.puntos
  if (puntos.length < 3) return null
  const pico = puntos.reduce((a, b) => (b.conteo > a.conteo ? b : a))
  if (pico.conteo === 0) return null
  const detalle = `${numero(pico.conteo)} CVE, ${porcentaje(pico.proporcion_criticos)} críticos`
  const texto =
    serie.agrupar === 'dia'
      ? `El día con más publicaciones fue el ${fechaCorta(pico.fecha)}: ${detalle}.`
      : serie.agrupar === 'semana'
        ? `La semana con más publicaciones empezó el ${fechaCorta(pico.fecha)}: ${detalle}.`
        : `El mes con más publicaciones fue ${mesAnio(pico.fecha)}: ${detalle}.`
  return { id: 'pico', pregunta: 'P3', texto }
}

/**
 * Hasta tres hallazgos escritos con las cifras de los datos cargados (nunca con números fijos):
 * la proporción de críticos, el contraste entre grupos y el pico de publicaciones.
 * Si no hay CVE con puntuación, devuelve un solo aviso.
 */
export function construirHallazgos({ kpis, vector, privilegios, serie }: EntradaHallazgos): Hallazgo[] {
  if (kpis.N === 0) {
    return [
      {
        id: 'vacio',
        pregunta: null,
        texto: 'No hay CVE con puntuación en el periodo cargado: no hay hallazgos que mostrar.',
      },
    ]
  }
  return [hallazgoProporcion(kpis), hallazgoContraste(vector, privilegios), hallazgoPico(serie)].filter(
    (h): h is Hallazgo => h !== null,
  )
}
