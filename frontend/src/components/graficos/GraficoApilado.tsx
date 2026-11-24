import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import CajaTooltip from '@/components/graficos/CajaTooltip'
import { numero, porcentaje } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'

export interface SerieApilada {
  clave: string
  etiqueta: string
  color: string
}

export interface FilaApilada {
  etiqueta: string
  total: number
  /** Conteo de cada serie, por su clave. Una serie que falta cuenta como 0. */
  valores: Record<string, number>
}

interface Props {
  filas: FilaApilada[]
  series: SerieApilada[]
  tituloCategorias?: string
  tituloValores?: string
}

/** Barras apiladas al 100 %: de cada categoría, qué parte corresponde a cada serie. */
export default function GraficoApilado({ filas, series, tituloCategorias, tituloValores }: Props) {
  const paleta = usePaleta()
  const marca = { fill: paleta.texto, fontSize: 12 }
  const titulo = { fill: paleta.textoSuave, fontSize: 12 }
  const datos = filas.map((f) => ({ etiqueta: f.etiqueta, total: f.total, ...f.valores }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datos} stackOffset="expand" margin={{ top: 16, right: 16, bottom: tituloCategorias ? 30 : 8, left: 8 }}>
        <CartesianGrid stroke={paleta.rejilla} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="etiqueta"
          stroke={paleta.rejilla}
          tick={marca}
          tickLine={false}
          label={tituloCategorias ? { value: tituloCategorias, position: 'insideBottom', offset: -16, ...titulo } : undefined}
        />
        <YAxis
          stroke={paleta.rejilla}
          tick={marca}
          tickFormatter={(v: number) => porcentaje(v, 0)}
          width={tituloValores ? 76 : 60}
          label={tituloValores ? { value: tituloValores, angle: -90, position: 'insideLeft', offset: 4, style: { textAnchor: 'middle' }, ...titulo } : undefined}
        />
        <Tooltip
          cursor={{ fill: paleta.rejilla, opacity: 0.4 }}
          content={({ active, payload }) => {
            const fila = payload?.[0]?.payload as ({ etiqueta: string; total: number } & Record<string, number | string>) | undefined
            if (!active || !fila) return null
            return (
              <CajaTooltip
                titulo={`${fila.etiqueta} (${numero(fila.total)} CVE)`}
                filas={series.map((s) => {
                  const n = Number(fila[s.clave] ?? 0)
                  return { etiqueta: s.etiqueta, valor: `${numero(n)} (${porcentaje(fila.total ? n / fila.total : null)})`, color: s.color }
                })}
              />
            )
          }}
        />
        {series.map((s) => (
          <Bar key={s.clave} dataKey={s.clave} stackId="apilado" fill={s.color} maxBarSize={72} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
