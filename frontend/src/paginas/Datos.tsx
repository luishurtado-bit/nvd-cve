import { useState } from 'react'
import { toast } from 'sonner'
import { CargaDatos } from '@/components/CargaDatos'
import { DashboardDescriptivo } from '@/components/DashboardDescriptivo'

// Front B: carga de datos (API de la NVD o CSV) y dashboard descriptivo.
// Al cargar datos nuevos, el dashboard se vuelve a consultar.
// Las notificaciones salen por el <Toaster /> montado en el Layout.
export default function Datos() {
  const [versionDatos, setVersionDatos] = useState(0)

  return (
    <>
      <CargaDatos
        onDatosActualizados={() => setVersionDatos((v) => v + 1)}
        onNotificar={(mensaje) => toast(mensaje)}
      />
      <DashboardDescriptivo recargarTrigger={versionDatos} onNotificar={(mensaje) => toast(mensaje)} />
    </>
  )
}
