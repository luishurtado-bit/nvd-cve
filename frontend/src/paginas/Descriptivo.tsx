import { api } from '@/api/cliente'
import MensajeError from '@/components/comunes/MensajeError'
import CriticoPorVariable from '@/components/descriptivo/CriticoPorVariable'
import FiltrosGlobales from '@/components/descriptivo/FiltrosGlobales'
import GraficoCruce from '@/components/descriptivo/GraficoCruce'
import GraficoFuentes from '@/components/descriptivo/GraficoFuentes'
import GraficoHistograma from '@/components/descriptivo/GraficoHistograma'
import GraficoSerieAgrupada from '@/components/descriptivo/GraficoSerieAgrupada'
import GraficoSeveridad from '@/components/descriptivo/GraficoSeveridad'
import IndicadoresClave from '@/components/descriptivo/IndicadoresClave'
import TablaCwe from '@/components/descriptivo/TablaCwe'
import TablaResumenNumerico from '@/components/descriptivo/TablaResumenNumerico'
import { useDatos } from '@/contexto/datos'
import { useFiltros } from '@/contexto/filtros'
import { useConsulta } from '@/hooks/use-consulta'
import { cn } from '@/lib/utils'

const TOP_FUENTES = 10
const TRAMOS_HISTOGRAMA = 10

/**
 * Análisis descriptivo: los mismos indicadores y gráficos del inicio, pero con filtros. Cada filtro
 * viaja al backend y cambia todo a la vez; mientras llegan los datos nuevos se conservan los anteriores.
 */
export default function Descriptivo() {
  const { resumen, error: errorResumen, version } = useDatos()
  const { filtros, estado } = useFiltros()
  // Se espera al resumen: de él depende la agrupación inicial, y así no se pide dos veces al abrir
  const opciones = { retardo: 300, activo: resumen !== undefined }
  const deps = [filtros, version]

  const kpis = useConsulta((signal) => api.dashboard.kpis(filtros, { signal }), deps, opciones)
  const severidad = useConsulta((signal) => api.dashboard.severidad(filtros, { signal }), deps, opciones)
  const histograma = useConsulta((signal) => api.dashboard.histograma(filtros, { bins: TRAMOS_HISTOGRAMA, signal }), deps, opciones)
  const cruce = useConsulta((signal) => api.dashboard.cruce(filtros, { fila: 'severidad', columna: 'vector', signal }), deps, opciones)
  const serie = useConsulta((signal) => api.dashboard.serie(filtros, { agrupar: estado.agrupar, signal }), [...deps, estado.agrupar], opciones)
  const fuentes = useConsulta((signal) => api.dashboard.fuentes(filtros, { top: TOP_FUENTES, signal }), deps, opciones)
  const numerico = useConsulta((signal) => api.dashboard.resumenNumerico(filtros, { signal }), deps, opciones)

  const consultas = [kpis, severidad, histograma, cruce, serie, fuentes, numerico]
  const ocupado = consultas.some((c) => c.cargando)
  // Solo la primera vez se muestra un esqueleto; después se ven los datos anteriores hasta que lleguen los nuevos
  const primera = (c: { cargando: boolean; datos: unknown }) => c.cargando && !c.datos

  if (!resumen && errorResumen) return <MensajeError mensaje={errorResumen} />

  return (
    <div className="grid gap-6">
      <FiltrosGlobales cumplen={kpis.datos?.N} total={kpis.datos?.N_sin_filtro} />

      {kpis.error ? <MensajeError mensaje={kpis.error} /> : null}

      <div aria-busy={ocupado} className={cn('grid gap-6 transition-opacity', ocupado && 'opacity-60')}>
        <section aria-labelledby="titulo-kpis-desc">
          <h2 id="titulo-kpis-desc" className="sr-only">
            Indicadores clave
          </h2>
          <IndicadoresClave kpis={kpis.datos} />
        </section>

        <section aria-labelledby="titulo-graficos-desc">
          <h2 id="titulo-graficos-desc" className="sr-only">
            Gráficos y tablas
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <GraficoSeveridad datos={severidad.datos} cargando={primera(severidad)} error={severidad.error} />
            <GraficoHistograma datos={histograma.datos} umbral={kpis.datos?.umbral} cargando={primera(histograma)} error={histograma.error} />
            <GraficoCruce datos={cruce.datos} cargando={primera(cruce)} error={cruce.error} />
            <CriticoPorVariable />
            <GraficoSerieAgrupada datos={serie.datos} cargando={primera(serie)} error={serie.error} className="lg:col-span-2" />
            <GraficoFuentes datos={fuentes.datos} cargando={primera(fuentes)} error={fuentes.error} />
            <TablaCwe totalCve={kpis.datos?.N} />
            <TablaResumenNumerico datos={numerico.datos} cargando={primera(numerico)} error={numerico.error} className="lg:col-span-2" />
          </div>
        </section>
      </div>
    </div>
  )
}
