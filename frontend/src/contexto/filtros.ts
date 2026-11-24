import { createContext, useContext } from 'react'
import type { FiltrosDashboard } from '@/api/cliente'
import type { Agrupacion, Privilegios, Severidad, Vector } from '@/api/tipos'

/** Lo que la persona ha elegido en los filtros. Una fecha vacía es `''`; una lista vacía, «todos». */
export interface EstadoFiltros {
  desde: string
  hasta: string
  severidad: Severidad[]
  vector: Vector[]
  privilegios: Privilegios[]
  /** Cómo se agrupa la serie en el tiempo. No es un filtro: no cuenta entre los activos. */
  agrupar: Agrupacion
}

export interface FiltrosCtx {
  estado: EstadoFiltros
  /** Lo que se manda al backend: solo los filtros que tienen valor. */
  filtros: FiltrosDashboard
  /** Cambia algunos filtros. Con una función, se calcula sobre el estado más reciente (útil si hay varios cambios seguidos). */
  establecer: (cambio: Partial<EstadoFiltros> | ((actual: EstadoFiltros) => Partial<EstadoFiltros>)) => void
  /** Quita todos los filtros (no cambia la agrupación). */
  limpiar: () => void
  /** Cuántos filtros hay puestos. */
  activos: number
}

export const ContextoFiltros = createContext<FiltrosCtx | null>(null)

export function useFiltros(): FiltrosCtx {
  const contexto = useContext(ContextoFiltros)
  if (!contexto) throw new Error('useFiltros debe usarse dentro de <FiltrosProvider>')
  return contexto
}
