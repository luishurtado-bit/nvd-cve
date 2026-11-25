import { useState } from 'react'
import { api } from '@/api/cliente'
import type { Privilegios, ReglasOut, Vector } from '@/api/tipos'
import { useDatos } from '@/contexto/datos'
import { useConsulta } from '@/hooks/use-consulta'
import {
  etiquetaDe,
  leerUmbral,
  MENSAJE_UMBRAL,
  PRIVILEGIOS,
  VECTORES,
  type OpcionDominio,
} from '@/lib/dominio'
import { decimal4, fraccion, numero, periodo, porcentaje } from '@/lib/formato'
import Cargando from '@/components/comunes/Cargando'
import MensajeError from '@/components/comunes/MensajeError'
import TarjetaKpi from '@/components/comunes/TarjetaKpi'
import VerCalculo from '@/components/comunes/VerCalculo'
import { Campo } from '@/components/campo'
import { DosColumnas } from '@/components/dos-columnas'
import { Formulario } from '@/components/formulario'
import { SelectOpciones } from '@/components/select-opciones'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import BotonExportar from '@/components/comunes/BotonExportar'

type Evento = ReglasOut['x']
type ClaveRegla = 'compX' | 'compY' | 'inter' | 'union' | 'cond'
type ClaveCelda = 'x_y' | 'x_no_y' | 'no_x_y' | 'no_x_no_y'

const EVENTOS: OpcionDominio<Evento>[] = [
  { valor: 'A', etiqueta: 'Crítico', texto: 'A: es crítico' },
  { valor: 'B', etiqueta: 'Vector elegido', texto: 'B: tiene el vector de ataque elegido' },
  { valor: 'C', etiqueta: 'Privilegios elegidos', texto: 'C: tiene los privilegios elegidos' },
]

const FRASES: Record<Evento, { si: string; no: string }> = {
  A: { si: 'es crítico', no: 'no es crítico' },
  B: { si: 'tiene el vector de ataque elegido', no: 'no tiene el vector de ataque elegido' },
  C: { si: 'tiene los privilegios elegidos', no: 'no tiene los privilegios elegidos' },
}

/** Qué reglas usa cada celda de la tabla 2×2: al pasar el mouse por la celda se resaltan. */
const REGLAS_DE_CELDA: Record<ClaveCelda, ClaveRegla[]> = {
  x_y: ['inter', 'union', 'cond'],
  x_no_y: ['union', 'compY', 'cond'],
  no_x_y: ['union', 'compX'],
  no_x_no_y: ['compX', 'compY'],
}

