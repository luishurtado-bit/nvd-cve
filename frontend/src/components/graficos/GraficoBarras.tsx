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
  /** Título del eje de las categorías. En horizontal no se escribe: los nombres ya se leen al lado de cada barra. */
  tituloCategorias?: string
  /** Título del eje de los valores. */
  tituloValores?: string
  /** Cómo se escribe un valor en el eje y sobre las barras (por defecto, número entero). */
  formatoValor?: (valor: number) => string
  /** Valor de una línea punteada de comparación, por ejemplo el porcentaje de todo el conjunto (se explica en la leyenda). */
  referencia?: number
  /** Barras horizontales: para categorías con nombres largos (fuentes, debilidades). */
  horizontal?: boolean
}

const ANCHO_CATEGORIAS = 210
const MAX_CARACTERES_CATEGORIA = 34

function acortar(texto: string): string {
  return texto.length > MAX_CARACTERES_CATEGORIA ? `${texto.slice(0, MAX_CARACTERES_CATEGORIA - 1)}…` : texto
}

/** Barras con título en los ejes, cifra junto a cada barra y colores del tema. */
export default function GraficoBarras({
  datos,
  nombreValor,
  tituloCategorias,
  tituloValores,
  formatoValor = (v) => numero(v),
  referencia,
  horizontal = false,
}: Props) {
  const paleta = usePaleta()
  const marca = { fill: paleta.texto, fontSize: 12 }
  const titulo = { fill: paleta.textoSuave, fontSize: 12 }

  const ejeCategorias = horizontal ? (
    <YAxis type="category" dataKey="etiqueta" width={ANCHO_CATEGORIAS} stroke={paleta.rejilla} tick={marca} tickLine={false} tickFormatter={acortar} interval={0} />
  ) : (
    <XAxis
      dataKey="etiqueta"
      stroke={paleta.rejilla}
      tick={marca}
      tickLine={false}
      label={tituloCategorias ? { value: tituloCategorias, position: 'insideBottom', offset: -16, ...titulo } : undefined}
    />
  )
  const ejeValores = horizontal ? (
    <XAxis
      type="number"
      stroke={paleta.rejilla}
      tick={marca}
      tickFormatter={formatoValor}
      label={tituloValores ? { value: tituloValores, position: 'insideBottom', offset: -16, ...titulo } : undefined}
    />
  ) : (
    <YAxis
      stroke={paleta.rejilla}
      tick={marca}
      tickFormatter={formatoValor}
      width={tituloValores ? 76 : 60}
      label={tituloValores ? { value: tituloValores, angle: -90, position: 'insideLeft', offset: 4, style: { textAnchor: 'middle' }, ...titulo } : undefined}
    />
  )
  const margen = horizontal
    ? { top: 8, right: 64, bottom: tituloValores ? 30 : 8, left: 8 }
    : { top: 22, right: 16, bottom: tituloCategorias ? 30 : 8, left: 8 }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datos} layout={horizontal ? 'vertical' : 'horizontal'} margin={margen}>
        <CartesianGrid stroke={paleta.rejilla} strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} />
        {ejeCategorias}
        {ejeValores}
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
        {referencia !== undefined ? (
          <ReferenceLine {...(horizontal ? { x: referencia } : { y: referencia })} stroke={paleta.textoSuave} strokeDasharray="6 4" />
        ) : null}
        <Bar dataKey="valor" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 28 : 72} isAnimationActive={false}>
          {datos.map((d) => (
            <Cell key={d.etiqueta} fill={d.color ?? paleta.principal} />
          ))}
          <LabelList dataKey="valor" position={horizontal ? 'right' : 'top'} formatter={(v) => formatoValor(Number(v))} fill={paleta.texto} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
