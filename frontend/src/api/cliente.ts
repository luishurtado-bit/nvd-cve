import { urlApi, type Params } from './consulta.ts'
import type {
  Agrupacion,
  BayesIn,
  BayesOut,
  BinomialIn,
  BinomialOut,
  CalidadOut,
  CargarIn,
  CriteriosIn,
  CriticoPorOut,
  CruceOut,
  DescargaOut,
  DistribucionOut,
  EventosOut,
  HistogramaOut,
  KpisOut,
  Privilegios,
  ReglasIn,
  ReglasOut,
  ResumenDatos,
  ResumenNumericoOut,
  Salud,
  SerieDiariaOut,
  Severidad,
  VariableCruce,
  VariableGrupo,
  Vector,
} from './tipos.ts'

export class ErrorApi extends Error {
  estado: number

  constructor(mensaje: string, estado: number) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

/** Una petición cancelada con AbortController no es un error: quien la cancela no espera respuesta. */
export function esCancelacion(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
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
  } catch (error) {
    if (esCancelacion(error)) throw error
    throw new ErrorApi('No hay conexión con el backend. ¿Está levantado?', 0)
  }
  if (!respuesta.ok) {
    throw new ErrorApi(await extraerMensaje(respuesta), respuesta.status)
  }
  return (await respuesta.json()) as T
}

function enviar<T>(ruta: string, cuerpo: unknown, signal?: AbortSignal): Promise<T> {
  return pedir<T>(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal,
  })
}

/** Filtros globales: los aceptan todas las rutas de /api/dashboard. Los tres últimos admiten varios valores. */
export interface FiltrosDashboard {
  desde?: string // AAAA-MM-DD, incluido
  hasta?: string // AAAA-MM-DD, incluido
  severidad?: Severidad[]
  vector?: Vector[]
  privilegios?: Privilegios[]
}

/** Toda consulta puede cancelarse con un AbortController. */
export interface Cancelable {
  signal?: AbortSignal
}

function dashboard<T>(
  ruta: string,
  filtros: FiltrosDashboard = {},
  extra: Params = {},
  signal?: AbortSignal,
): Promise<T> {
  return pedir<T>(urlApi(`/api/dashboard/${ruta}`, { ...filtros, ...extra }), { signal })
}

export const api = {
  salud: (signal?: AbortSignal) => pedir<Salud>('/api/salud', { signal }),
  resumen: (signal?: AbortSignal) => pedir<ResumenDatos>('/api/datos/resumen', { signal }),

  // Probabilidad: eventos, reglas, Bayes y binomial
  eventos: (criterios: CriteriosIn, signal?: AbortSignal) =>
    enviar<EventosOut>('/api/eventos', criterios, signal),
  reglas: (entrada: ReglasIn, signal?: AbortSignal) => enviar<ReglasOut>('/api/reglas', entrada, signal),
  bayes: (entrada: BayesIn, signal?: AbortSignal) => enviar<BayesOut>('/api/bayes', entrada, signal),
  binomial: (entrada: BinomialIn, signal?: AbortSignal) =>
    enviar<BinomialOut>('/api/binomial', entrada, signal),

  // Datos: carga, descargas en segundo plano y calidad
  datos: {
    resumen: (signal?: AbortSignal) => pedir<ResumenDatos>('/api/datos/resumen', { signal }),
    calidad: (signal?: AbortSignal) => pedir<CalidadOut>('/api/datos/calidad', { signal }),
    cargar: (entrada: CargarIn) => enviar<ResumenDatos>('/api/datos/cargar', entrada),
    archivo: (archivo: File) => {
      const formData = new FormData()
      formData.append('archivo', archivo)
      return pedir<ResumenDatos>('/api/datos/archivo', { method: 'POST', body: formData })
    },
    iniciarDescarga: (entrada: CargarIn) => enviar<DescargaOut>('/api/datos/descargas', entrada),
    estadoDescarga: (id: string, signal?: AbortSignal) =>
      pedir<DescargaOut>(`/api/datos/descargas/${encodeURIComponent(id)}`, { signal }),
  },

  // Dashboard: todas aceptan los filtros globales
  dashboard: {
    kpis: (f?: FiltrosDashboard, o: { umbral?: number } & Cancelable = {}) =>
      dashboard<KpisOut>('kpis', f, { umbral: o.umbral }, o.signal),
    severidad: (f?: FiltrosDashboard, o: Cancelable = {}) =>
      dashboard<DistribucionOut>('severidad', f, {}, o.signal),
    vectorAtaque: (f?: FiltrosDashboard, o: Cancelable = {}) =>
      dashboard<DistribucionOut>('vector-ataque', f, {}, o.signal),
    privilegios: (f?: FiltrosDashboard, o: Cancelable = {}) =>
      dashboard<DistribucionOut>('privilegios', f, {}, o.signal),
    fuentes: (f?: FiltrosDashboard, o: { top?: number } & Cancelable = {}) =>
      dashboard<DistribucionOut>('fuentes', f, { top: o.top }, o.signal),
    cwe: (f?: FiltrosDashboard, o: { top?: number } & Cancelable = {}) =>
      dashboard<DistribucionOut>('cwe', f, { top: o.top }, o.signal),
    histograma: (f?: FiltrosDashboard, o: { bins?: number } & Cancelable = {}) =>
      dashboard<HistogramaOut>('histograma', f, { bins: o.bins }, o.signal),
    resumenNumerico: (f?: FiltrosDashboard, o: Cancelable = {}) =>
      dashboard<ResumenNumericoOut[]>('resumen-numerico', f, {}, o.signal),
    serie: (f?: FiltrosDashboard, o: { agrupar?: Agrupacion; umbral?: number } & Cancelable = {}) =>
      dashboard<SerieDiariaOut>('serie-diaria', f, { agrupar: o.agrupar, umbral: o.umbral }, o.signal),
    criticoPor: (
      variable: VariableGrupo,
      f?: FiltrosDashboard,
      o: { umbral?: number; top?: number } & Cancelable = {},
    ) => dashboard<CriticoPorOut>('critico-por', f, { variable, umbral: o.umbral, top: o.top }, o.signal),
    cruce: (f?: FiltrosDashboard, o: { fila?: VariableCruce; columna?: VariableCruce } & Cancelable = {}) =>
      dashboard<CruceOut>('cruce', f, { fila: o.fila, columna: o.columna }, o.signal),
  },
}

export type RecursoExportable = 'cve' | 'crudo' | 'calidad' | 'eventos' | 'reglas' | 'bayes' | 'binomial'

/** Enlace de descarga de /api/exportar/{recurso}; sirve como `href` de un <a download>. */
export function urlExportar(recurso: RecursoExportable, params?: Params): string {
  return urlApi(`/api/exportar/${recurso}`, params)
}
