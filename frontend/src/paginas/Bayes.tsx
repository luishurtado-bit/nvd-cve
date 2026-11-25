import { useState } from 'react'
import { api } from '@/api/cliente'
import type { BayesOut, Privilegios, Vector } from '@/api/tipos'
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
import { decimal4, numero, porcentaje } from '@/lib/formato'
import Cargando from '@/components/comunes/Cargando'
import MensajeError from '@/components/comunes/MensajeError'
import TarjetaKpi from '@/components/comunes/TarjetaKpi'
import VerCalculo from '@/components/comunes/VerCalculo'
import { Campo } from '@/components/campo'
import { DosColumnas } from '@/components/dos-columnas'
import { Formulario } from '@/components/formulario'
import { SelectOpciones } from '@/components/select-opciones'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Condicionante = BayesOut['condicionante']

const CONDICIONANTES: OpcionDominio<Condicionante>[] = [
  { valor: 'B', etiqueta: 'Vector de ataque', texto: 'B: el vector de ataque' },
  { valor: 'C', etiqueta: 'Privilegios', texto: 'C: los privilegios requeridos' },
]

/** Cuántos CVE imaginarios se usan para el árbol de frecuencias. */
const POBLACION = 1000

export default function Bayes() {
  const { version } = useDatos()

  const [condicionante, setCondicionante] = useState<Condicionante>('B')
  const [vector, setVector] = useState<Vector>('NETWORK')
  const [privilegios, setPrivilegios] = useState<Privilegios>('NONE')
  // null = usar P(A) de los datos
  const [prior, setPrior] = useState<number | null>(null)
  const [umbral, setUmbral] = useState('9')

  const valorUmbral = leerUmbral(umbral)
  const errorEntrada = valorUmbral === null ? MENSAJE_UMBRAL : null

  const { datos, cargando, error } = useConsulta(
    (signal) =>
      api.bayes(
        {
          criterios: { umbral: valorUmbral ?? 9, vector, privilegios },
          condicionante,
          prior,
        },
        signal,
      ),
    [valorUmbral, vector, privilegios, condicionante, prior, version],
    { activo: valorUmbral !== null, retardo: 300 },
  )

  const frase =
    condicionante === 'B'
      ? `tiene vector de ataque «${etiquetaDe(VECTORES, vector)}»`
      : `requiere privilegios «${etiquetaDe(PRIVILEGIOS, privilegios)}»`

  const valorDeslizador = prior ?? datos?.p_a ?? 0

  return (
    <section>
      <h2 className="mb-1 mt-0 text-xl font-semibold">
        Si sé que un CVE {condicionante === 'B' ? 'es de un vector de ataque' : 'pide ciertos privilegios'},
        ¿cambia la probabilidad de que sea crítico?
      </h2>
      <p className="mb-6 mt-0 text-muted-foreground">
        El teorema de Bayes actualiza lo que creíamos antes (la probabilidad previa) con un dato nuevo.
      </p>

      <DosColumnas
        formulario={
          <Card>
            <CardHeader>
              <CardTitle>Lo que sabes del CVE</CardTitle>
            </CardHeader>
            <CardContent>
              <Formulario onSubmit={(e) => e.preventDefault()}>
                <Campo etiqueta="Dato que conoces" htmlFor="condicionante">
                  <SelectOpciones
                    id="condicionante"
                    opciones={CONDICIONANTES}
                    valor={condicionante}
                    onCambio={setCondicionante}
                  />
                </Campo>
                {condicionante === 'B' ? (
                  <Campo etiqueta="Vector de ataque" htmlFor="vector">
                    <SelectOpciones id="vector" opciones={VECTORES} valor={vector} onCambio={setVector} />
                  </Campo>
                ) : (
                  <Campo etiqueta="Privilegios requeridos" htmlFor="privilegios">
                    <SelectOpciones
                      id="privilegios"
                      opciones={PRIVILEGIOS}
                      valor={privilegios}
                      onCambio={setPrivilegios}
                    />
                  </Campo>
                )}
                <Campo
                  etiqueta={`Probabilidad previa de que sea crítico: ${porcentaje(valorDeslizador)}`}
                  htmlFor="prior"
                >
                  <input
                    id="prior"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={valorDeslizador}
                    onChange={(e) => setPrior(Number(e.target.value))}
                    className="w-full"
                  />
                </Campo>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={prior === null}
                  onClick={() => setPrior(null)}
                >
                  Usar P(A) de los datos{datos ? ` (${porcentaje(datos.p_a)})` : ''}
                </Button>
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
            {!datos && cargando && <Cargando texto="Calculando…" />}
            {error && <MensajeError mensaje={error} />}

            {datos && <Resultados datos={datos} frase={frase} />}
          </>
        }
      />
    </section>
  )
}

