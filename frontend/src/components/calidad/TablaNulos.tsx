import type { CalidadOut } from '@/api/tipos'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { nombreDe, variableDe } from '@/lib/diccionario'
import { numero, porcentaje } from '@/lib/formato'
import { cn } from '@/lib/utils'

function explicacion(antes: number, despues: number, columna: string): string {
  if (antes === 0 && despues === 0) return 'Sin nulos.'
  if (despues === 0) return 'Eran los CVE rechazados o sin puntuación: ya no están.'
  return variableDe(columna)?.nulos ?? ''
}

/** Valores nulos de cada variable en lo descargado y en el conjunto de análisis. Algunos se conservan a propósito. */
export default function TablaNulos({ calidad }: { calidad: CalidadOut }) {
  const { descargados, N } = calidad.conciliacion
  return (
    <Card>
      <CardHeader>
        <CardTitle>Valores nulos antes y después</CardTitle>
        <CardDescription>
          Se quitan los CVE sin puntuación; los demás nulos se conservan, porque no cambian los eventos que se estudian.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[28rem] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variable</TableHead>
                <TableHead className="text-right">Al descargar</TableHead>
                <TableHead className="text-right">En el conjunto</TableHead>
                <TableHead>Qué pasó</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calidad.nulos.map((n) => (
                <TableRow key={n.columna} className={cn(n.despues > 0 && 'bg-muted/40')}>
                  <TableCell>
                    <div className="font-medium">{nombreDe(n.columna)}</div>
                    <div className="font-mono text-xs text-muted-foreground">{n.columna}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {numero(n.antes)}
                    <div className="text-xs text-muted-foreground">{porcentaje(descargados ? n.antes / descargados : null)}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {numero(n.despues)}
                    <div className="text-xs text-muted-foreground">{porcentaje(N ? n.despues / N : null)}</div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm text-muted-foreground">{explicacion(n.antes, n.despues, n.columna)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
