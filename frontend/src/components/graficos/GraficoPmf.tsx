import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { porcentaje } from '@/lib/formato'

interface Props {
  pmf: { k: number; probabilidad: number }[]
  /** Dice si la barra k cuenta para la pregunta elegida. */
  resalta: (k: number) => boolean
  kElegido: number
}

/** Bajo este valor una barra no se ve: el eje se corta y el resto se marca «≈ 0». */
const MINIMO_VISIBLE = 0.001

export default function GraficoPmf({ pmf, resalta, kElegido }: Props) {
  const ultimoVisible = pmf.reduce((max, p) => (p.probabilidad >= MINIMO_VISIBLE ? Math.max(max, p.k) : max), 0)
  const corte = Math.max(ultimoVisible, kElegido)
  const datos = pmf.filter((p) => p.k <= corte)
  const hayCorte = datos.length < pmf.length

  return (
    <div className="grid gap-2">
      <div className="h-80 w-full">
        <ResponsiveContainer>
          <BarChart data={datos} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="k"
              tick={{ fill: 'var(--muted-foreground)' }}
              stroke="var(--border)"
              label={{
                value: 'k (número de CVE críticos en el lote)',
                position: 'insideBottom',
                offset: -15,
                fill: 'var(--muted-foreground)',
              }}
            />
            <YAxis
              tick={{ fill: 'var(--muted-foreground)' }}
              stroke="var(--border)"
              tickFormatter={(v) => porcentaje(Number(v), 0)}
              label={{
                value: 'P(X = k)',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--muted-foreground)',
              }}
            />
            <Tooltip
              formatter={(valor) => [porcentaje(Number(valor), 2), 'P(X = k)']}
              labelFormatter={(k) => `k = ${String(k)}`}
              contentStyle={{
                background: 'var(--popover)',
                color: 'var(--popover-foreground)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            />
            <Bar dataKey="probabilidad" name="P(X = k)">
              {datos.map((punto) => (
                <Cell
                  key={punto.k}
                  className={resalta(punto.k) ? 'fill-chart-4' : 'fill-chart-1'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-chart-4" aria-hidden="true" />
          Cuenta para la pregunta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-chart-1" aria-hidden="true" />
          No cuenta
        </span>
        {hayCorte ? <span>Para k &gt; {corte} la probabilidad es ≈ 0.</span> : null}
      </div>
    </div>
  )
}