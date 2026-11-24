import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/cliente'
import MensajeError from '@/components/comunes/MensajeError'
import IndicadoresClave from '@/components/descriptivo/IndicadoresClave'
import GraficoCriticoPor from '@/components/descriptivo/GraficoCriticoPor'
import GraficoSerieAgrupada from '@/components/descriptivo/GraficoSerieAgrupada'
import GraficoSeveridad from '@/components/descriptivo/GraficoSeveridad'
import Hallazgos from '@/components/inicio/Hallazgos'
import Limitaciones from '@/components/inicio/Limitaciones'
import Presentacion from '@/components/inicio/Presentacion'
import { useDatos } from '@/contexto/datos'
import { useConsulta } from '@/hooks/use-consulta'
import { agrupacionSugerida } from '@/lib/agrupacion'
import { construirHallazgos } from '@/lib/hallazgos'

/** Dashboard único: el problema, los indicadores clave, los hallazgos y los gráficos de las preguntas P1 a P3. */
export default function Inicio() {
  const { resumen, cargando: leyendoResumen, error: errorResumen, version } = useDatos()
  const agrupar = agrupacionSugerida(resumen?.periodo)

  // Una sola carga: los hallazgos reutilizan los mismos datos de los gráficos
  const consulta = useConsulta(
    async (signal) => {
      const [kpis, severidad, vector, privilegios, serie] = await Promise.all([
        api.dashboard.kpis({}, { signal }),
        api.dashboard.severidad({}, { signal }),
        api.dashboard.criticoPor('vector', {}, { signal }),
        api.dashboard.criticoPor('privilegios', {}, { signal }),
        api.dashboard.serie({}, { agrupar, signal }),
      ])
      return { kpis, severidad, vector, privilegios, serie }
    },
    [version, agrupar],
    { activo: resumen !== undefined },
  )
  const datos = consulta.datos
  const kpis = datos?.kpis
  const esperando = !datos && (consulta.cargando || leyendoResumen)
  const hallazgos = useMemo(() => (datos ? construirHallazgos(datos) : []), [datos])

  if (!resumen && errorResumen) return <MensajeError mensaje={errorResumen} />

  return (
    <div className="grid gap-6">
      <Presentacion umbral={kpis?.umbral ?? 9} />

      {consulta.error ? <MensajeError mensaje={consulta.error} /> : null}

      <section aria-labelledby="titulo-kpis">
        <h2 id="titulo-kpis" className="sr-only">
          Indicadores clave
        </h2>
        <IndicadoresClave kpis={kpis} />
      </section>

      {datos && kpis ? <Hallazgos hallazgos={hallazgos} kpis={kpis} /> : null}

      <section aria-labelledby="titulo-graficos">
        <h2 id="titulo-graficos" className="sr-only">
          Gráficos
        </h2>
        {/* Seis columnas: dos gráficos por fila arriba, y abajo uno angosto (3 barras) con la serie, que necesita más ancho */}
        <div className="grid gap-6 lg:grid-cols-6">
          <GraficoSeveridad datos={datos?.severidad} cargando={esperando} className="lg:col-span-3" />
          <GraficoCriticoPor variable="vector" datos={datos?.vector} cargando={esperando} className="lg:col-span-3" />
          <GraficoCriticoPor variable="privilegios" datos={datos?.privilegios} cargando={esperando} className="lg:col-span-2" />
          <GraficoSerieAgrupada datos={datos?.serie} cargando={esperando} className="lg:col-span-4" />
        </div>
      </section>

      {resumen ? <Limitaciones resumen={resumen} /> : null}

      <p className="m-0 text-sm text-muted-foreground">
        ¿Quieres filtrar por fechas, severidad, vector o privilegios? Prueba el{' '}
        <Link to="/descriptivo" className="underline underline-offset-2">
          análisis descriptivo
        </Link>
        .
      </p>
    </div>
  )
}
