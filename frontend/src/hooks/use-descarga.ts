import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ErrorApi, esCancelacion } from '@/api/cliente'
import type { CargarIn, DescargaOut, ResumenDatos } from '@/api/tipos'
import { mensajeDe } from '@/lib/dominio'

const CLAVE_ID = 'descarga-id'
const INTERVALO_MS = 1500
const REINTENTO_MS = 4000

// sessionStorage puede no estar disponible (modo privado, política del navegador): sin él, la descarga
// funciona igual, solo que no se retoma al volver a la página
function leerId(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_ID)
  } catch {
    return null
  }
}

function guardarId(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(CLAVE_ID, id)
    else sessionStorage.removeItem(CLAVE_ID)
  } catch {
    // sin almacenamiento: no se retomará
  }
}

/** Cuánto va de toda la descarga (0 a 1), o null si no se puede saber. Cada tramo de 120 días vale lo mismo. */
function avance(d: DescargaOut, inicioTramo: number | null): number | null {
  if (d.estado === 'terminada') return 1
  if (inicioTramo === null || d.total_tramo <= 0) return null
  const enElTramo = Math.min(1, Math.max(0, (d.descargados - inicioTramo) / d.total_tramo))
  return (d.tramo - 1 + enElTramo) / d.n_tramos
}

/**
 * Descarga de la NVD en segundo plano con progreso real. Pide el avance cada 1,5 s (una consulta tras otra,
 * nunca dos a la vez), guarda el id para retomarla si se cambia de página y avisa cuando termina.
 * El servidor no cancela descargas: «dejar de seguir» solo deja de preguntar.
 */
export function useDescarga(alTerminar: (resumen: ResumenDatos) => void) {
  const [id, setId] = useState<string | null>(leerId)
  const [descarga, setDescarga] = useState<DescargaOut | null>(null)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const alTerminarRef = useRef(alTerminar)
  useEffect(() => {
    alTerminarRef.current = alTerminar
  })

  useEffect(() => {
    if (!id) return
    const control = new AbortController()
    let temporizador: ReturnType<typeof setTimeout> | undefined
    // Dónde empezó el tramo actual (CVE descargados antes de él), para repartir el avance entre tramos
    let tramoVisto = 0
    let acumuladoVisto = 0
    let inicioTramo: number | null = null

    const consultar = async () => {
      try {
        const d = await api.datos.estadoDescarga(id, control.signal)
        if (control.signal.aborted) return
        if (d.tramo !== tramoVisto) {
          // Si se retoma a mitad de la descarga no se sabe dónde empezó el tramo: avance indeterminado
          inicioTramo = tramoVisto === 0 ? (d.tramo === 1 ? 0 : null) : acumuladoVisto
          tramoVisto = d.tramo
        }
        acumuladoVisto = d.descargados
        setDescarga(d)
        setProgreso(avance(d, inicioTramo))
        setError(null)
        if (d.estado === 'en_curso') {
          temporizador = setTimeout(consultar, INTERVALO_MS)
          return
        }
        guardarId(null)
        setId(null)
        if (d.estado === 'terminada' && d.resumen) alTerminarRef.current(d.resumen)
      } catch (e) {
        if (esCancelacion(e)) return
        if (e instanceof ErrorApi && e.estado === 404) {
          // El servidor no la conoce (se reinició): no hay nada que seguir
          guardarId(null)
          setId(null)
          setDescarga(null)
          setAviso('El servidor ya no recuerda esta descarga (¿se reinició?). Si terminó, usa «Actualizar datos».')
          return
        }
        setError(mensajeDe(e))
        temporizador = setTimeout(consultar, REINTENTO_MS)
      }
    }
    void consultar()

    return () => {
      control.abort()
      clearTimeout(temporizador)
    }
  }, [id])

  const iniciar = useCallback(async (entrada: CargarIn) => {
    setError(null)
    setAviso(null)
    setDescarga(null)
    setProgreso(null)
    try {
      const d = await api.datos.iniciarDescarga(entrada)
      guardarId(d.id)
      setDescarga(d)
      setId(d.id)
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 409
          ? 'Ya hay una descarga en curso en el servidor. Espera a que termine y usa «Actualizar datos».'
          : mensajeDe(e),
      )
    }
  }, [])

  const dejarDeSeguir = useCallback(() => {
    guardarId(null)
    setId(null)
    setDescarga(null)
    setAviso('Dejaste de seguir la descarga, pero el servidor la termina igual. Cuando acabe, usa «Actualizar datos».')
  }, [])

  return { descarga, progreso, error, aviso, activa: id !== null, iniciar, dejarDeSeguir }
}
