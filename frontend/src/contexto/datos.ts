import { createContext, useContext } from 'react'
import type { ResumenDatos } from '@/api/tipos'

export interface DatosCtx {
  /** Resumen del conjunto cargado en el backend (o de los datos simulados). `undefined` hasta que llega. */
  resumen: ResumenDatos | undefined
  /** Solo la primera lectura: después se conserva el último resumen mientras se vuelve a leer. */
  cargando: boolean
  error: string | null
  /**
   * Sube cada vez que cambia el conjunto de datos (se cargó otro periodo o un CSV). Las consultas
   * que dependen de los datos lo incluyen en sus `deps` para volver a pedirse solas.
   */
  version: number
  /** Avisa que se cargó un conjunto nuevo y deja listo su resumen. */
  alCargar: (resumen: ResumenDatos) => void
  /** Vuelve a leer el resumen del backend y, si se pudo, sube `version`. */
  recargar: () => Promise<void>
}

export const ContextoDatos = createContext<DatosCtx | null>(null)

export function useDatos(): DatosCtx {
  const contexto = useContext(ContextoDatos)
  if (!contexto) throw new Error('useDatos debe usarse dentro de <DatosProvider>')
  return contexto
}
