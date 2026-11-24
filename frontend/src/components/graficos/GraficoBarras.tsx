import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import CajaTooltip from '@/components/graficos/CajaTooltip'
import { numero } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'

export interface BarraDato {
  etiqueta: string
  valor: number
  /** Color de la barra; por defecto, el color principal del tema. */
  color?: string
  /** Texto del tooltip en lugar del valor, por ejemplo «8,7 % (311 de 3.559)». */
  detalle?: string
}

interface Props {
  datos: BarraDato[]
  /** Qué mide la barra, para el tooltip: «CVE», «% de críticos». */
  nombreValor: string
  tituloEjeX?: string
  tituloEjeY?: string
  /** Cómo se escribe un valor en el eje y sobre las barras (por defecto, número entero). */
  formatoValor?: (valor: number) => string
  /** Valor de una línea horizontal punteada de comparación, por ejemplo el porcentaje de todo el conjunto (se explica en la leyenda). */
  referencia?: number
}

/** Barras verticales con título en los ejes, cifra sobre cada barra y colores del tema. */
export default function GraficoBarras({ datos, nombreValor, tituloEjeX, tituloEjeY, formatoValor = (v) => numero(v), referencia }: Props) {
  const paleta = usePaleta()
  const marca = { fill: paleta.texto, fontSize: 12 }
  const titulo = { fill: paleta.textoSuave, fontSize: 12 }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datos} margin={{ top: 22, right: 16, bottom: tituloEjeX ? 30 : 8, left: 8 }}>
        <CartesianGrid stroke={paleta.rejilla} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="etiqueta"
          stroke={paleta.rejilla}
          tick={marca}
          tickLine={false}
          label={tituloEjeX ? { value: tituloEjeX, position: 'insideBottom', offset: -16, ...titulo } : undefined}
        />
        <YAxis
          stroke={paleta.rejilla}
          tick={marca}
          tickFormatter={formatoValor}
          width={tituloEjeY ? 76 : 60}
          label={tituloEjeY ? { value: tituloEjeY, angle: -90, position: 'insideLeft', offset: 4, style: { textAnchor: 'middle' }, ...titulo } : undefined}
        />
        <Tooltip
          cursor={{ fill: paleta.rejilla, opacity: 0.4 }}
          content={({ active, payload }) => {
            const barra = payload?.[0]?.payload as BarraDato | undefined
            if (!active || !barra) return null
            return (
              <CajaTooltip
                titulo={barra.etiqueta}
                filas={[{ etiqueta: nombreValor, valor: barra.detalle ?? formatoValor(barra.valor), color: barra.color ?? paleta.principal }]}
              />
            )
          }}
        />
        {referencia !== undefined ? <ReferenceLine y={referencia} stroke={paleta.textoSuave} strokeDasharray="6 4" /> : null}
        <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={72} isAnimationActive={false}>
          {datos.map((d) => (
            <Cell key={d.etiqueta} fill={d.color ?? paleta.principal} />
          ))}
          <LabelList dataKey="valor" position="top" formatter={(v) => formatoValor(Number(v))} fill={paleta.texto} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
