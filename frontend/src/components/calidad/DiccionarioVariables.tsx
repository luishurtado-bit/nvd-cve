import type { CalidadOut } from '@/api/tipos'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DICCIONARIO } from '@/lib/diccionario'
import { numero } from '@/lib/formato'

const MAX_VALORES_VISIBLES = 5

/** Las 20 variables de cada CVE: qué son, qué valores pueden tomar y, de las categóricas, cuáles aparecen en estos datos. */
export default function DiccionarioVariables({ calidad }: { calidad: CalidadOut }) {
  const dominios = new Map(calidad.dominios.map((d) => [d.columna, d]))

  function enEstosDatos(columna: string): string {
    const d = dominios.get(columna)
    if (!d) return '—'
    const visibles = d.valores.slice(0, MAX_VALORES_VISIBLES).map((v) => `${v.categoria} ${numero(v.conteo)}`)
    const resto = d.valores.length - visibles.length
    return (
      visibles.join(' · ') +
      (resto > 0 ? ` · y ${resto} más` : '') +
      (d.fuera_de_dominio > 0 ? ` (${numero(d.fuera_de_dominio)} fuera de su dominio, ahora nulos)` : '')
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diccionario de las 20 variables</CardTitle>
        <CardDescription>
          Cada fila es un CVE publicado en la NVD. De las variables categóricas se muestran los valores que aparecen en el conjunto cargado, con sus conteos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[32rem] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-right">#</TableHead>
                <TableHead>Variable</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qué es</TableHead>
                <TableHead>Valores posibles</TableHead>
                <TableHead>En estos datos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DICCIONARIO.map((v, i) => (
                <TableRow key={v.columna} className="align-top">
                  <TableCell className="text-right tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{v.nombre}</div>
                    <div className="font-mono text-xs text-muted-foreground">{v.columna}</div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">{v.tipo}</TableCell>
                  <TableCell className="min-w-56 whitespace-normal text-sm">{v.descripcion}</TableCell>
                  <TableCell className="min-w-44 whitespace-normal text-sm text-muted-foreground">{v.valores}</TableCell>
                  <TableCell className="min-w-44 whitespace-normal text-sm tabular-nums text-muted-foreground">{enEstosDatos(v.columna)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
