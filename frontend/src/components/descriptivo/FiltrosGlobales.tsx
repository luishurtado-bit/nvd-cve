import type { Agrupacion } from '@/api/tipos'
import { Campo } from '@/components/campo'
import FiltroMultiple from '@/components/descriptivo/FiltroMultiple'
import { SelectOpciones } from '@/components/select-opciones'
import { SelectorFecha } from '@/components/selector-fecha'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDatos } from '@/contexto/datos'
import { useFiltros } from '@/contexto/filtros'
import { PRIVILEGIOS, SEVERIDADES, VECTORES } from '@/lib/dominio'
import { numero } from '@/lib/formato'

const AGRUPACIONES: { valor: Agrupacion; texto: string }[] = [
  { valor: 'dia', texto: 'Por día' },
  { valor: 'semana', texto: 'Por semana' },
  { valor: 'mes', texto: 'Por mes' },
]

interface Props {
  /** CVE que cumplen los filtros y CVE en total, para decir «N de N_total». */
  cumplen?: number
  total?: number
}

/** Los filtros de la página: se envían al backend y cambian, a la vez, todos los indicadores y gráficos. */
export default function FiltrosGlobales({ cumplen, total }: Props) {
  const { resumen } = useDatos()
  const { estado, establecer, limpiar, activos } = useFiltros()
  const minimo = resumen?.periodo.inicio ?? undefined
  const maximo = resumen?.periodo.fin ?? undefined

  // Un rango al revés no tiene sentido: si una fecha pasa a la otra, se mueve la otra con ella
  const cambiarDesde = (desde: string) =>
    establecer((e) => ({ desde, hasta: desde && e.hasta && e.hasta < desde ? desde : e.hasta }))
  const cambiarHasta = (hasta: string) =>
    establecer((e) => ({ hasta, desde: hasta && e.desde && e.desde > hasta ? hasta : e.desde }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription aria-live="polite">
          {cumplen === undefined || total === undefined
            ? 'Se aplican a todos los indicadores y gráficos de esta página.'
            : cumplen === total
              ? `Sin filtros: se muestran los ${numero(total)} CVE del periodo.`
              : `${numero(cumplen)} de ${numero(total)} CVE cumplen los filtros.`}
        </CardDescription>
        <CardAction>
          <Button type="button" variant="outline" size="sm" disabled={activos === 0} onClick={limpiar}>
            Limpiar filtros{activos > 0 ? ` (${activos})` : ''}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Publicados desde" htmlFor="filtro-desde">
            <SelectorFecha id="filtro-desde" valor={estado.desde} onCambio={cambiarDesde} placeholder="Todo el periodo" min={minimo} max={maximo} />
          </Campo>
          <Campo etiqueta="Publicados hasta" htmlFor="filtro-hasta">
            <SelectorFecha id="filtro-hasta" valor={estado.hasta} onCambio={cambiarHasta} placeholder="Todo el periodo" min={minimo} max={maximo} />
          </Campo>
          <Campo etiqueta="Agrupar la serie" htmlFor="filtro-agrupar" ayuda="No filtra: solo cambia el eje del tiempo.">
            <SelectOpciones id="filtro-agrupar" opciones={AGRUPACIONES} valor={estado.agrupar} onCambio={(agrupar) => establecer({ agrupar })} />
          </Campo>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FiltroMultiple titulo="Severidad" opciones={SEVERIDADES} seleccion={estado.severidad} onCambio={(actualizar) => establecer((e) => ({ severidad: actualizar(e.severidad) }))} />
          <FiltroMultiple titulo="Vector de ataque" ayuda="vector_red" opciones={VECTORES} seleccion={estado.vector} onCambio={(actualizar) => establecer((e) => ({ vector: actualizar(e.vector) }))} />
          <FiltroMultiple titulo="Privilegios requeridos" ayuda="privilegios" opciones={PRIVILEGIOS} seleccion={estado.privilegios} onCambio={(actualizar) => establecer((e) => ({ privilegios: actualizar(e.privilegios) }))} />
        </div>
      </CardContent>
    </Card>
  )
}
