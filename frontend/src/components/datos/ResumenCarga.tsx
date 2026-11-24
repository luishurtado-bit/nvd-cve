import { Link } from 'react-router-dom'
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import type { Origen } from '@/api/tipos'
import TarjetaKpi from '@/components/comunes/TarjetaKpi'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDatos } from '@/contexto/datos'
import { fechaHora, numero, periodo, porcentaje } from '@/lib/formato'

const NOMBRE_ORIGEN: Record<Origen, string> = { simulado: 'Datos simulados', api: 'NVD (API)', csv: 'Archivo CSV' }

/** Qué se descargó, qué se quitó y por qué: todos los conteos de la limpieza, con la cuenta que debe cuadrar. */
export default function ResumenCarga() {
  const { resumen, cargando } = useDatos()
  if (!resumen) return cargando ? <Skeleton className="h-64 w-full" /> : null

  const fuera = resumen.rechazados + resumen.duplicados + resumen.sin_puntuacion + resumen.formato_invalido
  const cuadra = resumen.descargados - fuera === resumen.N

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conjunto cargado</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge variant="secondary">{NOMBRE_ORIGEN[resumen.origen]}</Badge>
          <span>Periodo: {periodo(resumen.periodo)}</span>
          {resumen.fecha_consulta ? <span>Consultado el {fechaHora(resumen.fecha_consulta)}</span> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {resumen.origen === 'simulado' ? (
          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>Son datos simulados</AlertTitle>
            <AlertDescription>
              No vienen de la NVD: sirven para probar la aplicación. Descarga un periodo o sube un CSV para trabajar con datos reales.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <TarjetaKpi etiqueta="Descargados" valor={numero(resumen.descargados)} detalle="filas que llegaron" />
          <TarjetaKpi etiqueta="Rechazados" valor={numero(resumen.rechazados)} detalle="anulados (Rejected)" />
          <TarjetaKpi etiqueta="Repetidos" valor={numero(resumen.duplicados)} detalle="mismo identificador" />
          <TarjetaKpi etiqueta="Sin puntuación" valor={numero(resumen.sin_puntuacion)} detalle="sin CVSS" />
          <TarjetaKpi etiqueta="Formato inválido" valor={numero(resumen.formato_invalido)} detalle="puntuación no válida" />
          <TarjetaKpi
            etiqueta="Quedan (N)"
            valor={numero(resumen.N)}
            detalle={resumen.descargados > 0 ? `${porcentaje(resumen.N / resumen.descargados)} de lo descargado` : undefined}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
          {cuadra ? <CircleCheck aria-hidden="true" className="size-4 text-green-600" /> : <CircleAlert aria-hidden="true" className="size-4 text-destructive" />}
          <span className="tabular-nums">
            {numero(resumen.descargados)} − {numero(resumen.rechazados)} − {numero(resumen.duplicados)} − {numero(resumen.sin_puntuacion)} −{' '}
            {numero(resumen.formato_invalido)} = {numero(resumen.descargados - fuera)}
          </span>
          <span className={cuadra ? 'text-muted-foreground' : 'font-medium text-destructive'}>
            {cuadra ? `coincide con N = ${numero(resumen.N)}` : `no coincide con N = ${numero(resumen.N)}`}
          </span>
        </div>

        <p className="m-0 text-sm">
          <Link to="/datos?pestana=calidad" className="underline underline-offset-2">
            Ver el reporte de calidad paso a paso →
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
