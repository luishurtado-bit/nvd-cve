import type { SerieDiariaOut } from '@/api/tipos'
import TarjetaGrafica from '@/components/comunes/TarjetaGrafica'
import GraficoSerie from '@/components/graficos/GraficoSerie'
import { fechaCorta, numero } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'

const POR = { dia: 'día', semana: 'semana', mes: 'mes' } as const

interface Props {
  datos: SerieDiariaOut | undefined
  cargando?: boolean
  error?: string | null
  className?: string
}

/** CVE publicados por día, semana o mes, con el porcentaje de críticos de cada periodo (P3). */
export default function GraficoSerieAgrupada({ datos, cargando, error, className }: Props) {
  const paleta = usePaleta()
  const puntos = datos?.puntos ?? []
  const agrupar = datos?.agrupar ?? 'semana'
  const pico = puntos.length ? puntos.reduce((a, b) => (b.conteo > a.conteo ? b : a)) : undefined

  return (
    <TarjetaGrafica
      className={className}
      titulo={`CVE publicados y cuántos son críticos, por ${POR[agrupar]}`}
      pregunta="P3"
      nombreArchivo={`serie_cve_${agrupar}`}
      altura={320}
      cargando={cargando}
      error={error}
      vacio={datos !== undefined && puntos.length === 0}
      mensajeVacio="No hay CVE publicados en el periodo."
      descripcion={
        `Barras apiladas: la altura es el total de CVE publicados por ${POR[agrupar]} y la parte inferior son los críticos. ` +
        (puntos.length
          ? `Desde ${fechaCorta(puntos[0].fecha)} hasta ${fechaCorta(puntos[puntos.length - 1].fecha)}, ${numero(datos?.total)} CVE en total` +
            (pico ? `; el máximo fue ${numero(pico.conteo)} CVE el periodo que empieza el ${fechaCorta(pico.fecha)}.` : '.')
          : '')
      }
      leyenda={[
        { color: paleta.principal, texto: 'Resto de CVE publicados' },
        { color: paleta.critico, texto: 'CVE críticos (dentro de cada barra)' },
      ]}
      tabla={{
        columnas: [
          { titulo: agrupar === 'dia' ? 'Día' : agrupar === 'semana' ? 'Semana (lunes)' : 'Mes', tipo: 'texto' },
          { titulo: 'CVE', tipo: 'entero' },
          { titulo: 'Críticos', tipo: 'entero' },
          { titulo: '% de críticos', tipo: 'porcentaje' },
        ],
        filas: puntos.map((p) => [fechaCorta(p.fecha), p.conteo, p.criticos, p.proporcion_criticos ?? null]),
      }}
    >
      <GraficoSerie puntos={puntos} agrupar={agrupar} />
    </TarjetaGrafica>
  )
}
