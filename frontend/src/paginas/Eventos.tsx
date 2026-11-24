import { useState } from 'react'
import { api } from '@/api/cliente'
import type { EventosOut, Privilegios, Vector } from '@/api/tipos'
import { useDatos } from '@/contexto/datos'
import { leerUmbral, MENSAJE_UMBRAL, mensajeDe, PRIVILEGIOS, VECTORES } from '@/lib/dominio'
import Cargando from '@/components/comunes/Cargando'
import MensajeError from '@/components/comunes/MensajeError'
import { Campo } from '@/components/campo'
import { DosColumnas } from '@/components/dos-columnas'
import { Formulario } from '@/components/formulario'
import { SelectOpciones } from '@/components/select-opciones'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'


const filas: { clave: keyof EventosOut['eventos']; evento: string }[] = [
  { clave: 'A', evento: 'A: crítica (baseScore ≥ umbral)' },
  { clave: 'B', evento: 'B: vector de ataque elegido' },
  { clave: 'C', evento: 'C: privilegios elegidos' },
  { clave: 'AB', evento: 'A ∩ B' },
  { clave: 'AC', evento: 'A ∩ C' },
  { clave: 'BC', evento: 'B ∩ C' },
  { clave: 'ABC', evento: 'A ∩ B ∩ C' },
]

export default function Eventos() {
  const { resumen, error: errorResumen } = useDatos()

  const [umbral, setUmbral] = useState('9')
  const [vector, setVector] = useState<Vector>('NETWORK')
  const [privilegios, setPrivilegios] = useState<Privilegios>('NONE')

  const [resultado, setResultado] = useState<EventosOut | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function calcular() {
    const valor = leerUmbral(umbral)
    if (valor === null) {
      setError(MENSAJE_UMBRAL)
      return
    }
    setError(null)
    setCargando(true)
    try {
      setResultado(await api.eventos({ umbral: valor, vector, privilegios }))
    } catch (e: unknown) {
      setResultado(null)
      setError(mensajeDe(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <section>
      <DosColumnas
        formulario={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Resumen de los datos</CardTitle>
              </CardHeader>
              <CardContent>
                {errorResumen && <MensajeError mensaje={errorResumen} />}
                {!resumen && !errorResumen && <Cargando />}
                {resumen && (
                  <dl className="m-0 grid gap-1.5">
                    <FilaResumen
                      etiqueta="Periodo"
                      valor={
                        resumen.periodo.inicio && resumen.periodo.fin
                          ? `${resumen.periodo.inicio} a ${resumen.periodo.fin}`
                          : 'sin fijar'
                      }
                    />
                    <FilaResumen etiqueta="CVE descargados" valor={resumen.descargados} />
                    <FilaResumen etiqueta="Rechazados (Rejected)" valor={resumen.rechazados} />
                    <FilaResumen etiqueta="Sin puntuación CVSS" valor={resumen.sin_puntuacion} />
                    <FilaResumen etiqueta="N (espacio muestral Ω)" valor={resumen.N} destacado />
                  </dl>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Definición de los eventos</CardTitle>
              </CardHeader>
              <CardContent>
                <Formulario
                  onSubmit={(e) => {
                    e.preventDefault()
                    void calcular()
                  }}
                >
                  <Campo etiqueta="Umbral de criticidad (A: baseScore ≥ umbral)" htmlFor="umbral">
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
                    <SelectOpciones id="vector" opciones={VECTORES} valor={vector} onCambio={setVector} />
                  </Campo>
                  <Campo etiqueta="Privilegios requeridos (C)" htmlFor="privilegios">
                    <SelectOpciones
                      id="privilegios"
                      opciones={PRIVILEGIOS}
                      valor={privilegios}
                      onCambio={setPrivilegios}
                    />
                  </Campo>
                  <Button type="submit" className="w-full" disabled={cargando}>
                    Calcular eventos
                  </Button>
                </Formulario>
              </CardContent>
            </Card>
          </>
        }
        resultados={
          <>
            {!resultado && !cargando && !error && (
              <p className="text-sm text-muted-foreground">
                Los resultados aparecerán aquí al pulsar «Calcular eventos».
              </p>
            )}
            {cargando && <Cargando texto="Calculando…" />}
            {error && <MensajeError mensaje={error} />}

            {resultado && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados (N = {resultado.N})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Conteo</TableHead>
                        <TableHead>Probabilidad</TableHead>
                        <TableHead>Porcentaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filas.map((f) => {
                        const dato = resultado.eventos[f.clave]
                        return (
                          <TableRow key={f.clave}>
                            <TableCell>{f.evento}</TableCell>
                            <TableCell className="tabular-nums">{dato.conteo}</TableCell>
                            <TableCell className="tabular-nums">{dato.probabilidad.toFixed(4)}</TableCell>
                            <TableCell className="tabular-nums">
                              {(dato.probabilidad * 100).toFixed(2)} %
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        }
      />
    </section>
  )
}

function FilaResumen({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string
  valor: string | number
  destacado?: boolean
}) {
  return (
    <div className={`flex justify-between gap-4 ${destacado ? 'font-semibold' : ''}`}>
      <dt className={destacado ? '' : 'text-muted-foreground'}>{etiqueta}</dt>
      <dd className="m-0 tabular-nums">{valor}</dd>
    </div>
  )
}
