import { useEffect, useRef, useState } from 'react'
import { CargaDatos } from '../components/CargaDatos'
import { DashboardDescriptivo } from '../components/DashboardDescriptivo'

// Front B: carga de datos (API de la NVD o CSV) y dashboard descriptivo.
// Al cargar datos nuevos, el dashboard se vuelve a consultar.
export default function Datos() {
  const [versionDatos, setVersionDatos] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const temporizador = useRef<number | undefined>(undefined)

  const mostrarNotificacion = (mensaje: string) => {
    setToast(mensaje)
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  return (
    <>
      {toast && (
        <div className="toast-flotante" role="status">
          {toast}
        </div>
      )}
      <CargaDatos
        onDatosActualizados={() => setVersionDatos((v) => v + 1)}
        onNotificar={mostrarNotificacion}
      />
      <DashboardDescriptivo recargarTrigger={versionDatos} onNotificar={mostrarNotificacion} />
    </>
  )
}
