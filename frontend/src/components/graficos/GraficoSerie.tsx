import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Agrupacion, PuntoSerie } from '@/api/tipos'
import CajaTooltip from '@/components/graficos/CajaTooltip'
import { fechaCorta, numero, porcentaje } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'

const TITULO_EJE_X: Record<Agrupacion, string> = {
  dia: 'Día de publicación',
  semana: 'Semana de publicación (empieza el lunes)',
  mes: 'Mes de publicación',
}

/** «9 nov» para días y semanas (el año ya está en el periodo) y «nov 2026» para meses. */
function marca(fecha: string, agrupar: Agrupacion): string {
  const completa = fechaCorta(fecha)
  return agrupar === 'mes' ? completa.replace(/^\d+ /, '') : completa.replace(/ \d{4}$/, '')
}

interface Props {
  puntos: PuntoSerie[]
  agrupar: Agrupacion
}

/** Barras con el número de CVE publicados por periodo y, encima, una línea con el % de críticos (eje derecho). */
export default function GraficoSerie({ puntos, agrupar }: Props) {
  const paleta = usePaleta()
  const texto = { fill: paleta.texto, fontSize: 12 }
  const titulo = { fill: paleta.textoSuave, fontSize: 12 }
  const datos = puntos.map((p) => ({ ...p, etiqueta: marca(p.fecha, agrupar), porcentajeCriticos: p.proporcion_criticos }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={datos} margin={{ top: 16, right: 8, bottom: 30, left: 8 }}>
        <CartesianGrid stroke={paleta.rejilla} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="etiqueta"
          stroke={paleta.rejilla}
          tick={texto}
          tickLine={false}
          minTickGap={12}
          label={{ value: TITULO_EJE_X[agrupar], position: 'insideBottom', offset: -16, ...titulo }}
        />
        <YAxis
          yAxisId="izquierda"
          stroke={paleta.rejilla}
          tick={texto}
          tickFormatter={(v: number) => numero(v)}
          width={76}
          label={{ value: 'Número de CVE', angle: -90, position: 'insideLeft', offset: 4, style: { textAnchor: 'middle' }, ...titulo }}
        />
        <YAxis
          yAxisId="derecha"
          orientation="right"
          stroke={paleta.rejilla}
          tick={texto}
          domain={[0, 'auto']}
          tickFormatter={(v: number) => porcentaje(v, 0)}
          width={76}
          label={{ value: '% de CVE críticos', angle: 90, position: 'insideRight', offset: 4, style: { textAnchor: 'middle' }, ...titulo }}
        />
        <Tooltip
          cursor={{ fill: paleta.rejilla, opacity: 0.4 }}
          content={({ active, payload }) => {
            const punto = payload?.[0]?.payload as (PuntoSerie & { etiqueta: string }) | undefined
            if (!active || !punto) return null
            return (
              <CajaTooltip
                titulo={agrupar === 'semana' ? `Semana del ${fechaCorta(punto.fecha)}` : fechaCorta(punto.fecha)}
                filas={[
                  { etiqueta: 'CVE publicados', valor: numero(punto.conteo), color: paleta.principal },
                  { etiqueta: 'Críticos', valor: `${numero(punto.criticos)} (${porcentaje(punto.proporcion_criticos)})`, color: paleta.critico },
                ]}
              />
            )
          }}
        />
        <Bar yAxisId="izquierda" dataKey="conteo" fill={paleta.principal} radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
        <Line
          yAxisId="derecha"
          dataKey="porcentajeCriticos"
          type="monotone"
          stroke={paleta.critico}
          strokeWidth={2.5}
          dot={{ r: 3, fill: paleta.critico, stroke: paleta.critico }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
