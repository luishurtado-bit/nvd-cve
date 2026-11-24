import { useCallback, useEffect, useRef, useState } from 'react'
import { esCancelacion } from '@/api/cliente'
import { mensajeDe } from '@/lib/dominio'

interface Opciones {
  /** Con `false` no se consulta (por ejemplo, mientras un formulario no es válido). */
  activo?: boolean
  /** Espera en milisegundos antes de consultar; si algo cambia antes, se descarta (debounce). */
  retardo?: number
}

interface Estado<T> {
  datos: T | undefined
  cargando: boolean
  error: string | null
}

/**
 * Consulta al backend y vuelve a consultar cuando cambia algo de `deps`.
 *
 * - Cancela la petición anterior (AbortController) al cambiar `deps` o al desmontarse.
 * - **Conserva `datos` mientras recarga**: la pantalla no se vacía ni se desmonta al cambiar un filtro.
 * - `deps` debe ser serializable (números, textos, listas, objetos simples): se compara su JSON.
 * - `recargar()` repite la consulta con los mismos `deps`.
 */
export function useConsulta<T>(
  consulta: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  { activo = true, retardo = 0 }: Opciones = {},
) {
  const [recarga, setRecarga] = useState(0)
  const clave = JSON.stringify([deps, activo, retardo, recarga])
  const [estado, setEstado] = useState<Estado<T>>({ datos: undefined, cargando: activo, error: null })

  // Si cambió algo, se marca «cargando» durante el propio render: un efecto lo haría un render tarde
  const [claveVista, setClaveVista] = useState(clave)
  if (clave !== claveVista) {
    setClaveVista(clave)
    setEstado((anterior) => ({ ...anterior, cargando: activo, error: null }))
  }

  // La consulta más reciente, sin que cambiar su identidad (una función nueva en cada render) repita la petición
  const ultima = useRef(consulta)
  useEffect(() => {
    ultima.current = consulta
  })

  useEffect(() => {
    if (!activo) return
    const control = new AbortController()
    const temporizador = setTimeout(() => {
      ultima.current(control.signal).then(
        (datos) => {
          if (!control.signal.aborted) setEstado({ datos, cargando: false, error: null })
        },
        (error: unknown) => {
          if (control.signal.aborted || esCancelacion(error)) return
          setEstado((anterior) => ({ ...anterior, cargando: false, error: mensajeDe(error) }))
        },
      )
    }, retardo)
    return () => {
      clearTimeout(temporizador)
      control.abort()
    }
  }, [clave, activo, retardo])

  const recargar = useCallback(() => setRecarga((n) => n + 1), [])
  return { ...estado, recargar }
}
