import type { DistribucionOut } from '@/api/tipos'
import TarjetaGrafica from '@/components/comunes/TarjetaGrafica'
import GraficoBarras, { type BarraDato } from '@/components/graficos/GraficoBarras'
import { numero, porcentaje } from '@/lib/formato'

interface Props {
  datos: DistribucionOut | undefined
  cargando?: boolean
  error?: string | null
  className?: string
}

/** Las fuentes (CNA) que más CVE publicaron en el periodo (P3). */
export default function GraficoFuentes({ datos, cargando, error, className }: Props) {
  const categorias = datos?.categorias ?? []
  const barras: BarraDato[] = categorias.map((c) => ({
    etiqueta: c.categoria,
    valor: c.conteo,
    detalle: `${numero(c.conteo)} CVE (${porcentaje(c.proporcion)} del total)`,
  }))

  return (
    <TarjetaGrafica
      className={className}
      titulo="Fuentes que más CVE publicaron"
      subtitulo="¿Qué organizaciones (CNA) publican la mayor parte de los CVE?"
      pregunta="P3"
      nombreArchivo="fuentes_cve"
      altura={360}
      cargando={cargando}
      error={error}
      vacio={datos !== undefined && categorias.length === 0}
      mensajeVacio="No hay CVE con fuente en el periodo."
      descripcion={`Barras horizontales con los CVE publicados por cada una de las ${categorias.length} fuentes con más publicaciones: ${categorias.map((c) => `${c.categoria}, ${numero(c.conteo)}`).join('; ')}.`}
      tabla={{
        columnas: [{ titulo: 'Fuente (CNA)', tipo: 'texto' }, { titulo: 'CVE', tipo: 'entero' }, { titulo: '% del total', tipo: 'porcentaje' }],
        filas: categorias.map((c) => [c.categoria, c.conteo, c.proporcion]),
      }}
    >
      <GraficoBarras datos={barras} nombreValor="CVE" horizontal tituloValores="Número de CVE" />
    </TarjetaGrafica>
  )
}
