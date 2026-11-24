import { CircleAlert, CircleCheck } from 'lucide-react'
import type { CalidadOut } from '@/api/tipos'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { numero } from '@/lib/formato'

/** Lo que va de lo descargado al conjunto de análisis (Ω): cada paso de la limpieza, cuántos CVE quitó y por qué. */
export default function EmbudoLimpieza({ calidad }: { calidad: CalidadOut }) {
  const { conciliacion, pasos, validaciones } = calidad
  const total = conciliacion.descargados
  const ancho = (n: number) => `${total > 0 ? (n / total) * 100 : 0}%`

  return (
    <Card>
      <CardHeader>
        <CardTitle>De lo descargado al conjunto de análisis</CardTitle>
        <CardDescription>
          Los pasos siguen el notebook del proyecto. En cada barra, lo azul son los CVE que siguen y lo rojo, los que se quitaron en ese paso.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <ol className="m-0 grid list-none gap-5 p-0">
          {pasos.map((p) => (
            <li key={p.paso} className="grid gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="flex items-center gap-2 font-medium">
                  <Badge variant="secondary">{p.paso}</Badge>
                  {p.descripcion}
                </span>
                <span className="tabular-nums text-sm">
                  {numero(p.antes)} → {numero(p.despues)}
                  {p.eliminados > 0 ? <span className="ml-2 font-medium text-destructive">−{numero(p.eliminados)}</span> : null}
                </span>
              </div>
              <div
                role="img"
                aria-label={`${numero(p.despues)} de ${numero(total)} siguen; se quitaron ${numero(p.eliminados)}`}
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full bg-primary" style={{ width: ancho(p.despues) }} />
                <div className="h-full bg-destructive" style={{ width: ancho(p.eliminados) }} />
              </div>
              <p className="m-0 text-xs text-muted-foreground">{p.justificacion}</p>
            </li>
          ))}
        </ol>

        <div className="grid gap-2 rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-2 font-medium" aria-live="polite">
            {conciliacion.cuadra ? <CircleCheck aria-hidden="true" className="size-4 text-green-600" /> : <CircleAlert aria-hidden="true" className="size-4 text-destructive" />}
            <span className="tabular-nums">
              {numero(conciliacion.descargados)} descargados − {numero(conciliacion.eliminados)} eliminados = {numero(conciliacion.descargados - conciliacion.eliminados)}
            </span>
            <span className={conciliacion.cuadra ? 'font-normal text-muted-foreground' : 'text-destructive'}>
              {conciliacion.cuadra ? `coincide con N = ${numero(conciliacion.N)}` : `no coincide con N = ${numero(conciliacion.N)}`}
            </span>
          </div>
          <ul className="m-0 grid list-none gap-1 p-0 text-sm">
            {validaciones.map((v) => (
              <li key={v.nombre} className="flex items-start gap-2">
                {v.cumple ? <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-green-600" /> : <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />}
                <span>
                  <span className="font-medium">{v.nombre}.</span> <span className="text-muted-foreground">{v.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
