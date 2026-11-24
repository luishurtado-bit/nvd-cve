import { Download } from 'lucide-react'
import type { ResumenNumericoOut } from '@/api/tipos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { descargarCsv } from '@/lib/csv'
import { numero } from '@/lib/formato'

const NOMBRES: Record<string, string> = {
  base_score: 'Puntuación CVSS (0 a 10)',
  n_referencias: 'Referencias por CVE',
}

const COLUMNAS = ['Variable', 'n', 'Mínimo', 'Q1', 'Mediana', 'Q3', 'Máximo', 'Media', 'Desv. estándar', 'Asimetría']

function fila(r: ResumenNumericoOut): (string | number | null)[] {
  return [NOMBRES[r.variable] ?? r.variable, r.n, r.minimo, r.q1, r.mediana, r.q3, r.maximo, r.media, r.desviacion, r.asimetria]
}

interface Props {
  datos: ResumenNumericoOut[] | undefined
  cargando?: boolean
  error?: string | null
  className?: string
}

/** Mínimo, cuartiles, máximo, media, desviación y asimetría de las variables numéricas. */
export default function TablaResumenNumerico({ datos, cargando, error, className }: Props) {
  function guardarCsv() {
    // Sin los decimales de sobra de la división: 4 bastan
    if (datos) descargarCsv('resumen_numerico', COLUMNAS, datos.map((r) => fila(r).map((c) => (typeof c === 'number' ? Number(c.toFixed(4)) : c))))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Resumen numérico</CardTitle>
        <CardDescription className="col-span-2">
          Q1 y Q3 son el primer y el tercer cuartil. Una asimetría mayor que 0 indica cola larga hacia los valores altos; menor
          que 0, hacia los bajos.
        </CardDescription>
        {datos?.length ? (
          <CardAction className="row-span-1">
            <Button type="button" variant="outline" size="sm" onClick={guardarCsv} aria-label="Guardar el resumen numérico como CSV">
              <Download aria-hidden="true" /> CSV
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : cargando || !datos ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNAS.map((c, i) => (
                    <TableHead key={c} className={i === 0 ? '' : 'text-right'}>
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.map((r) => (
                  <TableRow key={r.variable}>
                    {fila(r).map((celda, i) => (
                      <TableCell key={COLUMNAS[i]} className={i === 0 ? 'font-medium' : 'text-right tabular-nums'}>
                        {typeof celda === 'string' ? celda : numero(celda, i === 1 ? 0 : 2)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
