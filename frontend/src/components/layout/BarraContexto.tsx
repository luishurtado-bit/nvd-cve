import { TriangleAlert } from 'lucide-react'
import type { Origen } from '@/api/tipos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useDatos } from '@/contexto/datos'
import { fechaHora, numero, periodo } from '@/lib/formato'

const NOMBRE_ORIGEN: Record<Origen, string> = {
  simulado: 'Datos simulados',
  api: 'NVD (API)',
  csv: 'Archivo CSV',
}

/**
 * Franja bajo la barra superior que dice con qué datos se está trabajando: de dónde vienen, qué
 * periodo cubren, cuántos CVE son y cuándo se consultaron. Con datos simulados avisa con un
 * cuadro amarillo, para que nadie tome por reales unas cifras de ejemplo.
 */
export default function BarraContexto() {
  const { resumen, cargando, error } = useDatos()

  if (!resumen) {
    if (error) {
      return (
        <Alert variant="destructive" role="status" className="rounded-none border-x-0">
          <AlertDescription>No se pudo leer el estado de los datos: {error}</AlertDescription>
        </Alert>
      )
    }
    return (
      <div role="status" className="border-b px-4 py-2 text-sm text-muted-foreground">
        {cargando ? 'Consultando los datos cargados…' : null}
      </div>
    )
  }

  if (resumen.origen === 'simulado') {
    return (
      <Alert variant="warning" role="status" className="rounded-none border-x-0">
        <TriangleAlert />
        <AlertTitle>Estás viendo datos simulados</AlertTitle>
        <AlertDescription>
          Son {numero(resumen.N)} CVE de ejemplo, no vienen de la NVD. Para trabajar con datos reales,
          descarga un periodo en «Datos y calidad».
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="border-b bg-muted/40 px-4 py-2 text-sm">
      <dl className="m-0 flex flex-wrap items-center gap-x-6 gap-y-1">
        <Dato etiqueta="Origen">
          <Badge variant="secondary">{NOMBRE_ORIGEN[resumen.origen]}</Badge>
        </Dato>
        <Dato etiqueta="Periodo">{periodo(resumen.periodo)}</Dato>
        <Dato etiqueta="CVE">{numero(resumen.N)}</Dato>
        {resumen.fecha_consulta ? (
          <Dato etiqueta="Consultado el">{fechaHora(resumen.fecha_consulta)}</Dato>
        ) : null}
      </dl>
    </div>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="m-0 font-medium tabular-nums">{children}</dd>
    </div>
  )
}
