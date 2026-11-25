import { useState } from 'react'
import { api } from '@/api/cliente'
import { useDatos } from '@/contexto/datos'
import { useConsulta } from '@/hooks/use-consulta'
import { leerUmbral, MENSAJE_UMBRAL, type OpcionDominio } from '@/lib/dominio'
import { decimal4, fraccion, numero, porcentaje } from '@/lib/formato'
import Cargando from '@/components/comunes/Cargando'
import MensajeError from '@/components/comunes/MensajeError'
import TarjetaKpi from '@/components/comunes/TarjetaKpi'
import VerCalculo from '@/components/comunes/VerCalculo'
import GraficoPmf from '@/components/graficos/GraficoPmf'
import { Campo } from '@/components/campo'
import { DosColumnas } from '@/components/dos-columnas'
import { Formulario } from '@/components/formulario'
import { SelectOpciones } from '@/components/select-opciones'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Pregunta = 'igual' | 'maximo' | 'minimo'

const PREGUNTAS: OpcionDominio<Pregunta>[] = [
  { valor: 'minimo', etiqueta: 'al menos', texto: 'Al menos k críticos' },
  { valor: 'maximo', etiqueta: 'a lo sumo', texto: 'A lo sumo k críticos' },
  { valor: 'igual', etiqueta: 'exactamente', texto: 'Exactamente k críticos' },
]

