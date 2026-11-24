import type { CalidadOut } from '@/api/tipos'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { numero } from '@/lib/formato'

const NOMBRES: Record<string, string> = {
  n_referencias: 'Referencias por CVE',
  cve_por_dia: 'CVE publicados por día',
}

/** Valores inusuales de dos variables (método IQR). Se marcan para informarlos, pero no se eliminan. */
export default function TablaAtipicos({ calidad }: { calidad: CalidadOut }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Valores atípicos</CardTitle>
        <CardDescription>
          Un valor es atípico si queda fuera de [Q1 − 1,5·IQR, Q3 + 1,5·IQR], donde IQR = Q3 − Q1. Son datos reales: se marcan, no se quitan,
          porque quitarlos sesgaría las proporciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variable</TableHead>
                <TableHead className="text-right">Q1</TableHead>
                <TableHead className="text-right">Q3</TableHead>
                <TableHead className="text-right">Límite inferior</TableHead>
                <TableHead className="text-right">Límite superior</TableHead>
                <TableHead className="text-right">Atípicos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calidad.atipicos.map((a) => (
                <TableRow key={a.variable}>
                  <TableCell className="font-medium">{NOMBRES[a.variable] ?? a.variable}</TableCell>
                  <TableCell className="text-right tabular-nums">{numero(a.q1, 1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{numero(a.q3, 1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{numero(a.limite_inferior, 1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{numero(a.limite_superior, 1)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{numero(a.cantidad)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="m-0 grid gap-1 pl-5 text-sm text-muted-foreground">
          {calidad.atipicos.map((a) => (
            <li key={a.variable}>
              <span className="font-medium text-foreground">{NOMBRES[a.variable] ?? a.variable}:</span> {a.nota}.
            </li>
          ))}
          <li>
            <span className="font-medium text-foreground">Puntuación base:</span> va de 0 a 10, así que no puede tener atípicos por definición.
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}
