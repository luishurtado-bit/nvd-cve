import type { DistribucionOut, Severidad } from '@/api/tipos'
import TarjetaGrafica from '@/components/comunes/TarjetaGrafica'
import GraficoBarras, { type BarraDato } from '@/components/graficos/GraficoBarras'
import { etiquetaDe, SEVERIDADES } from '@/lib/dominio'
import { numero, porcentaje } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'

interface Props {
  datos: DistribucionOut | undefined
  cargando?: boolean
  error?: string | null
  className?: string
}

/** Número de CVE por severidad (P1). La severidad se lee por el nombre del eje, no solo por el color. */
export default function GraficoSeveridad({ datos, cargando, error, className }: Props) {
  const paleta = usePaleta()
  const filas = (datos?.categorias ?? []).map((c) => ({
    etiqueta: etiquetaDe(SEVERIDADES, c.categoria),
    conteo: c.conteo,
    proporcion: c.proporcion,
    color: paleta.severidad[c.categoria as Severidad] ?? paleta.neutro,
  }))
  const barras: BarraDato[] = filas.map((f) => ({
    etiqueta: f.etiqueta,
    valor: f.conteo,
    color: f.color,
    detalle: `${numero(f.conteo)} CVE (${porcentaje(f.proporcion)} del total)`,
  }))

  return (
    <TarjetaGrafica
      className={className}
      titulo="Severidad de los CVE"
      pregunta="P1"
      nombreArchivo="severidad_cve"
      cargando={cargando}
      error={error}
      vacio={datos !== undefined && datos.total === 0}
      mensajeVacio="No hay CVE con severidad en el periodo."
      descripcion={`Barras con el número de CVE por severidad: ${filas.map((f) => `${f.etiqueta}, ${numero(f.conteo)}`).join('; ')}.`}
      tabla={{
        columnas: [{ titulo: 'Severidad', tipo: 'texto' }, { titulo: 'CVE', tipo: 'entero' }, { titulo: '% del total', tipo: 'porcentaje' }],
        filas: filas.map((f) => [f.etiqueta, f.conteo, f.proporcion]),
      }}
    >
      <GraficoBarras datos={barras} nombreValor="CVE" tituloCategorias="Severidad CVSS" tituloValores="Número de CVE" />
    </TarjetaGrafica>
  )
}
