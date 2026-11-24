import { useState } from 'react'
import { api } from '@/api/cliente'
import type { BinomialIn, BinomialOut, Privilegios, Vector } from '@/api/tipos'
import { leerUmbral, MENSAJE_UMBRAL, mensajeDe, PRIVILEGIOS, VECTORES } from '@/lib/dominio'
import Cargando from '@/components/comunes/Cargando'
import GraficoPmf from '@/components/graficos/GraficoPmf'
import MensajeError from '@/components/comunes/MensajeError'
import { Campo } from '@/components/campo'
import { DosColumnas } from '@/components/dos-columnas'
import { Formulario } from '@/components/formulario'
import { SelectOpciones } from '@/components/select-opciones'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'


const f = (n: number) => n.toFixed(4)

export default function Binomial() {
  const [n, setN] = useState('20')
  const [k, setK] = useState('3')
  const [p, setP] = useState('')
  const [confianza, setConfianza] = useState('')
  const [umbral, setUmbral] = useState('9')
  const [vector, setVector] = useState<Vector>('NETWORK')
  const [privilegios, setPrivilegios] = useState<Privilegios>('NONE')

  const [resultado, setResultado] = useState<BinomialOut | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function calcular() {
    const valorN = Number(n)
    const valorK = Number(k)
    if (n.trim() === '' || !Number.isInteger(valorN) || valorN <= 0) {
      setError('n debe ser un entero mayor que 0.')
      return
    }
    if (k.trim() === '' || !Number.isInteger(valorK) || valorK < 0) {
      setError('k debe ser un entero mayor o igual que 0.')
      return
    }
    if (valorK > valorN) {
      setError('k no puede ser mayor que n.')
      return
    }
    const valorUmbral = leerUmbral(umbral)
    if (valorUmbral === null) {
      setError(MENSAJE_UMBRAL)
      return
    }
    const entrada: BinomialIn = {
      n: valorN,
      k: valorK,
      umbral: valorUmbral,
    }
    if (p.trim() !== '') {
      const valorP = Number(p)
      if (Number.isNaN(valorP) || valorP < 0 || valorP > 1) {
        setError('p debe ser un número entre 0 y 1.')
        return
      }
      entrada.p = valorP
    }
    if (confianza.trim() !== '') {
      const valorC = Number(confianza)
      if (Number.isNaN(valorC) || valorC <= 0 || valorC >= 1) {
        setError('La confianza debe ser un número mayor que 0 y menor que 1.')
        return
      }
      entrada.confianza = valorC
    }
    setError(null)
    setCargando(true)
    try {
      setResultado(await api.binomial(entrada))
    } catch (e: unknown) {
      setResultado(null)
      setError(mensajeDe(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <section>
      <p className="mb-6 mt-0 text-muted-foreground">
        X es el número de CVE críticos (evento A) en un lote de n CVE. Se modela como X ~ Bin(n,
        p), donde p es la probabilidad de que un CVE sea crítico.
      </p>

      <DosColumnas
        formulario={
          <Card>
            <CardHeader>
              <CardTitle>Parámetros</CardTitle>
            </CardHeader>
            <CardContent>
              <Formulario
                onSubmit={(e) => {
                  e.preventDefault()
                  void calcular()
                }}
              >
                <Campo etiqueta="n: tamaño del lote" htmlFor="n">
                  <Input
                    id="n"
                    type="number"
                    min={1}
                    step={1}
                    value={n}
                    onChange={(e) => setN(e.target.value)}
                  />
                </Campo>
                <Campo etiqueta="k: número de CVE críticos" htmlFor="k">
                  <Input
                    id="k"
                    type="number"
                    min={0}
                    step={1}
                    value={k}
                    onChange={(e) => setK(e.target.value)}
                  />
                </Campo>
                <Campo etiqueta="p: probabilidad de éxito (opcional)" htmlFor="p">
                  <Input
                    id="p"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    placeholder="vacío = estimar como K/N"
                    value={p}
                    onChange={(e) => setP(e.target.value)}
                  />
                </Campo>
                <Campo etiqueta="Confianza para el n mínimo (opcional)" htmlFor="confianza">
                  <Input
                    id="confianza"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    placeholder="por ejemplo 0.95"
                    value={confianza}
                    onChange={(e) => setConfianza(e.target.value)}
                  />
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
                    opciones={VECTORES}
                    valor={vector}
                    onCambio={setVector}
                  />
                </Campo>
                <Campo etiqueta="Privilegios (C)" htmlFor="privilegios">
                  <SelectOpciones
                    id="privilegios"
                    opciones={PRIVILEGIOS}
                    valor={privilegios}
                    onCambio={setPrivilegios}
                  />
                </Campo>
                <Button type="submit" className="w-full" disabled={cargando}>
                  Calcular binomial
                </Button>
              </Formulario>
            </CardContent>
          </Card>
        }
        resultados={
          <>
            {!resultado && !cargando && !error && (
              <p className="text-sm text-muted-foreground">
                Los resultados aparecerán aquí al pulsar «Calcular binomial».
              </p>
            )}
            {cargando && <Cargando texto="Calculando…" />}
            {error && <MensajeError mensaje={error} />}

            {resultado && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Parámetros usados</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <p className="m-0">
                      n = {resultado.n}, k = {resultado.k}, p = {resultado.p}{' '}
                      {resultado.p_estimada
                        ? `(estimada como K/N = ${resultado.K}/${resultado.N})`
                        : '(ingresada por ti)'}
                    </p>

                    {resultado.advertencias.length > 0 && (
                      <Alert variant="warning">
                        <AlertTitle>Advertencias</AlertTitle>
                        <AlertDescription>
                          <ul className="m-0 grid list-disc gap-1 pl-5">
                            {resultado.advertencias.map((a) => (
                              <li key={a.codigo}>{a.mensaje}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resultados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medida</TableHead>
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <FilaMedida medida={`P(X = ${resultado.k})`} valor={f(resultado.prob_igual)} />
                        <FilaMedida medida={`P(X ≤ ${resultado.k})`} valor={f(resultado.prob_a_lo_sumo)} />
                        <FilaMedida medida={`P(X ≥ ${resultado.k})`} valor={f(resultado.prob_al_menos)} />
                        <FilaMedida medida="Esperanza E(X) = n·p" valor={f(resultado.media)} />
                        <FilaMedida medida="Varianza Var(X) = n·p·(1 − p)" valor={f(resultado.varianza)} />
                        <FilaMedida medida="Desviación estándar" valor={f(resultado.desviacion)} />
                        {resultado.confianza !== null && (
                          <FilaMedida
                            medida={`n mínimo para P(X ≥ 1) ≥ ${resultado.confianza}`}
                            valor={resultado.n_minimo === null ? 'no disponible' : resultado.n_minimo}
                          />
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Gráfica de la función de masa de probabilidad</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <GraficoPmf pmf={resultado.pmf} kElegido={resultado.k} />
                    <p className="m-0 text-muted-foreground">
                      Las barras rojas (k ≥ {resultado.k}) suman P(X ≥ {resultado.k}) ={' '}
                      {f(resultado.prob_al_menos)}.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tabla de la función de masa de probabilidad</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="max-h-88 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>k</TableHead>
                            <TableHead>P(X = k)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resultado.pmf.map((punto) => (
                            <TableRow
                              key={punto.k}
                              className={cn(punto.k >= resultado.k && 'font-bold')}
                            >
                              <TableCell className="tabular-nums">{punto.k}</TableCell>
                              <TableCell className="tabular-nums">
                                {punto.probabilidad.toExponential(4)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="m-0 text-muted-foreground">
                      Las filas en negrita son las que suman P(X ≥ k).
                    </p>
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

function FilaMedida({ medida, valor }: { medida: string; valor: string | number }) {
  return (
    <TableRow>
      <TableCell>{medida}</TableCell>
      <TableCell className="tabular-nums">{valor}</TableCell>
    </TableRow>
  )
}
