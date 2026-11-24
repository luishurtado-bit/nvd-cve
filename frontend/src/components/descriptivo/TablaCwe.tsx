import { useState } from 'react'
import { Download } from 'lucide-react'
import { api } from '@/api/cliente'
import { SelectOpciones } from '@/components/select-opciones'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDatos } from '@/contexto/datos'
import { useFiltros } from '@/contexto/filtros'
import { useConsulta } from '@/hooks/use-consulta'
import { descargarCsv } from '@/lib/csv'
import { numero, porcentaje } from '@/lib/formato'
import { PREGUNTAS } from '@/lib/preguntas'

const CUANTAS = [
  { valor: '10', texto: 'Las 10 primeras' },
  { valor: '20', texto: 'Las 20 primeras' },
  { valor: '50', texto: 'Las 50 primeras' },
]

/** Solo los «CWE-n» tienen página en MITRE; «NVD-CWE-noinfo» y «NVD-CWE-Other» son categorías de la NVD. */
function enlaceCwe(cwe: string): string | null {
  const m = /^CWE-(\d+)$/.exec(cwe)
  return m ? `https://cwe.mitre.org/data/definitions/${m[1]}.html` : null
}

interface Props {
  /** CVE que cumplen los filtros, para contar cuántos no traen CWE. */
  totalCve?: number
  className?: string
}

/** Las debilidades de software (CWE) más frecuentes (P4). Responde a los filtros globales. */
export default function TablaCwe({ totalCve, className }: Props) {
  const { version } = useDatos()
  const { filtros } = useFiltros()
  const [cuantas, setCuantas] = useState('10')
  const consulta = useConsulta((signal) => api.dashboard.cwe(filtros, { top: Number(cuantas), signal }), [cuantas, filtros, version], {
    retardo: 300,
  })
  const datos = consulta.datos
  const categorias = datos?.categorias ?? []
  const sinCwe = datos && totalCve !== undefined ? Math.max(0, totalCve - datos.total) : undefined

  function guardarCsv() {
    descargarCsv('debilidades_cwe', ['CWE', 'CVE', '% de los CVE con CWE'], categorias.map((c) => [c.categoria, c.conteo, Number((c.proporcion * 100).toFixed(2))]))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Debilidades (CWE) más frecuentes</CardTitle>
        <CardDescription className="col-span-2 flex items-start gap-2">
          <Badge variant="secondary">P4</Badge>
          <span>{PREGUNTAS.P4}</span>
        </CardDescription>
        <CardAction className="row-span-1 flex items-center gap-2">
          <label htmlFor="cwe-cuantas" className="sr-only">
            Cuántas debilidades mostrar
          </label>
          <div className="w-40">
            <SelectOpciones id="cwe-cuantas" opciones={CUANTAS} valor={cuantas} onCambio={setCuantas} />
          </div>
          {categorias.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={guardarCsv} aria-label="Guardar las debilidades como CSV">
              <Download aria-hidden="true" /> CSV
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent>
        {consulta.error ? (
          <Alert variant="destructive">
            <AlertDescription>{consulta.error}</AlertDescription>
          </Alert>
        ) : !datos ? (
          <Skeleton className="h-72 w-full" />
        ) : categorias.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No hay CVE con CWE en el periodo.
          </div>
        ) : (
          <>
            <div className="max-h-96 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-right">#</TableHead>
                    <TableHead>CWE</TableHead>
                    <TableHead className="text-right">CVE</TableHead>
                    <TableHead className="text-right">% de los CVE con CWE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorias.map((c, i) => {
                    const enlace = enlaceCwe(c.categoria)
                    return (
                      <TableRow key={c.categoria}>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          {enlace ? (
                            <a href={enlace} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                              {c.categoria}
                            </a>
                          ) : (
                            c.categoria
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{numero(c.conteo)}</TableCell>
                        <TableCell className="text-right tabular-nums">{porcentaje(c.proporcion)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 mb-0 text-xs text-muted-foreground">
              Un CWE es el tipo de debilidad que originó la vulnerabilidad (por ejemplo, CWE-79).
              {sinCwe !== undefined ? ` ${numero(sinCwe)} CVE no traen CWE y no entran en la tabla.` : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
