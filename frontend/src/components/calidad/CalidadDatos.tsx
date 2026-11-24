import { TriangleAlert } from 'lucide-react'
import { api } from '@/api/cliente'
import MensajeError from '@/components/comunes/MensajeError'
import DescargasDatos from '@/components/calidad/DescargasDatos'
import DiccionarioVariables from '@/components/calidad/DiccionarioVariables'
import EmbudoLimpieza from '@/components/calidad/EmbudoLimpieza'
import TablaAtipicos from '@/components/calidad/TablaAtipicos'
import TablaNulos from '@/components/calidad/TablaNulos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useDatos } from '@/contexto/datos'
import { useConsulta } from '@/hooks/use-consulta'

/** Reporte de calidad del conjunto cargado: qué se limpió y por qué, nulos, atípicos, variables y descarga de las bases. */
export default function CalidadDatos() {
  const { version } = useDatos()
  const consulta = useConsulta((signal) => api.datos.calidad(signal), [version])
  const calidad = consulta.datos

  if (consulta.error && !calidad) return <MensajeError mensaje={consulta.error} />
  if (!calidad) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {calidad.resumen.origen === 'simulado' ? (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>Este reporte es de datos simulados</AlertTitle>
          <AlertDescription>Descarga un periodo de la NVD o sube un CSV para ver la limpieza de datos reales.</AlertDescription>
        </Alert>
      ) : null}
      <EmbudoLimpieza calidad={calidad} />
      <DescargasDatos />
      <TablaNulos calidad={calidad} />
      <TablaAtipicos calidad={calidad} />
      <DiccionarioVariables calidad={calidad} />
    </div>
  )
}
