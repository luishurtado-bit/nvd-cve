import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props {
  pmf: { k: number; probabilidad: number }[]
  kElegido: number
}

export default function GraficoPmf({ pmf, kElegido }: Props) {
  return (
    <div className="h-80 w-full max-w-[44rem]">
      <ResponsiveContainer>
        <BarChart data={pmf} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="k" label={{ value: 'k (número de CVE críticos)', position: 'insideBottom', offset: -15 }} />
          <YAxis label={{ value: 'P(X = k)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(valor) => Number(valor).toFixed(6)} labelFormatter={(k) => `k = ${String(k)}`} />
          <Bar dataKey="probabilidad" name="P(X = k)">
            {pmf.map((punto) => (
              <Cell key={punto.k} fill={punto.k >= kElegido ? '#d9534f' : '#5b8def'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
