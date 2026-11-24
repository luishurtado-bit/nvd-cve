import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/cliente'
import type { Agrupacion, Periodo } from '@/api/tipos'
import MensajeError from '@/components/comunes/MensajeError'
import TarjetaKpi from '@/components/comunes/TarjetaKpi'
import GraficoCriticoPor from '@/components/descriptivo/GraficoCriticoPor'
import GraficoSerieAgrupada from '@/components/descriptivo/GraficoSerieAgrupada'
import GraficoSeveridad from '@/components/descriptivo/GraficoSeveridad'
import Hallazgos from '@/components/inicio/Hallazgos'
import Limitaciones from '@/components/inicio/Limitaciones'
import Presentacion from '@/components/inicio/Presentacion'
import { Skeleton } from '@/components/ui/skeleton'
import { useDatos } from '@/contexto/datos'
import { useConsulta } from '@/hooks/use-consulta'
import { numero, porcentaje } from '@/lib/formato'
import { construirHallazgos } from '@/lib/hallazgos'

const DIA_EN_MS = 86_400_000

/** La serie se agrupa para que se pueda leer: por día si son pocos días, por mes si son muchos. */
function agrupacionSugerida(p: Periodo | undefined): Agrupacion {
  if (!p?.inicio || !p.fin) return 'semana'
  const dias = (Date.parse(p.fin) - Date.parse(p.inicio)) / DIA_EN_MS + 1
  return dias <= 21 ? 'dia' : dias <= 150 ? 'semana' : 'mes'
}

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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis ? (
            <>
              <TarjetaKpi
                etiqueta="CVE con puntuación"
                ayuda="cve"
                valor={numero(kpis.N)}
                detalle={`${numero(kpis.kev)} en el catálogo KEV de CISA`}
              />
              <TarjetaKpi
                etiqueta={`Críticos (CVSS ≥ ${numero(kpis.umbral, 1)})`}
                ayuda="critico"
                valor={kpis.proporcion_criticos === null ? null : porcentaje(kpis.proporcion_criticos)}
                detalle={`${numero(kpis.criticos)} de ${numero(kpis.N)}`}
              />
              <TarjetaKpi
                etiqueta="Mediana del CVSS"
                ayuda="cvss"
                valor={kpis.mediana_puntuacion === null ? null : numero(kpis.mediana_puntuacion, 1)}
                detalle={`Media ${numero(kpis.media_puntuacion, 1)}`}
              />
              <TarjetaKpi
                etiqueta="Explotables por red"
                ayuda="vector_red"
                valor={kpis.proporcion_red === null ? null : porcentaje(kpis.proporcion_red)}
                detalle={`${numero(kpis.red)} de ${numero(kpis.N)}`}
              />
              <TarjetaKpi
                etiqueta="Sin privilegios"
                ayuda="privilegios"
                valor={kpis.proporcion_sin_privilegios === null ? null : porcentaje(kpis.proporcion_sin_privilegios)}
                detalle={`${numero(kpis.sin_privilegios)} de ${numero(kpis.N)}`}
              />
            </>
          ) : (
            Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28" />)
          )}
        </div>
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
        ¿Quieres filtrar por fechas, severidad o vector? Mira el{' '}
        <Link to="/datos" className="underline underline-offset-2">
          dashboard con filtros
        </Link>
        .
      </p>
    </div>
  )
}
