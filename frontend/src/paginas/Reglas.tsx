import { useState } from 'react'
import { api, ErrorApi } from '../api/cliente.ts'
import type { CriteriosIn, ReglasOut } from '../api/tipos.ts'
import Cargando from '../componentes/Cargando.tsx'
import MensajeError from '../componentes/MensajeError.tsx'

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

  const sel = (valor: Evento, set: (v: Evento) => void) => (
    <select
      value={valor}
      onChange={(e) => {
        const op = eventos.find((v) => v.valor === e.target.value)
        if (op) set(op.valor)
      }}
    >
      {eventos.map((v) => (
        <option key={v.valor} value={v.valor}>
          {v.texto}
        </option>
      ))}
    </select>
  )

  return (
    <section>
      <h2>Reglas de probabilidad</h2>

      <p
        role="note"
        style={{ border: '1px solid goldenrod', padding: '0.5rem', maxWidth: '40rem' }}
      >
        <strong>Ojo:</strong> A y B pueden ser dependientes, porque la puntuación CVSS y
        el vector de ataque están relacionados. No se asume independencia: se comprueba
        comparando P(X ∩ Y) con P(X)·P(Y).
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void calcular()
        }}
        style={{ display: 'grid', gap: '0.75rem', maxWidth: '28rem' }}
      >
        <label>Evento X {sel(x, setX)}</label>
        <label>Evento Y {sel(y, setY)}</label>
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
          Calcular reglas
        </button>
      </form>

      {cargando && <Cargando texto="Calculando…" />}
      {error && <MensajeError mensaje={error} />}

      {resultado && (
        <>
          <h3>
            Resultados para {resultado.x} y {resultado.y}
          </h3>
          <table>
            <thead>
              <tr>
                <th>Regla</th>
                <th>Fórmula</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Complemento de {resultado.x}</td>
                <td>P({resultado.x}ᶜ) = 1 − P({resultado.x}) = 1 − {f(resultado.p_x)}</td>
                <td>{f(resultado.p_x_complemento)}</td>
              </tr>
              <tr>
                <td>Complemento de {resultado.y}</td>
                <td>P({resultado.y}ᶜ) = 1 − P({resultado.y}) = 1 − {f(resultado.p_y)}</td>
                <td>{f(resultado.p_y_complemento)}</td>
              </tr>
              <tr>
                <td>Intersección</td>
                <td>
                  P({resultado.x} ∩ {resultado.y})
                </td>
                <td>{f(resultado.p_interseccion)}</td>
              </tr>
              <tr>
                <td>Unión</td>
                <td>
                  P({resultado.x}) + P({resultado.y}) − P({resultado.x} ∩ {resultado.y}) ={' '}
                  {f(resultado.p_x)} + {f(resultado.p_y)} − {f(resultado.p_interseccion)}
                </td>
                <td>{f(resultado.p_union)}</td>
              </tr>
            </tbody>
          </table>

          <h3>¿Son independientes?</h3>
          <p>
            Si fueran independientes, P({resultado.x} ∩ {resultado.y}) sería igual a
            P({resultado.x})·P({resultado.y}).
          </p>
          <ul>
            <li>
              P({resultado.x} ∩ {resultado.y}) = {f(resultado.p_interseccion)}
            </li>
            <li>
              P({resultado.x})·P({resultado.y}) = {f(resultado.producto)}
            </li>
          </ul>
          <p>
            <strong>
              {resultado.independientes
                ? `Los valores coinciden: ${resultado.x} y ${resultado.y} resultan independientes.`
                : `Los valores son distintos: ${resultado.x} y ${resultado.y} son dependientes.`}
            </strong>
          </p>
          {resultado.nota && <p>{resultado.nota}</p>}
        </>
      )}
    </section>
  )
}