import type { KpisOut } from '@/api/tipos'
import TarjetaKpi from '@/components/comunes/TarjetaKpi'
import { Skeleton } from '@/components/ui/skeleton'
import { numero, porcentaje } from '@/lib/formato'

/** Los cinco indicadores clave. Sin datos todavía, muestra esqueletos del mismo tamaño. */
export default function IndicadoresClave({ kpis }: { kpis: KpisOut | undefined }) {
  return (
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
  )
}
