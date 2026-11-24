import { useRef, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import Leyenda, { type ItemLeyenda } from '@/components/comunes/Leyenda'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDatos } from '@/contexto/datos'
import { descargarCsv, type CeldaCsv } from '@/lib/csv'
import { textoFuente } from '@/lib/fuente'
import { numero, porcentaje } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'
import { PREGUNTAS, type ClavePregunta } from '@/lib/preguntas'
import { cn } from '@/lib/utils'
import { descargarPng } from '@/utils/exportarPng'

/** `porcentaje` recibe la proporción (0 a 1): en pantalla sale «8,7 %» y en el CSV, 8.7. */
export interface ColumnaTabla {
  titulo: string
  tipo?: 'texto' | 'entero' | 'decimal' | 'porcentaje'
}

export interface TablaDatos {
  columnas: ColumnaTabla[]
  filas: (string | number | null)[][]
}

function mostrar(celda: string | number | null, tipo: ColumnaTabla['tipo']): string {
  if (celda === null) return '—'
  if (typeof celda === 'string') return celda
  if (tipo === 'porcentaje') return porcentaje(celda)
  if (tipo === 'decimal') return numero(celda, 2)
  return numero(celda)
}

function paraCsv(celda: string | number | null, tipo: ColumnaTabla['tipo']): CeldaCsv {
  if (typeof celda === 'number' && tipo === 'porcentaje') return Number((celda * 100).toFixed(2))
  return celda
}

interface Props {
  titulo: string
  /** La pregunta de análisis (P1 a P4) a la que responde el gráfico. */
  pregunta?: ClavePregunta
  /** Reemplaza el texto de la pregunta. */
  subtitulo?: string
  /** Descripción en texto del gráfico, para lectores de pantalla. */
  descripcion: string
  /** Los datos del gráfico: alimenta «Ver tabla de datos» y el botón CSV. */
  tabla?: TablaDatos
  leyenda?: ItemLeyenda[]
  nombreArchivo: string
  /** Primera carga: se muestra un esqueleto en lugar del gráfico. */
  cargando?: boolean
  error?: string | null
  vacio?: boolean
  mensajeVacio?: string
  /** Controles sobre el gráfico (por ejemplo, un selector); se ven siempre, aunque el gráfico esté cargando. */
  controles?: ReactNode
  /** Alto del gráfico en píxeles. */
  altura?: number
  className?: string
  children: ReactNode
}

/**
 * Marco de un gráfico del dashboard: título, la pregunta que responde, botones para guardarlo
 * (PNG con título, leyenda y fuente; CSV con sus datos) y, para quien no ve el gráfico, su
 * descripción y una tabla con los mismos datos.
 */
export default function TarjetaGrafica({
  titulo,
  pregunta,
  subtitulo,
  descripcion,
  tabla,
  leyenda,
  nombreArchivo,
  cargando,
  error,
  vacio,
  mensajeVacio = 'No hay datos para mostrar.',
  controles,
  altura = 280,
  className,
  children,
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const { resumen } = useDatos()
  const paleta = usePaleta()
  const textoPregunta = subtitulo ?? (pregunta ? PREGUNTAS[pregunta] : undefined)
  const hayGrafico = !cargando && !error && !vacio

  function guardarPng() {
    if (!contenedor.current) return
    descargarPng(contenedor.current, nombreArchivo, {
      titulo,
      subtitulo: textoPregunta ? `${pregunta ? `${pregunta}: ` : ''}${textoPregunta}` : undefined,
      leyenda,
      fuente: textoFuente(resumen),
      fondo: paleta.fondo,
      texto: paleta.texto,
      textoSuave: paleta.textoSuave,
    })
  }

  function guardarCsv() {
    if (!tabla) return
    const tipos = tabla.columnas.map((c) => c.tipo)
    descargarCsv(
      nombreArchivo,
      // Si el título ya dice «%», no se repite
      tabla.columnas.map((c) => (c.tipo === 'porcentaje' && !c.titulo.includes('%') ? `${c.titulo} (%)` : c.titulo)),
      tabla.filas.map((fila) => fila.map((celda, i) => paraCsv(celda, tipos[i]))),
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        {textoPregunta ? (
          <CardDescription className="col-span-2 flex items-start gap-2">
            {pregunta ? <Badge variant="secondary">{pregunta}</Badge> : null}
            <span>{textoPregunta}</span>
          </CardDescription>
        ) : null}
        {hayGrafico ? (
          <CardAction className="row-span-1 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={guardarPng} aria-label={`Guardar «${titulo}» como imagen PNG`}>
              <Download aria-hidden="true" /> PNG
            </Button>
            {tabla ? (
              <Button type="button" variant="outline" size="sm" onClick={guardarCsv} aria-label={`Guardar los datos de «${titulo}» como CSV`}>
                <Download aria-hidden="true" /> CSV
              </Button>
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent>
        {controles ? <div className="mb-3">{controles}</div> : null}
        {cargando ? <Skeleton className="w-full" style={{ height: altura }} /> : null}
        {!cargando && error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {!cargando && !error && vacio ? (
          <div
            className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
            style={{ height: altura }}
          >
            {mensajeVacio}
          </div>
        ) : null}

        {hayGrafico ? (
          <>
            <div ref={contenedor} role="img" aria-label={descripcion} className="w-full" style={{ height: altura }}>
              {children}
            </div>
            {leyenda?.length ? <Leyenda items={leyenda} /> : null}
            {tabla ? (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer select-none font-medium">Ver tabla de datos</summary>
                <div className="mt-2 max-h-72 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tabla.columnas.map((c) => (
                          <TableHead key={c.titulo} className={cn(c.tipo && c.tipo !== 'texto' && 'text-right')}>
                            {c.titulo}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabla.filas.map((fila, i) => (
                        <TableRow key={i}>
                          {fila.map((celda, j) => (
                            <TableCell key={j} className={cn(tabla.columnas[j]?.tipo !== 'texto' && tabla.columnas[j]?.tipo && 'text-right tabular-nums')}>
                              {mostrar(celda, tabla.columnas[j]?.tipo)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
