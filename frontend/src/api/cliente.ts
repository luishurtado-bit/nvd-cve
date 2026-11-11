import type {
  BayesIn,
  BayesOut,
  BinomialIn,
  BinomialOut,
  CriteriosIn,
  EventosOut,
  ReglasIn,
  ReglasOut,
  ResumenDatos,
} from './tipos.ts'

export class ErrorApi extends Error {
  estado: number

  constructor(mensaje: string, estado: number) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

async function extraerMensaje(respuesta: Response): Promise<string> {
  try {
    const datos: unknown = await respuesta.json()
    if (typeof datos === 'object' && datos !== null && 'detail' in datos) {
      const detalle = (datos as { detail: unknown }).detail
      if (typeof detalle === 'string') return detalle
      if (Array.isArray(detalle)) {
        return detalle
          .map((d: unknown) =>
            typeof d === 'object' && d !== null && 'msg' in d
              ? String((d as { msg: unknown }).msg)
              : 'Dato inválido',
          )
          .join('; ')
      }
    }
  } catch {
    // la respuesta no traía JSON
  }
    if (respuesta.status === 502 || respuesta.status === 503 || respuesta.status === 504) {
        return 'No hay conexión con el backend. ¿Está levantado?'
    }
    return `Error ${respuesta.status} del servidor`
}

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, opciones)
  } catch {
    throw new ErrorApi('No hay conexión con el backend. ¿Está levantado?', 0)
  }
  if (!respuesta.ok) {
    throw new ErrorApi(await extraerMensaje(respuesta), respuesta.status)
  }
  return (await respuesta.json()) as T
}

function enviar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  return pedir<T>(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
}

export const api = {
  resumen: () => pedir<ResumenDatos>('/api/datos/resumen'),
  eventos: (criterios: CriteriosIn) => enviar<EventosOut>('/api/eventos', criterios),
  reglas: (entrada: ReglasIn) => enviar<ReglasOut>('/api/reglas', entrada),
  bayes: (entrada: BayesIn) => enviar<BayesOut>('/api/bayes', entrada),
  binomial: (entrada: BinomialIn) => enviar<BinomialOut>('/api/binomial', entrada),
}