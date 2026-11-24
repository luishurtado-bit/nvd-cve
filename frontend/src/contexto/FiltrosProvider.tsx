import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { FiltrosDashboard } from '@/api/cliente'
import type { Agrupacion } from '@/api/tipos'
import { agrupacionSugerida } from '@/lib/agrupacion'
import { useDatos } from './datos'
import { ContextoFiltros, type EstadoFiltros, type FiltrosCtx } from './filtros'

function sinFiltros(agrupar: Agrupacion): EstadoFiltros {
  return { desde: '', hasta: '', severidad: [], vector: [], privilegios: [], agrupar }
}

/**
 * Guarda los filtros del análisis descriptivo fuera de la página, para que sobrevivan al cambiar de
 * sección y volver. Se reinician cuando se carga otro conjunto de datos: sus fechas ya no valen.
 */
export function FiltrosProvider({ children }: { children: ReactNode }) {
  const { resumen, version } = useDatos()
  const sugerida = agrupacionSugerida(resumen?.periodo)
  const [estado, setEstado] = useState<EstadoFiltros>(() => sinFiltros(sugerida))

  // Si cambió el conjunto de datos, se parte de cero durante el propio render (un efecto lo haría un render tarde)
  const clave = `${version}|${sugerida}`
  const [claveVista, setClaveVista] = useState(clave)
  if (clave !== claveVista) {
    setClaveVista(clave)
    setEstado(sinFiltros(sugerida))
  }

  const establecer = useCallback<FiltrosCtx['establecer']>(
    (cambio) => setEstado((e) => ({ ...e, ...(typeof cambio === 'function' ? cambio(e) : cambio) })),
    [],
  )
  const limpiar = useCallback(() => setEstado((e) => sinFiltros(e.agrupar)), [])

  const valor = useMemo<FiltrosCtx>(() => {
    const filtros: FiltrosDashboard = {
      desde: estado.desde || undefined,
      hasta: estado.hasta || undefined,
      severidad: estado.severidad.length ? estado.severidad : undefined,
      vector: estado.vector.length ? estado.vector : undefined,
      privilegios: estado.privilegios.length ? estado.privilegios : undefined,
    }
    const activos = Object.values(filtros).filter((f) => f !== undefined).length
    return { estado, filtros, establecer, limpiar, activos }
  }, [estado, establecer, limpiar])

  return <ContextoFiltros.Provider value={valor}>{children}</ContextoFiltros.Provider>
}
