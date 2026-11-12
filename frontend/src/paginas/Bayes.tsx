import { useState } from 'react'
import { api, ErrorApi } from '../api/cliente.ts'
import type { BayesOut, CriteriosIn } from '../api/tipos.ts'
import Cargando from '../componentes/Cargando.tsx'
import MensajeError from '../componentes/MensajeError.tsx'

type Condicionante = BayesOut['condicionante']
type Vector = NonNullable<CriteriosIn['vector']>
type Privilegios = NonNullable<CriteriosIn['privilegios']>

const condicionantes: { valor: Condicionante; texto: string }[] = [
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
    const valorUmbral = Number(umbral)
    if (umbral.trim() === '' || Number.isNaN(valorUmbral) || valorUmbral < 0 || valorUmbral > 10) {
      setError('El umbral debe ser un número entre 0 y 10.')
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
      <h2>Probabilidad condicional y teorema de Bayes</h2>
      <p style={{ maxWidth: '40rem' }}>
        Pregunta: si sabemos que ocurrió el evento E (B o C), ¿cuál es la probabilidad de
        que el CVE sea crítico (A)? El teorema de Bayes actualiza la probabilidad previa
        de A con esa información.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void calcular()
        }}
        style={{ display: 'grid', gap: '0.75rem', maxWidth: '30rem' }}
      >
        <label>
          Evento condicionante E{' '}
          <select
            value={condicionante}
            onChange={(e) => {
              const op = condicionantes.find((c) => c.valor === e.target.value)
              if (op) setCondicionante(op.valor)
            }}
          >
            {condicionantes.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.texto}
              </option>
            ))}
          </select>
        </label>
        <label>
          Probabilidad previa de A (opcional, entre 0 y 1){' '}
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            placeholder="vacío = P(A) de los datos"
            value={prior}
            onChange={(e) => setPrior(e.target.value)}
          />
        </label>
        <label>
          Umbral de criticidad (A){' '}
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={umbral}
            onChange={(e) => setUmbral(e.target.value)}
          />
        </label>
        <label>
          Vector de ataque (B){' '}
          <select
            value={vector}
            onChange={(e) => {
              const op = vectores.find((v) => v.valor === e.target.value)
              if (op) setVector(op.valor)
            }}
          >
            {vectores.map((v) => (
              <option key={v.valor} value={v.valor}>
                {v.texto}
              </option>
            ))}
          </select>
        </label>
        <label>
          Privilegios (C){' '}
          <select
            value={privilegios}
            onChange={(e) => {
              const op = privilegiosOpciones.find((p) => p.valor === e.target.value)
              if (op) setPrivilegios(op.valor)
            }}
          >
            {privilegiosOpciones.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.texto}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={cargando}>
          Calcular Bayes
        </button>
      </form>

      {cargando && <Cargando texto="Calculando…" />}
      {error && <MensajeError mensaje={error} />}

      {resultado && (
        <>
          <h3>Paso a paso (E = {resultado.condicionante})</h3>
          <ol>
            <li>
              <strong>Probabilidad previa de A.</strong> En los datos, P(A) ={' '}
              {f(resultado.p_a)}. Probabilidad previa usada: {f(resultado.prior)}
              {resultado.prior === resultado.p_a
                ? ' (la de los datos).'
                : ' (editada por ti).'}
            </li>
            <li>
              <strong>Verosimilitudes, calculadas con los datos.</strong>
              <br />
              P(E | A) = {f(resultado.p_e_dado_a)}: entre los críticos, la fracción que
              cumple E.
              <br />
              P(E | Aᶜ) = {f(resultado.p_e_dado_ac)}: entre los no críticos, la
              fracción que cumple E.
            </li>
            <li>
              <strong>Probabilidad total de E.</strong>
              <br />
              P(E) = P(E | A)·prior + P(E | Aᶜ)·(1 − prior)
              <br />
              P(E) = {f(resultado.p_e_dado_a)} · {f(resultado.prior)} +{' '}
              {f(resultado.p_e_dado_ac)} · {f(1 - resultado.prior)} = {f(resultado.p_e)}
            </li>
            <li>
              <strong>Teorema de Bayes.</strong>
              <br />
              P(A | E) = P(E | A)·prior / P(E)
              <br />
              P(A | E) = {f(resultado.p_e_dado_a)} · {f(resultado.prior)} /{' '}
              {f(resultado.p_e)} = <strong>{f(resultado.posterior)}</strong>
            </li>
            <li>
              <strong>Comparación.</strong> Con los datos, P(A | E) ={' '}
              {f(resultado.p_a_dado_e)}. Con el prior usado, el posterior es{' '}
              {f(resultado.posterior)}.
            </li>
          </ol>
          <p>
            <strong>Interpretación:</strong> pasamos de {f(resultado.prior)} antes de
            conocer E a {f(resultado.posterior)} después de saber que ocurrió E.
          </p>
        </>
      )}
    </section>
  )
}