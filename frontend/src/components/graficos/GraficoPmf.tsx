import { useRef } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { useDatos } from '@/contexto/datos'
import { porcentaje } from '@/lib/formato'
import { textoFuente } from '@/lib/fuente'
import { usePaleta } from '@/lib/paleta'
import { descargarPng } from '@/utils/exportarPng'

interface Props {
  pmf: { k: number; probabilidad: number }[]
  /** Dice si la barra k cuenta para la pregunta elegida. */
  resalta: (k: number) => boolean
  kElegido: number
  /** La pregunta que responde el gráfico, para el PNG. */
  subtitulo?: string
}

/** Bajo este valor una barra no se ve: el eje se corta y el resto se marca «≈ 0». */
const MINIMO_VISIBLE = 0.001

export default function GraficoPmf({ pmf, resalta, kElegido, subtitulo }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const { resumen } = useDatos()
  const paleta = usePaleta()

  const ultimoVisible = pmf.reduce((max, p) => (p.probabilidad >= MINIMO_VISIBLE ? Math.max(max, p.k) : max), 0)
  const corte = Math.max(ultimoVisible, kElegido)
  const datos = pmf.filter((p) => p.k <= corte)
  const hayCorte = datos.length < pmf.length

  function guardarPng() {
    if (!contenedor.current) return
    // El PNG necesita colores literales: se leen del tema que esté activo
    const css = getComputedStyle(document.documentElement)
    descargarPng(contenedor.current, 'binomial-distribucion', {
      titulo: 'Distribución binomial: probabilidad de cada número de críticos',
      subtitulo,
      leyenda: [
        { color: css.getPropertyValue('--chart-4').trim(), texto: 'Cuenta para la pregunta' },
        { color: css.getPropertyValue('--chart-1').trim(), texto: 'No cuenta' },
      ],
      fuente: textoFuente(resumen),
      fondo: paleta.fondo,
      texto: paleta.texto,
      textoSuave: paleta.textoSuave,
    })
  }

  return (
    <div className="grid gap-2">
      <div ref={contenedor} className="h-80 w-full">
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
                <Cell key={punto.k} fill={resalta(punto.k) ? 'var(--chart-4)' : 'var(--chart-1)'} />
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
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={guardarPng}>
          <Download aria-hidden="true" /> PNG
        </Button>
      </div>
    </div>
  )
}