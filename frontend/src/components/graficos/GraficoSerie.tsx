import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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

/**
 * Una barra por periodo con el total de CVE publicados; la parte de abajo, en otro color, son los
 * críticos. Un solo eje (número de CVE): el % de críticos se lee en el tooltip y en la tabla.
 */
export default function GraficoSerie({ puntos, agrupar }: Props) {
  const paleta = usePaleta()
  const texto = { fill: paleta.texto, fontSize: 12 }
  const titulo = { fill: paleta.textoSuave, fontSize: 12 }
  const datos = puntos.map((p) => ({ ...p, etiqueta: marca(p.fecha, agrupar), noCriticos: p.conteo - p.criticos }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datos} margin={{ top: 16, right: 8, bottom: 30, left: 8 }}>
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
          stroke={paleta.rejilla}
          tick={texto}
          tickFormatter={(v: number) => numero(v)}
          width={76}
          label={{ value: 'Número de CVE', angle: -90, position: 'insideLeft', offset: 4, style: { textAnchor: 'middle' }, ...titulo }}
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
        <Bar dataKey="criticos" stackId="cve" fill={paleta.critico} maxBarSize={40} isAnimationActive={false} />
        <Bar dataKey="noCriticos" stackId="cve" fill={paleta.principal} radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
