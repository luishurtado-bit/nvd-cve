import { useEffect, useState } from 'react'
import { api, ErrorApi } from '../api/cliente.ts'
import type { CriteriosIn, EventosOut, ResumenDatos } from '../api/tipos.ts'
import Cargando from '../componentes/Cargando.tsx'
import MensajeError from '../componentes/MensajeError.tsx'

type Vector = NonNullable<CriteriosIn['vector']>
type Privilegios = NonNullable<CriteriosIn['privilegios']>

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

const filas: { clave: keyof EventosOut['eventos']; evento: string }[] = [
  { clave: 'A', evento: 'A: crítica (baseScore ≥ umbral)' },
  { clave: 'B', evento: 'B: vector de ataque elegido' },
  { clave: 'C', evento: 'C: privilegios elegidos' },
  { clave: 'AB', evento: 'A ∩ B' },
  { clave: 'AC', evento: 'A ∩ C' },
  { clave: 'BC', evento: 'B ∩ C' },
  { clave: 'ABC', evento: 'A ∩ B ∩ C' },
]

function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApi) return error.message
  return 'Ocurrió un error inesperado.'
}

export default function Eventos() {
  const [resumen, setResumen] = useState<ResumenDatos | null>(null)
  const [errorResumen, setErrorResumen] = useState<string | null>(null)

  const [umbral, setUmbral] = useState('9')
  const [vector, setVector] = useState<Vector>('NETWORK')
  const [privilegios, setPrivilegios] = useState<Privilegios>('NONE')

  const [resultado, setResultado] = useState<EventosOut | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    api
      .resumen()
      .then((d) => {
        if (activo) setResumen(d)
      })
      .catch((e: unknown) => {
        if (activo) setErrorResumen(mensajeDe(e))
      })
    return () => {
      activo = false
    }
  }, [])

  async function calcular() {
    const valor = Number(umbral)
    if (umbral.trim() === '' || Number.isNaN(valor) || valor < 0 || valor > 10) {
      setError('El umbral debe ser un número entre 0 y 10.')
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
      <h2>Datos y eventos A, B y C</h2>

      <h3>Resumen de los datos</h3>
      {errorResumen && <MensajeError mensaje={errorResumen} />}
      {!resumen && !errorResumen && <Cargando />}
      {resumen && (
        <ul>
          <li>
            Periodo:{' '}
            {resumen.periodo.inicio && resumen.periodo.fin
              ? `${resumen.periodo.inicio} a ${resumen.periodo.fin}`
              : 'sin fijar'}
          </li>
          <li>CVE descargados: {resumen.descargados}</li>
          <li>Rechazados (Rejected): {resumen.rechazados}</li>
          <li>Sin puntuación CVSS: {resumen.sin_puntuacion}</li>
          <li>
            <strong>N (espacio muestral Ω): {resumen.N}</strong>
          </li>
        </ul>
      )}

      <h3>Definición de los eventos</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void calcular()
        }}
        style={{ display: 'grid', gap: '0.75rem', maxWidth: '28rem' }}
      >
        <label>
          Umbral de criticidad (A: baseScore ≥ umbral){' '}
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
          Privilegios requeridos (C){' '}
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
          Calcular eventos
        </button>
      </form>

      {cargando && <Cargando texto="Calculando…" />}
      {error && <MensajeError mensaje={error} />}

      {resultado && (
        <>
          <h3>Resultados (N = {resultado.N})</h3>
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Conteo</th>
                <th>Probabilidad</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const dato = resultado.eventos[f.clave]
                return (
                  <tr key={f.clave}>
                    <td>{f.evento}</td>
                    <td>{dato.conteo}</td>
                    <td>{dato.probabilidad.toFixed(4)}</td>
                    <td>{(dato.probabilidad * 100).toFixed(2)} %</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}