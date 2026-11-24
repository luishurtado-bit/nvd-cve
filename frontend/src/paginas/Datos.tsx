import { toast } from 'sonner'
import { CargaDatos } from '@/components/CargaDatos'

// Carga de datos (API de la NVD o CSV). Las notificaciones salen por el <Toaster /> montado en el Layout.
export default function Datos() {
  return <CargaDatos onNotificar={(mensaje) => toast(mensaje)} />
}
