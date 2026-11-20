import { useState } from 'react'
import { api, ErrorApi } from '@/api/cliente'
import type { CriteriosIn, ReglasOut } from '@/api/tipos'
import Cargando from '@/componentes/Cargando'
import MensajeError from '@/componentes/MensajeError'
import { Campo } from '@/components/campo'
import { DosColumnas } from '@/components/dos-columnas'
import { Formulario } from '@/components/formulario'
import { SelectOpciones } from '@/components/select-opciones'
import { TituloPagina } from '@/components/titulo-pagina'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Evento = ReglasOut['x']
type Vector = NonNullable<CriteriosIn['vector']>
type Privilegios = NonNullable<CriteriosIn['privilegios']>

const eventos: { valor: Evento; texto: string }[] = [
  { valor: 'A', texto: 'A (crítica)' },
  { valor: 'B', texto: 'B (vector de ataque)' },
  { valor: 'C', texto: 'C (privilegios)' },
]

const vectores: { valor: Vector; texto: string }[] = [
  { valor: 'NETWORK', texto: 'Red (NETWORK)' },
  { valor: 'ADJACENT_NETWORK', texto: 'Red adyacente (ADJACENT_NETWORK)' },
  { valor: 'ADJACENT', texto: 'Adyacente (ADJACENT)' },
  { valor: 'LOCAL', texto: 'Local (LOCAL)' },
  { valor: 'PHYSICAL', texto: 'Físico (PHYSICAL)' },
]

const privilegiosOpciones: { valor: Privilegios; texto: string }[] = [
  { valor: 'NONE', texto: 'Ninguno (NONE)' },
  { valor: 'LOW', texto: 'Bajos (LOW)' },
  { valor: 'HIGH', texto: 'Altos (HIGH)' },
]

function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApi) return error.message
  return 'Ocurrió un error inesperado.'
}

const f = (n: number) => n.toFixed(4)

export default function Reglas() {
  const [x, setX] = useState<Evento>('A')
  const [y, setY] = useState<Evento>('B')
  const [umbral, setUmbral] = useState('9')
  const [vector, setVector] = useState<Vector>('NETWORK')
  const [privilegios, setPrivilegios] = useState<Privilegios>('NONE')

  const [resultado, setResultado] = useState<ReglasOut | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function calcular() {
    const valor = Number(umbral)
    if (umbral.trim() === '' || Number.isNaN(valor) || valor < 0 || valor > 10) {
      setError('El umbral debe ser un número entre 0 y 10.')
      return
    }
    if (x === y) {
      setError('Elige dos eventos distintos.')
      return
    }
    setError(null)
    setCargando(true)
    try {
      setResultado(
        await api.reglas({ criterios: { umbral: valor, vector, privilegios }, x, y }),
      )
    } catch (e: unknown) {
      setResultado(null)
      setError(mensajeDe(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <section>
      <TituloPagina className="mb-6">Reglas de probabilidad</TituloPagina>

      <Alert variant="warning" role="note" className="mb-6">
        <AlertTitle>Ojo</AlertTitle>
        <AlertDescription>
          A y B pueden ser dependientes, porque la puntuación CVSS y el vector de ataque están
          relacionados. No se asume independencia: se comprueba comparando P(X ∩ Y) con
          P(X)·P(Y).
        </AlertDescription>
      </Alert>

      <DosColumnas
        formulario={
          <Card>
            <CardHeader>
              <CardTitle>Eventos y criterios</CardTitle>
            </CardHeader>
            <CardContent>
              <Formulario
                onSubmit={(e) => {
                  e.preventDefault()
                  void calcular()
                }}
              >
                <Campo etiqueta="Evento X" htmlFor="evento-x">
                  <SelectOpciones id="evento-x" opciones={eventos} valor={x} onCambio={setX} />
                </Campo>
                <Campo etiqueta="Evento Y" htmlFor="evento-y">
                  <SelectOpciones id="evento-y" opciones={eventos} valor={y} onCambio={setY} />
                </Campo>
                <Campo etiqueta="Umbral de criticidad (A)" htmlFor="umbral">
                  <Input
                    id="umbral"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={umbral}
                    onChange={(e) => setUmbral(e.target.value)}
                  />
                </Campo>
                <Campo etiqueta="Vector de ataque (B)" htmlFor="vector">
                  <SelectOpciones
                    id="vector"
                    opciones={vectores}
                    valor={vector}
                    onCambio={setVector}
                  />
                </Campo>
                <Campo etiqueta="Privilegios (C)" htmlFor="privilegios">
                  <SelectOpciones
                    id="privilegios"
                    opciones={privilegiosOpciones}
                    valor={privilegios}
                    onCambio={setPrivilegios}
                  />
                </Campo>
                <Button type="submit" className="w-full" disabled={cargando}>
                  Calcular reglas
                </Button>
              </Formulario>
            </CardContent>
          </Card>
        }
        resultados={
          <>
            {!resultado && !cargando && !error && (
              <p className="text-sm text-muted-foreground">
                Los resultados aparecerán aquí al pulsar «Calcular reglas».
              </p>
            )}
            {cargando && <Cargando texto="Calculando…" />}
            {error && <MensajeError mensaje={error} />}

            {resultado && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Resultados para {resultado.x} y {resultado.y}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Regla</TableHead>
                          <TableHead>Fórmula</TableHead>
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Complemento de {resultado.x}</TableCell>
                          <TableCell className="whitespace-normal">
                            P({resultado.x}ᶜ) = 1 − P({resultado.x}) = 1 − {f(resultado.p_x)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {f(resultado.p_x_complemento)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Complemento de {resultado.y}</TableCell>
                          <TableCell className="whitespace-normal">
                            P({resultado.y}ᶜ) = 1 − P({resultado.y}) = 1 − {f(resultado.p_y)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {f(resultado.p_y_complemento)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Intersección</TableCell>
                          <TableCell className="whitespace-normal">
                            P({resultado.x} ∩ {resultado.y})
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {f(resultado.p_interseccion)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Unión</TableCell>
                          <TableCell className="whitespace-normal">
                            P({resultado.x}) + P({resultado.y}) − P({resultado.x} ∩{' '}
                            {resultado.y}) = {f(resultado.p_x)} + {f(resultado.p_y)} −{' '}
                            {f(resultado.p_interseccion)}
                          </TableCell>
                          <TableCell className="tabular-nums">{f(resultado.p_union)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>¿Son independientes?</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="m-0">
                      Si fueran independientes, P({resultado.x} ∩ {resultado.y}) sería igual a
                      P({resultado.x})·P({resultado.y}).
                    </p>
                    <ul className="m-0 grid list-disc gap-1 pl-5">
                      <li>
                        P({resultado.x} ∩ {resultado.y}) = {f(resultado.p_interseccion)}
                      </li>
                      <li>
                        P({resultado.x})·P({resultado.y}) = {f(resultado.producto)}
                      </li>
                    </ul>
                    <p className="m-0 font-semibold">
                      {resultado.independientes
                        ? `Los valores coinciden: ${resultado.x} y ${resultado.y} resultan independientes.`
                        : `Los valores son distintos: ${resultado.x} y ${resultado.y} son dependientes.`}
                    </p>
                    {resultado.nota && (
                      <p className="m-0 text-muted-foreground">{resultado.nota}</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        }
      />
    </section>
  )
}
