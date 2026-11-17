import { useState } from 'react'
import { api, ErrorApi } from '../api/cliente.ts'
import type { BinomialIn, BinomialOut, CriteriosIn } from '../api/tipos.ts'
import Cargando from '../componentes/Cargando.tsx'
import MensajeError from '../componentes/MensajeError.tsx'
import GraficoPmf from '../componentes/GraficoPmf.tsx'

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

function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApi) return error.message
  return 'Ocurrió un error inesperado.'
}

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
    const valorUmbral = Number(umbral)
    if (umbral.trim() === '' || Number.isNaN(valorUmbral) || valorUmbral < 0 || valorUmbral > 10) {
      setError('El umbral debe ser un número entre 0 y 10.')
      return
    }
    const entrada: BinomialIn = {
      n: valorN,
      k: valorK,
      criterios: { umbral: valorUmbral, vector, privilegios },
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
      <h2>Distribución binomial</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        X es el número de CVE críticos (evento A) en un lote de n CVE. Se modela como
        X ~ Bin(n, p), donde p es la probabilidad de que un CVE sea crítico.
      </p>

      <div className="dos-columnas">
        {/* Columna izquierda: formulario */}
        <div className="columna-formulario">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void calcular()
            }}
            style={{ display: 'grid', gap: '0.75rem' }}
          >
            <label>
              n: tamaño del lote{' '}
              <input type="number" min={1} step={1} value={n} onChange={(e) => setN(e.target.value)} />
            </label>
            <label>
              k: número de CVE críticos{' '}
              <input type="number" min={0} step={1} value={k} onChange={(e) => setK(e.target.value)} />
            </label>
            <label>
              p: probabilidad de éxito (opcional){' '}
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                placeholder="vacío = estimar como K/N"
                value={p}
                onChange={(e) => setP(e.target.value)}
              />
            </label>
            <label>
              Confianza para el n mínimo (opcional){' '}
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                placeholder="por ejemplo 0.95"
                value={confianza}
                onChange={(e) => setConfianza(e.target.value)}
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
                  const op = privilegiosOpciones.find((o) => o.valor === e.target.value)
                  if (op) setPrivilegios(op.valor)
                }}
              >
                {privilegiosOpciones.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={cargando}>
              Calcular binomial
            </button>
          </form>
        </div>

        {/* Columna derecha: resultados */}
        <div className="columna-resultados">
          {!resultado && !cargando && !error && (
            <p className="vacio">
              Los resultados aparecerán aquí al pulsar «Calcular binomial».
            </p>
          )}
          {cargando && <Cargando texto="Calculando…" />}
          {error && <MensajeError mensaje={error} />}

          {resultado && (
            <>
              <h3>Parámetros usados</h3>
              <p>
                n = {resultado.n}, k = {resultado.k}, p = {resultado.p}{' '}
                {resultado.p_estimada
                  ? `(estimada como K/N = ${resultado.K}/${resultado.N})`
                  : '(ingresada por ti)'}
              </p>

              {resultado.advertencias.length > 0 && (
                <div
                  role="alert"
                  style={{
                    border: '1px solid var(--aviso-borde)',
                    background: 'var(--aviso-fondo)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginTop: '1rem',
                  }}
                >
                  <strong>Advertencias</strong>
                  <ul>
                    {resultado.advertencias.map((a) => (
                      <li key={a.codigo}>{a.mensaje}</li>
                    ))}
                  </ul>
                </div>
              )}

              <h3>Resultados</h3>
              <table>
                <thead>
                  <tr>
                    <th>Medida</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>P(X = {resultado.k})</td><td>{f(resultado.prob_igual)}</td></tr>
                  <tr><td>P(X ≤ {resultado.k})</td><td>{f(resultado.prob_a_lo_sumo)}</td></tr>
                  <tr><td>P(X ≥ {resultado.k})</td><td>{f(resultado.prob_al_menos)}</td></tr>
                  <tr><td>Esperanza E(X) = n·p</td><td>{f(resultado.media)}</td></tr>
                  <tr><td>Varianza Var(X) = n·p·(1 − p)</td><td>{f(resultado.varianza)}</td></tr>
                  <tr><td>Desviación estándar</td><td>{f(resultado.desviacion)}</td></tr>
                  {resultado.confianza !== null && (
                    <tr>
                      <td>n mínimo para P(X ≥ 1) ≥ {resultado.confianza}</td>
                      <td>{resultado.n_minimo === null ? 'no disponible' : resultado.n_minimo}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <h3>Gráfica de la función de masa de probabilidad</h3>
              <GraficoPmf pmf={resultado.pmf} kElegido={resultado.k} />
              <p>
                Las barras rojas (k ≥ {resultado.k}) suman P(X ≥ {resultado.k}) ={' '}
                {f(resultado.prob_al_menos)}.
              </p>

              <h3>Tabla de la función de masa de probabilidad</h3>
              <div className="tabla-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>k</th>
                      <th>P(X = k)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.pmf.map((punto) => (
                      <tr
                        key={punto.k}
                        style={punto.k >= resultado.k ? { fontWeight: 'bold' } : undefined}
                      >
                        <td>{punto.k}</td>
                        <td>{punto.probabilidad.toExponential(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Las filas en negrita son las que suman P(X ≥ k).</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}