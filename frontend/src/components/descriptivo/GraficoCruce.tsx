import type { CruceOut } from '@/api/tipos'
import TarjetaGrafica from '@/components/comunes/TarjetaGrafica'
import GraficoApilado, { type FilaApilada, type SerieApilada } from '@/components/graficos/GraficoApilado'
import { etiquetaDe, SEVERIDADES, VECTORES } from '@/lib/dominio'
import { porcentaje } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'

interface Props {
  datos: CruceOut | undefined
  cargando?: boolean
  error?: string | null
  className?: string
}

/** De los CVE de cada severidad, qué parte tiene cada vector de ataque (barras apiladas al 100 %, P2). */
export default function GraficoCruce({ datos, cargando, error, className }: Props) {
  const paleta = usePaleta()
  const orden = VECTORES.map((v) => v.valor as string)
  // Cada vector conserva siempre su color, aunque otros no aparezcan en los datos filtrados
  const series: SerieApilada[] = [...(datos?.columnas ?? [])]
    .sort((a, b) => orden.indexOf(a) - orden.indexOf(b))
    .map((c) => ({
      clave: c,
      etiqueta: etiquetaDe(VECTORES, c),
      color: paleta.serie[Math.max(0, orden.indexOf(c)) % paleta.serie.length],
    }))
  const filas: FilaApilada[] = (datos?.filas ?? []).map((f) => ({
    etiqueta: etiquetaDe(SEVERIDADES, f.categoria),
    total: f.total,
    valores: Object.fromEntries(f.celdas.map((c) => [c.categoria, c.conteo])),
  }))
  const primera = datos?.filas[0]

  return (
    <TarjetaGrafica
      className={className}
      titulo="Severidad según el vector de ataque"
      pregunta="P2"
      nombreArchivo="severidad_por_vector"
      altura={320}
      cargando={cargando}
      error={error}
      vacio={datos !== undefined && filas.length === 0}
      mensajeVacio="No hay CVE con severidad y vector en el periodo."
      descripcion={
        'Barras apiladas al 100 %: para cada severidad, qué parte de los CVE tiene cada vector de ataque. ' +
        (primera
          ? `Entre los de severidad ${etiquetaDe(SEVERIDADES, primera.categoria)}: ` +
            primera.celdas.map((c) => `${etiquetaDe(VECTORES, c.categoria)} ${porcentaje(c.proporcion)}`).join('; ') +
            '.'
          : '')
      }
      leyenda={series.map((s) => ({ color: s.color, texto: s.etiqueta }))}
      tabla={{
        columnas: [{ titulo: 'Severidad', tipo: 'texto' }, ...series.map((s) => ({ titulo: s.etiqueta, tipo: 'entero' as const })), { titulo: 'Total', tipo: 'entero' }],
        filas: filas.map((f) => [f.etiqueta, ...series.map((s) => f.valores[s.clave] ?? 0), f.total]),
      }}
    >
      <GraficoApilado filas={filas} series={series} tituloCategorias="Severidad CVSS" tituloValores="% de los CVE de cada severidad" />
    </TarjetaGrafica>
  )
}