export default function Binomial() {
  const { version } = useDatos()

  const [n, setN] = useState('20')
  const [k, setK] = useState('3')
  const [pregunta, setPregunta] = useState<Pregunta>('minimo')
  const [pManual, setPManual] = useState(false)
  const [p, setP] = useState('0.1')
  const [confianza, setConfianza] = useState('0.95')
  const [umbral, setUmbral] = useState('9')

  // --- Validación de lo que escribe la persona ---
  const valorN = Number(n)
  const valorK = Number(k)
  const valorP = Number(p)
  const valorConfianza = Number(confianza)
  const valorUmbral = leerUmbral(umbral)

  let errorEntrada: string | null = null
  if (n.trim() === '' || !Number.isInteger(valorN) || valorN <= 0) {
    errorEntrada = 'n debe ser un entero mayor que 0.'
  } else if (k.trim() === '' || !Number.isInteger(valorK) || valorK < 0) {
    errorEntrada = 'k debe ser un entero mayor o igual que 0.'
  } else if (valorK > valorN) {
    errorEntrada = 'k no puede ser mayor que n.'
  } else if (valorUmbral === null) {
    errorEntrada = MENSAJE_UMBRAL
  } else if (pManual && (p.trim() === '' || Number.isNaN(valorP) || valorP < 0 || valorP > 1)) {
    errorEntrada = 'p debe ser un número entre 0 y 1.'
  } else if (confianza.trim() === '' || Number.isNaN(valorConfianza) || valorConfianza <= 0 || valorConfianza >= 1) {
    errorEntrada = 'La confianza debe ser un número mayor que 0 y menor que 1.'
  }

  // --- Consulta automática (espera 300 ms después del último cambio) ---
  const { datos, cargando, error } = useConsulta(
    (signal) =>
      api.binomial(
        {
          n: valorN,
          k: valorK,
          umbral: valorUmbral ?? 9,
          p: pManual ? valorP : undefined,
          confianza: valorConfianza,
        },
        signal,
      ),
    [valorN, valorK, valorUmbral, pManual, pManual ? valorP : null, valorConfianza, version],
    { activo: errorEntrada === null, retardo: 300 },
  )

  const resalta = (kk: number) =>
    datos === undefined
      ? false
      : pregunta === 'igual'
        ? kk === datos.k
        : pregunta === 'maximo'
          ? kk <= datos.k
          : kk >= datos.k

  return (
    <section>
      <h2 className="mb-1 mt-0 text-xl font-semibold">
        ¿Cuántos CVE críticos hay en un lote de n elegidos al azar?
      </h2>
      <p className="mb-6 mt-0 text-muted-foreground">
        X es el número de CVE críticos en el lote. Se modela como X ~ Bin(n, p), donde p es la
        probabilidad de que un CVE al azar sea crítico.
      </p>

      <DosColumnas
        formulario={
          <Card>
            <CardHeader>
              <CardTitle>Tu lote</CardTitle>
            </CardHeader>
            <CardContent>
              <Formulario onSubmit={(e) => e.preventDefault()}>
                <Campo etiqueta="n: tamaño del lote" htmlFor="n">
                  <Input id="n" type="number" min={1} step={1} value={n} onChange={(e) => setN(e.target.value)} />
                </Campo>
                <Campo etiqueta="Pregunta" htmlFor="pregunta">
                  <SelectOpciones id="pregunta" opciones={PREGUNTAS} valor={pregunta} onCambio={setPregunta} />
                </Campo>
                <Campo etiqueta="k: número de críticos" htmlFor="k">
                  <Input id="k" type="number" min={0} step={1} value={k} onChange={(e) => setK(e.target.value)} />
                </Campo>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pManual} onChange={(e) => setPManual(e.target.checked)} />
                  Escribir p a mano (si no, p = K / N de los datos)
                </label>
                {pManual ? (
                  <Campo etiqueta="p: probabilidad de que un CVE sea crítico (0 a 1)" htmlFor="p">
                    <Input
                      id="p"
                      type="number"
                      min={0}
                      max={1}
                      step={0.01}
                      value={p}
                      onChange={(e) => setP(e.target.value)}
                    />
                  </Campo>
                ) : null}
                <details className="text-sm">
                  <summary className="cursor-pointer select-none font-medium">Opciones avanzadas</summary>
                  <div className="mt-3 grid gap-3">
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
            {!datos && cargando && <Cargando texto="Calculando…" />}
            {error && <MensajeError mensaje={error} />}

            {datos && (
              <>
                {/* Bloque 1: el modelo */}
                <Card>
                  <CardHeader>
                    <CardTitle>1. El modelo</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="m-0">
                      {datos.p_estimada ? (
                        <>
                          De los {numero(datos.N)} CVE del conjunto, {numero(datos.K)} son críticos, así que
                          p = K / N = <strong>{fraccion(datos.K, datos.N)}</strong>.
                        </>
                      ) : (
                        <>
                          Usas p = <strong>{porcentaje(datos.p)}</strong> escrita a mano.
                        </>
                      )}
                    </p>
                    <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
                      {datos.supuestos.map((s) => (
                        <li key={s.codigo} className="flex gap-2">
                          <span
                            aria-label={s.estado === 'cumple' ? 'Se cumple' : 'Advertencia'}
                            className={cn('font-bold', s.estado === 'cumple' ? 'text-chart-3' : 'text-chart-4')}
                          >
                            {s.estado === 'cumple' ? '✓' : '⚠'}
                          </span>
                          <span>{s.texto}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="m-0 text-sm text-muted-foreground">
                      Con N = {numero(datos.N)}, el lote más grande donde la binomial sigue siendo buena es
                      n = {numero(datos.n_max_recomendado)} (regla del 5 %).
                    </p>
                    {datos.advertencias.length > 0 && (
                      <Alert variant="warning">
                        <AlertTitle>Advertencias</AlertTitle>
                        <AlertDescription>
                          <ul className="m-0 grid list-disc gap-1 pl-5">
                            {datos.advertencias.map((a) => (
                              <li key={a.codigo}>{a.mensaje}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Bloque 2: la pregunta */}
                <Card>
                  <CardHeader>
                    <CardTitle>2. La pregunta</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="m-0 text-xl font-semibold">
                      {pregunta === 'minimo' &&
                        `La probabilidad de encontrar al menos ${datos.k} críticos en un lote de ${datos.n} es ${porcentaje(datos.prob_al_menos)}.`}
                      {pregunta === 'maximo' &&
                        `La probabilidad de encontrar a lo sumo ${datos.k} críticos en un lote de ${datos.n} es ${porcentaje(datos.prob_a_lo_sumo)}.`}
                      {pregunta === 'igual' &&
                        `La probabilidad de encontrar exactamente ${datos.k} críticos en un lote de ${datos.n} es ${porcentaje(datos.prob_igual)}.`}
                    </p>
                    <p className="m-0 text-sm text-muted-foreground">
                      Las otras dos: exactamente {datos.k} = {porcentaje(datos.prob_igual)} · a lo sumo{' '}
                      {datos.k} = {porcentaje(datos.prob_a_lo_sumo)} · al menos {datos.k} ={' '}
                      {porcentaje(datos.prob_al_menos)}.
                    </p>
                    <GraficoPmf pmf={datos.pmf} resalta={resalta} kElegido={datos.k} />
                    <details className="rounded-md border bg-muted/30 text-sm">
                      <summary className="cursor-pointer select-none px-3 py-2 font-medium">
                        Ver tabla de la distribución
                      </summary>
                      <div className="max-h-88 overflow-y-auto px-3 pb-3">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>k</TableHead>
                              <TableHead>P(X = k)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {datos.pmf.map((punto) => (
                              <TableRow key={punto.k} className={cn(resalta(punto.k) && 'font-bold')}>
                                <TableCell className="tabular-nums">{punto.k}</TableCell>
                                <TableCell className="tabular-nums">{porcentaje(punto.probabilidad, 2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  </CardContent>
                </Card>

                {/* Bloque 3: qué esperar del lote */}
                <Card>
                  <CardHeader>
                    <CardTitle>3. Qué esperar del lote</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TarjetaKpi
                        etiqueta="Críticos esperados, E(X)"
                        valor={numero(datos.media, 1)}
                        detalle={`en promedio ${numero(datos.media, 1)} críticos por lote de ${datos.n}`}
                      />
                      <TarjetaKpi
                        etiqueta="Variación entre lotes, σ"
                        valor={numero(datos.desviacion, 1)}
                        detalle="cuánto se aleja X de un lote a otro"
                      />
                    </div>
                    <VerCalculo
                      pasos={[
                        {
                          formula: 'E(X) = n · p',
                          sustituida: `${numero(datos.n)} · ${decimal4(datos.p)}`,
                          resultado: decimal4(datos.media),
                        },
                        {
                          formula: 'Var(X) = n · p · (1 − p)',
                          sustituida: `${numero(datos.n)} · ${decimal4(datos.p)} · ${decimal4(1 - datos.p)}`,
                          resultado: decimal4(datos.varianza),
                        },
                        {
                          formula: 'σ = √Var(X)',
                          sustituida: `√${decimal4(datos.varianza)}`,
                          resultado: decimal4(datos.desviacion),
                        },
                      ]}
                    />
                  </CardContent>
                </Card>

                {/* Bloque 4: dimensionar el lote */}
                <Card>
                  <CardHeader>
                    <CardTitle>4. Dimensionar el lote</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="m-0">
                      ¿Cuántos CVE hay que revisar para tener al menos {porcentaje(datos.confianza, 0)} de
                      probabilidad de encontrar un crítico?
                    </p>
                    <div className="max-w-xs">
                      <Campo etiqueta="Confianza deseada (entre 0 y 1)" htmlFor="confianza">
                        <Input
                          id="confianza"
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={confianza}
                          onChange={(e) => setConfianza(e.target.value)}
                        />
                      </Campo>
                    </div>
                    <TarjetaKpi
                      etiqueta="Lote mínimo"
                      valor={datos.n_minimo === null ? null : `${numero(datos.n_minimo)} CVE`}
                      detalle="menor n con al menos un crítico con esa confianza"
                    />
                    {datos.n_minimo !== null && datos.confianza !== null ? (
                      <VerCalculo
                        pasos={[
                          {
                            formula: 'n = ⌈ ln(1 − confianza) / ln(1 − p) ⌉',
                            sustituida: `⌈ ln(${decimal4(1 - datos.confianza)}) / ln(${decimal4(1 - datos.p)}) ⌉`,
                            resultado: numero(datos.n_minimo),
                          },
                        ]}
                      />
                    ) : null}
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