export default function Eventos() {
  const { resumen, version } = useDatos()

  const [umbral, setUmbral] = useState('9')
  const [vector, setVector] = useState<Vector>('NETWORK')
  const [privilegios, setPrivilegios] = useState<Privilegios>('NONE')
  const [x, setX] = useState<Evento>('A')
  const [y, setY] = useState<Evento>('B')
  const [resaltada, setResaltada] = useState<ClaveCelda | null>(null)

  const valorUmbral = leerUmbral(umbral)
  const errorEntrada =
    valorUmbral === null ? MENSAJE_UMBRAL : x === y ? 'Elige dos eventos distintos.' : null

  const eventos = useConsulta(
    (signal) => api.eventos({ umbral: valorUmbral ?? 9, vector, privilegios }, signal),
    [valorUmbral, vector, privilegios, version],
    { activo: valorUmbral !== null, retardo: 300 },
  )

  const reglas = useConsulta(
    (signal) => api.reglas({ criterios: { umbral: valorUmbral ?? 9, vector, privilegios }, x, y }, signal),
    [valorUmbral, vector, privilegios, x, y, version],
    { activo: valorUmbral !== null && x !== y, retardo: 300 },
  )

  const ev = eventos.datos
  const r = reglas.datos

  const marca = (clave: ClaveRegla) =>
    cn(
      'rounded-md px-2 py-1 transition-colors',
      resaltada !== null && REGLAS_DE_CELDA[resaltada].includes(clave) && 'bg-chart-4/25',
    )

  return (
    <section>
      <h2 className="mb-1 mt-0 text-xl font-semibold">
        ¿Qué tan probable es que un CVE sea crítico, sea de red o no pida privilegios? ¿Se relacionan?
      </h2>
      <p className="mb-6 mt-0 text-muted-foreground">
        Se elige al azar un CVE de los {numero(ev?.N ?? resumen?.N)} publicados entre{' '}
        {periodo(resumen?.periodo)}.
      </p>

      <DosColumnas
        formulario={
          <Card>
            <CardHeader>
              <CardTitle>Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <Formulario onSubmit={(e) => e.preventDefault()}>
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
                <Campo etiqueta="Comparar el evento X" htmlFor="evento-x">
                  <SelectOpciones id="evento-x" opciones={EVENTOS} valor={x} onCambio={setX} />
                </Campo>
                <Campo etiqueta="con el evento Y" htmlFor="evento-y">
                  <SelectOpciones id="evento-y" opciones={EVENTOS} valor={y} onCambio={setY} />
                </Campo>
                <details className="text-sm">
                  <summary className="cursor-pointer select-none font-medium">Opciones avanzadas</summary>
                  <div className="mt-3">
                    <Campo etiqueta="Umbral de criticidad (crítico: baseScore ≥ umbral)" htmlFor="umbral">
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
                  </div>
                </details>
                {errorEntrada ? <MensajeError mensaje={errorEntrada} /> : null}
              </Formulario>
            </CardContent>
          </Card>
        }
        resultados={
          <>
            {!ev && eventos.cargando && <Cargando texto="Calculando…" />}
            {eventos.error && <MensajeError mensaje={eventos.error} />}
            {ev && (
              <div className="flex flex-wrap justify-end gap-2">
                <BotonExportar
                  recurso="eventos"
                  texto="CSV eventos"
                  params={{ umbral: valorUmbral ?? 9, vector, privilegios }}
                />
                {x !== y ? (
                  <BotonExportar
                    recurso="reglas"
                    texto="CSV reglas"
                    params={{ umbral: valorUmbral ?? 9, vector, privilegios, x, y }}
                  />
                ) : null}
              </div>
            )}
            {/* Las tres tarjetas A, B y C */}
            {ev && (
              <div className="grid gap-3 sm:grid-cols-3">
                <TarjetaKpi
                  etiqueta={`A · Es crítico (≥ ${numero(valorUmbral ?? 9, 1)})`}
                  valor={porcentaje(ev.eventos.A.probabilidad)}
                  detalle={`${numero(ev.eventos.A.conteo)} de ${numero(ev.N)} CVE`}
                  ayuda="critico"
                />
                <TarjetaKpi
                  etiqueta={`B · Vector de ataque: ${etiquetaDe(VECTORES, vector)}`}
                  valor={porcentaje(ev.eventos.B.probabilidad)}
                  detalle={`${numero(ev.eventos.B.conteo)} de ${numero(ev.N)} CVE`}
                  ayuda={vector === 'NETWORK' ? 'vector_red' : undefined}
                />
                <TarjetaKpi
                  etiqueta={`C · Privilegios: ${etiquetaDe(PRIVILEGIOS, privilegios)}`}
                  valor={porcentaje(ev.eventos.C.probabilidad)}
                  detalle={`${numero(ev.eventos.C.conteo)} de ${numero(ev.N)} CVE`}
                  ayuda="privilegios"
                />
              </div>
            )}

            {reglas.error && <MensajeError mensaje={reglas.error} />}

            {r && (
              <>
                {/* Tabla de contingencia 2×2 */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Cómo se reparten los {numero(r.N)} CVE entre {r.x} y {r.y}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead />
                          <TableHead>{r.y}: {FRASES[r.y].si}</TableHead>
                          <TableHead>{r.y}ᶜ: {FRASES[r.y].no}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableHead>{r.x}: {FRASES[r.x].si}</TableHead>
                          <Celda clave="x_y" conteo={r.tabla.x_y} N={r.N} onResaltar={setResaltada} />
                          <Celda clave="x_no_y" conteo={r.tabla.x_no_y} N={r.N} onResaltar={setResaltada} />
                        </TableRow>
                        <TableRow>
                          <TableHead>{r.x}ᶜ: {FRASES[r.x].no}</TableHead>
                          <Celda clave="no_x_y" conteo={r.tabla.no_x_y} N={r.N} onResaltar={setResaltada} />
                          <Celda clave="no_x_no_y" conteo={r.tabla.no_x_no_y} N={r.N} onResaltar={setResaltada} />
                        </TableRow>
                      </TableBody>
                    </Table>
                    <p className="m-0 text-sm text-muted-foreground">
                      Pasa el mouse por una celda para ver qué reglas la usan.
                    </p>
                  </CardContent>
                </Card>

                {/* Las reglas como frases */}
                <Card>
                  <CardHeader>
                    <CardTitle>Las reglas, en palabras</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <ul className="m-0 grid list-none gap-1.5 p-0">
                      <li className={marca('compX')}>
                        <strong>Complemento:</strong> un CVE {FRASES[r.x].no} en{' '}
                        {fraccion(r.tabla.no_x_y + r.tabla.no_x_no_y, r.N)}.
                      </li>
                      <li className={marca('compY')}>
                        <strong>Complemento:</strong> un CVE {FRASES[r.y].no} en{' '}
                        {fraccion(r.tabla.x_no_y + r.tabla.no_x_no_y, r.N)}.
                      </li>
                      <li className={marca('inter')}>
                        <strong>Intersección:</strong> {FRASES[r.x].si} <em>y</em> {FRASES[r.y].si} en{' '}
                        {fraccion(r.tabla.x_y, r.N)}.
                      </li>
                      <li className={marca('union')}>
                        <strong>Unión:</strong> {FRASES[r.x].si} <em>o</em> {FRASES[r.y].si} (o ambos) en{' '}
                        {fraccion(r.tabla.x_y + r.tabla.x_no_y + r.tabla.no_x_y, r.N)}.
                      </li>
                      <li className={marca('cond')}>
                        <strong>Condicional:</strong> de los CVE que {FRASES[r.x].si}, {FRASES[r.y].si} este
                        porcentaje: {fraccion(r.tabla.x_y, r.tabla.x_y + r.tabla.x_no_y)}.
                      </li>
                    </ul>
                    <VerCalculo
                      pasos={[
                        {
                          formula: `P(${r.x}ᶜ) = 1 − P(${r.x})`,
                          sustituida: `1 − ${decimal4(r.p_x)}`,
                          resultado: decimal4(r.p_x_complemento),
                        },
                        {
                          formula: `P(${r.y}ᶜ) = 1 − P(${r.y})`,
                          sustituida: `1 − ${decimal4(r.p_y)}`,
                          resultado: decimal4(r.p_y_complemento),
                        },
                        {
                          formula: `P(${r.x} ∩ ${r.y})`,
                          sustituida: `${numero(r.tabla.x_y)} / ${numero(r.N)}`,
                          resultado: decimal4(r.p_interseccion),
                        },
                        {
                          formula: `P(${r.x} ∪ ${r.y}) = P(${r.x}) + P(${r.y}) − P(${r.x} ∩ ${r.y})`,
                          sustituida: `${decimal4(r.p_x)} + ${decimal4(r.p_y)} − ${decimal4(r.p_interseccion)}`,
                          resultado: decimal4(r.p_union),
                        },
                        {
                          formula: `P(${r.y} | ${r.x}) = P(${r.x} ∩ ${r.y}) / P(${r.x})`,
                          sustituida: `${decimal4(r.p_interseccion)} / ${decimal4(r.p_x)}`,
                          resultado: r.p_x > 0 ? decimal4(r.p_interseccion / r.p_x) : '—',
                        },
                      ]}
                    />
                  </CardContent>
                </Card>

                {/* Independencia */}
                <Card>
                  <CardHeader>
                    <CardTitle>¿{r.x} y {r.y} son independientes?</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="m-0">
                      Si fueran independientes, que ocurran juntos tendría la misma probabilidad que el
                      producto de las dos por separado. Se comparan:
                    </p>
                    <Barra
                      etiqueta={`P(${r.x} ∩ ${r.y}): ocurren juntos`}
                      valor={r.p_interseccion}
                      maximo={Math.max(r.p_interseccion, r.producto)}
                      clase="bg-chart-1"
                    />
                    <Barra
                      etiqueta={`P(${r.x})·P(${r.y}): lo esperado si fueran independientes`}
                      valor={r.producto}
                      maximo={Math.max(r.p_interseccion, r.producto)}
                      clase="bg-chart-2"
                    />
                    <p className="m-0 text-lg font-semibold">{textoRazon(r)}</p>
                    <Alert variant="warning" role="note">
                      <AlertTitle>Es una observación, no una causa</AlertTitle>
                      <AlertDescription>
                        {r.nota ? `${r.nota} ` : ''}
                        La relación entre estos eventos viene en buena parte de cómo se calcula el CVSS, y
                        con datos reales casi nunca se cumple la independencia exacta.
                      </AlertDescription>
                    </Alert>
                    <VerCalculo
                      pasos={[
                        {
                          formula: `P(${r.x})·P(${r.y})`,
                          sustituida: `${decimal4(r.p_x)} · ${decimal4(r.p_y)}`,
                          resultado: decimal4(r.producto),
                        },
                        {
                          formula: `diferencia = P(${r.x} ∩ ${r.y}) − P(${r.x})·P(${r.y})`,
                          sustituida: `${decimal4(r.p_interseccion)} − ${decimal4(r.producto)}`,
                          resultado: decimal4(r.diferencia),
                        },
                        {
                          formula: `razón = P(${r.x} ∩ ${r.y}) / (P(${r.x})·P(${r.y}))`,
                          sustituida: `${decimal4(r.p_interseccion)} / ${decimal4(r.producto)}`,
                          resultado: r.razon === null ? '—' : decimal4(r.razon),
                        },
                      ]}
                    />
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

/** La razón dicha en palabras: cuántas veces ocurren juntos frente a lo esperado. */
function textoRazon(r: ReglasOut): string {
  if (r.razon === null) return 'No se puede comparar: una de las dos probabilidades es 0.'
  if (Math.abs(r.razon - 1) < 0.005) return 'Ocurren juntos casi lo mismo que se esperaría si fueran independientes.'
  if (r.razon > 1) {
    return `Ocurren juntos ${numero(r.razon, 2)} veces lo esperado si fueran independientes: son dependientes.`
  }
  return `Ocurren juntos solo ${numero(r.razon, 2)} veces lo esperado si fueran independientes: son dependientes.`
}

function Celda({
  clave,
  conteo,
  N,
  onResaltar,
}: {
  clave: ClaveCelda
  conteo: number
  N: number
  onResaltar: (c: ClaveCelda | null) => void
}) {
  return (
    <TableCell
      tabIndex={0}
      className="tabular-nums hover:bg-chart-4/25 focus:bg-chart-4/25"
      onMouseEnter={() => onResaltar(clave)}
      onMouseLeave={() => onResaltar(null)}
      onFocus={() => onResaltar(clave)}
      onBlur={() => onResaltar(null)}
    >
      <div className="font-semibold">{fraccion(conteo, N)}</div>
    </TableCell>
  )
}

function Barra({
  etiqueta,
  valor,
  maximo,
  clase,
}: {
  etiqueta: string
  valor: number
  maximo: number
  clase: string
}) {
  const ancho = maximo > 0 ? (valor / maximo) * 100 : 0
  return (
    <div className="grid gap-1">
      <div className="flex justify-between gap-4 text-sm">
        <span>{etiqueta}</span>
        <span className="tabular-nums font-semibold">{porcentaje(valor, 2)}</span>
      </div>
      <div className="h-3 w-full rounded bg-muted" aria-hidden="true">
        <div className={cn('h-3 rounded', clase)} style={{ width: `${ancho}%` }} />
      </div>
    </div>
  )
}