function Resultados({ datos, frase }: { datos: BayesOut; frase: string }) {
  // Árbol en frecuencias: «de cada 1000 CVE…» (redondeado, por eso es aproximado)
  const criticos = Math.round(POBLACION * datos.prior)
  const noCriticos = POBLACION - criticos
  const criticosE = Math.round(criticos * datos.p_e_dado_a)
  const noCriticosE = Math.round(noCriticos * datos.p_e_dado_ac)
  const totalE = criticosE + noCriticosE
  const maximo = Math.max(datos.prior, datos.posterior)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>La respuesta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="m-0 text-xl font-semibold">
            Si un CVE {frase}, la probabilidad de que sea crítico pasa de {porcentaje(datos.prior)} a{' '}
            {porcentaje(datos.posterior)}.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TarjetaKpi etiqueta="Antes (previa)" valor={porcentaje(datos.prior)} ayuda="prior" />
            <TarjetaKpi etiqueta="Después (posterior)" valor={porcentaje(datos.posterior)} ayuda="posterior" />
          </div>
          <Barra etiqueta="Previa" valor={datos.prior} maximo={maximo} clase="bg-chart-2" />
          <Barra etiqueta="Posterior" valor={datos.posterior} maximo={maximo} clase="bg-chart-1" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>En frecuencias: de cada {numero(POBLACION)} CVE</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ul className="m-0 grid list-none gap-3 p-0">
            <li>
              <strong>{numero(criticos)}</strong> son críticos.
              <ul className="m-0 mt-1 grid list-none gap-1 border-l-2 pl-4 text-sm">
                <li>
                  {numero(criticosE)} de ellos {frase}.
                </li>
                <li>{numero(criticos - criticosE)} de ellos no.</li>
              </ul>
            </li>
            <li>
              <strong>{numero(noCriticos)}</strong> no son críticos.
              <ul className="m-0 mt-1 grid list-none gap-1 border-l-2 pl-4 text-sm">
                <li>
                  {numero(noCriticosE)} de ellos {frase}.
                </li>
                <li>{numero(noCriticos - noCriticosE)} de ellos no.</li>
              </ul>
            </li>
          </ul>
          <p className="m-0">
            Entre los {numero(totalE)} CVE que {frase}, {numero(criticosE)} son críticos:{' '}
            <strong>{porcentaje(totalE > 0 ? criticosE / totalE : null)}</strong>. Es el posterior.
          </p>
          <p className="m-0 text-xs text-muted-foreground">
            Las cifras del árbol están redondeadas a CVE enteros, por eso son aproximadas.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paso a paso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="m-0">
            Con los datos, entre los críticos el {porcentaje(datos.p_e_dado_a)} cumple lo que sabes del CVE,
            y entre los no críticos, el {porcentaje(datos.p_e_dado_ac)}.
          </p>
          <p className={cn('m-0 text-sm text-muted-foreground')}>
            Con los datos solos (sin cambiar la previa), P(A | E) = {porcentaje(datos.p_a_dado_e)}.
          </p>
          <VerCalculo
            pasos={[
              {
                formula: 'P(E | A): de los datos',
                resultado: decimal4(datos.p_e_dado_a),
              },
              {
                formula: 'P(E | Aᶜ): de los datos',
                resultado: decimal4(datos.p_e_dado_ac),
              },
              {
                formula: 'P(E) = P(E | A)·previa + P(E | Aᶜ)·(1 − previa)',
                sustituida: `${decimal4(datos.p_e_dado_a)}·${decimal4(datos.prior)} + ${decimal4(datos.p_e_dado_ac)}·${decimal4(1 - datos.prior)}`,
                resultado: decimal4(datos.p_e),
              },
              {
                formula: 'P(A | E) = P(E | A)·previa / P(E)',
                sustituida: `${decimal4(datos.p_e_dado_a)}·${decimal4(datos.prior)} / ${decimal4(datos.p_e)}`,
                resultado: decimal4(datos.posterior),
              },
            ]}
          />
        </CardContent>
      </Card>
    </>
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