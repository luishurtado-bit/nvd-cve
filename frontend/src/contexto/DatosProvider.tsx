import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, esCancelacion } from '@/api/cliente'
import type { ResumenDatos } from '@/api/tipos'
import { mensajeDe } from '@/lib/dominio'
import { ContextoDatos, type DatosCtx } from './datos'

/** Guarda en un solo lugar el resumen del conjunto cargado, para que todas las páginas vean lo mismo. */
export function DatosProvider({ children }: { children: ReactNode }) {
  const [resumen, setResumen] = useState<ResumenDatos>()
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const control = new AbortController()
    api.datos.resumen(control.signal).then(
      (r) => {
        setResumen(r)
        setError(null)
        setCargando(false)
      },
      (e: unknown) => {
        if (esCancelacion(e)) return
        setError(mensajeDe(e))
        setCargando(false)
      },
    )
    return () => control.abort()
  }, [])

  const alCargar = useCallback((nuevo: ResumenDatos) => {
    setResumen(nuevo)
    setError(null)
    setCargando(false)
    setVersion((v) => v + 1)
  }, [])

  const recargar = useCallback(async () => {
    try {
      alCargar(await api.datos.resumen())
    } catch (e) {
      setError(mensajeDe(e))
    }
  }, [alCargar])

  const valor = useMemo<DatosCtx>(
    () => ({ resumen, cargando, error, version, alCargar, recargar }),
    [resumen, cargando, error, version, alCargar, recargar],
  )
  return <ContextoDatos.Provider value={valor}>{children}</ContextoDatos.Provider>
}
