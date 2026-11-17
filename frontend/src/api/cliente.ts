import type {
  BayesIn,
  BayesOut,
  BinomialIn,
  BinomialOut,
  CargarIn,
  CriteriosIn,
  DistribucionOut,
  EventosOut,
  HistogramaOut,
  ReglasIn,
  ReglasOut,
  ResumenDatos,
  Salud,
  SerieDiariaOut,
} from './tipos.ts'

// Los componentes del Front B importan estos tipos desde aquí
export type { CargarIn, DistribucionOut, HistogramaOut, ResumenDatos, SerieDiariaOut } from './tipos.ts'

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

// Front A: estadística (eventos, reglas, Bayes y binomial)
export const api = {
  salud: () => pedir<Salud>('/api/salud'),
  resumen: () => pedir<ResumenDatos>('/api/datos/resumen'),
  eventos: (criterios: CriteriosIn) => enviar<EventosOut>('/api/eventos', criterios),
  reglas: (entrada: ReglasIn) => enviar<ReglasOut>('/api/reglas', entrada),
  bayes: (entrada: BayesIn) => enviar<BayesOut>('/api/bayes', entrada),
  binomial: (entrada: BinomialIn) => enviar<BinomialOut>('/api/binomial', entrada),
}

// Front B: carga de datos y dashboard descriptivo.
// Usa el mismo manejo de errores que el Front A (ErrorApi extiende Error).
export const apiFrontB = {
  obtenerResumen: () => pedir<ResumenDatos>('/api/datos/resumen'),

  cargarPorFechas: (fechas: CargarIn) => enviar<ResumenDatos>('/api/datos/cargar', fechas),

  cargarArchivoCsv: (archivo: File) => {
    const formData = new FormData()
    formData.append('archivo', archivo)
    return pedir<ResumenDatos>('/api/datos/archivo', { method: 'POST', body: formData })
  },

  obtenerSeveridad: () => pedir<DistribucionOut>('/api/dashboard/severidad'),

  obtenerVectorAtaque: () => pedir<DistribucionOut>('/api/dashboard/vector-ataque'),

  obtenerSerieDiaria: () => pedir<SerieDiariaOut>('/api/dashboard/serie-diaria'),

  obtenerHistograma: (bins?: number) =>
    pedir<HistogramaOut>(bins ? `/api/dashboard/histograma?bins=${bins}` : '/api/dashboard/histograma'),

  obtenerCwe: (top?: number) =>
    pedir<DistribucionOut>(top ? `/api/dashboard/cwe?top=${top}` : '/api/dashboard/cwe'),
}
