import type { HistogramaOut } from '@/api/tipos'
import TarjetaGrafica from '@/components/comunes/TarjetaGrafica'
import GraficoBarras, { type BarraDato } from '@/components/graficos/GraficoBarras'
import { numero, porcentaje } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'

interface Props {
  datos: HistogramaOut | undefined
  /** A partir de qué puntuación un CVE es crítico: esas barras van en rojo. */
  umbral?: number
  cargando?: boolean
  error?: string | null
  className?: string
}

/** Cuántos CVE hay en cada tramo de la puntuación CVSS (0 a 10), con los críticos resaltados (P1). */
export default function GraficoHistograma({ datos, umbral = 9, cargando, error, className }: Props) {
  const paleta = usePaleta()
  const total = datos?.n ?? 0
  const intervalos = datos?.intervalos ?? []
  const barras: BarraDato[] = intervalos.map((i) => ({
    etiqueta: `${numero(i.desde)}–${numero(i.hasta)}`,
    valor: i.conteo,
    color: i.desde >= umbral ? paleta.critico : paleta.principal,
    detalle: `${numero(i.conteo)} CVE (${porcentaje(total ? i.conteo / total : null)})`,
  }))

  return (
    <TarjetaGrafica
      className={className}
      titulo="Distribución de la puntuación CVSS"
      pregunta="P1"
      nombreArchivo="histograma_cvss"
      cargando={cargando}
      error={error}
      vacio={datos !== undefined && total === 0}
      mensajeVacio="No hay CVE con puntuación."
      descripcion={
        `Histograma de la puntuación CVSS en ${intervalos.length} tramos de 0 a 10. ` +
        (datos?.media != null && datos?.mediana != null
          ? `La media es ${numero(datos.media, 2)} y la mediana ${numero(datos.mediana, 2)}. `
          : '') +
        `Los tramos desde ${numero(umbral, 1)} son críticos.`
      }
      leyenda={[
        { color: paleta.principal, texto: `CVSS menor a ${numero(umbral, 1)}` },
        { color: paleta.critico, texto: `Críticos (CVSS ≥ ${numero(umbral, 1)})` },
      ]}
      tabla={{
        columnas: [{ titulo: 'Tramo de puntuación', tipo: 'texto' }, { titulo: 'CVE', tipo: 'entero' }, { titulo: '% del total', tipo: 'porcentaje' }],
        filas: intervalos.map((i, k) => [barras[k].etiqueta, i.conteo, total ? i.conteo / total : null]),
      }}
    >
      <GraficoBarras datos={barras} nombreValor="CVE" tituloCategorias="Puntuación CVSS base (el último tramo incluye el 10)" tituloValores="Número de CVE" />
    </TarjetaGrafica>
  )
}
