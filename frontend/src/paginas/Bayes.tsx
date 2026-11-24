import { useState } from 'react'
import { api } from '@/api/cliente'
import type { BayesOut, Privilegios, Vector } from '@/api/tipos'
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

type Condicionante = BayesOut['condicionante']

const condicionantes: { valor: Condicionante; texto: string }[] = [
  { valor: 'B', texto: 'B (vector de ataque)' },
  { valor: 'C', texto: 'C (privilegios)' },
]

const f = (n: number) => n.toFixed(4)

export default function Bayes() {
  const [condicionante, setCondicionante] = useState<Condicionante>('B')
  const [prior, setPrior] = useState('')
  const [umbral, setUmbral] = useState('9')
  const [vector, setVector] = useState<Vector>('NETWORK')
  const [privilegios, setPrivilegios] = useState<Privilegios>('NONE')

  const [resultado, setResultado] = useState<BayesOut | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function calcular() {
    const valorUmbral = leerUmbral(umbral)
    if (valorUmbral === null) {
      setError(MENSAJE_UMBRAL)
      return
    }
    let valorPrior: number | undefined
    if (prior.trim() !== '') {
      valorPrior = Number(prior)
      if (Number.isNaN(valorPrior) || valorPrior < 0 || valorPrior > 1) {
        setError('La probabilidad previa debe ser un número entre 0 y 1.')
        return
      }
    }
    setError(null)
    setCargando(true)
    try {
      setResultado(
        await api.bayes({
          criterios: { umbral: valorUmbral, vector, privilegios },
          condicionante,
          prior: valorPrior,
        }),
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
      <p className="mb-6 mt-0 text-muted-foreground">
        Pregunta: si sabemos que ocurrió el evento E (B o C), ¿cuál es la probabilidad de que el
        CVE sea crítico (A)? El teorema de Bayes actualiza la probabilidad previa de A con esa
        información.
      </p>

      <DosColumnas
        formulario={
          <Card>
            <CardHeader>
              <CardTitle>Evento y criterios</CardTitle>
            </CardHeader>
            <CardContent>
              <Formulario
                onSubmit={(e) => {
                  e.preventDefault()
                  void calcular()
                }}
              >
                <Campo etiqueta="Evento condicionante E" htmlFor="condicionante">
                  <SelectOpciones
                    id="condicionante"
                    opciones={condicionantes}
                    valor={condicionante}
                    onCambio={setCondicionante}
                  />
                </Campo>
                <Campo etiqueta="Probabilidad previa de A (opcional, entre 0 y 1)" htmlFor="prior">
                  <Input
                    id="prior"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    placeholder="vacío = P(A) de los datos"
                    value={prior}
                    onChange={(e) => setPrior(e.target.value)}
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
                  Calcular Bayes
                </Button>
              </Formulario>
            </CardContent>
          </Card>
        }
        resultados={
          <>
            {!resultado && !cargando && !error && (
              <p className="text-sm text-muted-foreground">
                Los resultados aparecerán aquí al pulsar «Calcular Bayes».
              </p>
            )}
            {cargando && <Cargando texto="Calculando…" />}
            {error && <MensajeError mensaje={error} />}

            {resultado && (
              <Card>
                <CardHeader>
                  <CardTitle>Paso a paso (E = {resultado.condicionante})</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <ol className="m-0 grid list-decimal gap-4 pl-5">
                    <li className="m-0">
                      <strong>Probabilidad previa de A.</strong> En los datos, P(A) ={' '}
                      {f(resultado.p_a)}. Probabilidad previa usada: {f(resultado.prior)}
                      {resultado.prior === resultado.p_a
                        ? ' (la de los datos).'
                        : ' (editada por ti).'}
                    </li>
                    <li className="m-0">
                      <strong>Verosimilitudes, calculadas con los datos.</strong>
                      <br />
                      P(E | A) = {f(resultado.p_e_dado_a)}: entre los críticos, la fracción que
                      cumple E.
                      <br />
                      P(E | Aᶜ) = {f(resultado.p_e_dado_ac)}: entre los no críticos, la
                      fracción que cumple E.
                    </li>
                    <li className="m-0">
                      <strong>Probabilidad total de E.</strong>
                      <br />
                      P(E) = P(E | A)·prior + P(E | Aᶜ)·(1 − prior)
                      <br />
                      P(E) = {f(resultado.p_e_dado_a)} · {f(resultado.prior)} +{' '}
                      {f(resultado.p_e_dado_ac)} · {f(1 - resultado.prior)} ={' '}
                      {f(resultado.p_e)}
                    </li>
                    <li className="m-0">
                      <strong>Teorema de Bayes.</strong>
                      <br />
                      P(A | E) = P(E | A)·prior / P(E)
                      <br />
                      P(A | E) = {f(resultado.p_e_dado_a)} · {f(resultado.prior)} /{' '}
                      {f(resultado.p_e)} = <strong>{f(resultado.posterior)}</strong>
                    </li>
                    <li className="m-0">
                      <strong>Comparación.</strong> Con los datos, P(A | E) ={' '}
                      {f(resultado.p_a_dado_e)}. Con el prior usado, el posterior es{' '}
                      {f(resultado.posterior)}.
                    </li>
                  </ol>
                  <p className="m-0 border-t pt-4">
                    <strong>Interpretación:</strong> pasamos de {f(resultado.prior)} antes de
                    conocer E a {f(resultado.posterior)} después de saber que ocurrió E.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        }
      />
    </section>
  )
}
