import type { CriticoPorOut, VariableGrupo } from '@/api/tipos'
import TarjetaGrafica from '@/components/comunes/TarjetaGrafica'
import GraficoBarras, { type BarraDato } from '@/components/graficos/GraficoBarras'
import { etiquetaDe, PRIVILEGIOS, VECTORES } from '@/lib/dominio'
import { fraccion, porcentaje } from '@/lib/formato'
import { usePaleta } from '@/lib/paleta'

interface Variable {
  titulo: string
  eje: string
  nombreArchivo: string
  etiqueta: (grupo: string) => string
}

const VARIABLES: Record<VariableGrupo, Variable> = {
  vector: { titulo: 'Críticos por vector de ataque', eje: 'Vector de ataque', nombreArchivo: 'pct_critico_vector', etiqueta: (g) => etiquetaDe(VECTORES, g) },
  privilegios: { titulo: 'Críticos por privilegios requeridos', eje: 'Privilegios requeridos', nombreArchivo: 'pct_critico_privilegios', etiqueta: (g) => etiquetaDe(PRIVILEGIOS, g) },
  version: { titulo: 'Críticos por versión de CVSS', eje: 'Versión de CVSS', nombreArchivo: 'pct_critico_version', etiqueta: (g) => `CVSS ${g}` },
  fuente: { titulo: 'Críticos por fuente (CNA)', eje: 'Fuente', nombreArchivo: 'pct_critico_fuente', etiqueta: (g) => g },
}

interface Props {
  variable: VariableGrupo
  datos: CriticoPorOut | undefined
  cargando?: boolean
  error?: string | null
  className?: string
}

/** Porcentaje de críticos dentro de cada grupo, contra el de todo el conjunto (línea punteada). Es una observación, no una causa. */
export default function GraficoCriticoPor({ variable, datos, cargando, error, className }: Props) {
  const v = VARIABLES[variable]
  const paleta = usePaleta()
  const grupos = datos?.grupos ?? []
  const barras: BarraDato[] = grupos.map((g) => ({
    etiqueta: v.etiqueta(g.grupo),
    valor: g.proporcion_criticos,
    detalle: fraccion(g.criticos, g.total),
  }))
  const global = datos?.proporcion_criticos ?? null

  return (
    <TarjetaGrafica
      className={className}
      titulo={v.titulo}
      pregunta="P2"
      nombreArchivo={v.nombreArchivo}
      cargando={cargando}
      error={error}
      vacio={datos !== undefined && grupos.length === 0}
      mensajeVacio="No hay CVE con este dato en el periodo."
      descripcion={
        `Barras con el porcentaje de CVE críticos por ${v.eje.toLowerCase()}: ` +
        `${grupos.map((g) => `${v.etiqueta(g.grupo)}, ${porcentaje(g.proporcion_criticos)}`).join('; ')}. ` +
        (global !== null ? `En todo el conjunto, ${porcentaje(global)}.` : '')
      }
      tabla={{
        columnas: [{ titulo: v.eje, tipo: 'texto' }, { titulo: 'CVE', tipo: 'entero' }, { titulo: 'Críticos', tipo: 'entero' }, { titulo: '% de críticos', tipo: 'porcentaje' }],
        filas: grupos.map((g) => [v.etiqueta(g.grupo), g.total, g.criticos, g.proporcion_criticos]),
      }}
      leyenda={global !== null ? [{ color: paleta.textoSuave, texto: `Línea punteada: todos los CVE, ${porcentaje(global)}`, forma: 'linea' }] : undefined}
    >
      <GraficoBarras
        datos={barras}
        nombreValor="Críticos"
        tituloEjeX={v.eje}
        tituloEjeY="% de CVE críticos"
        formatoValor={(x) => porcentaje(x)}
        referencia={global ?? undefined}
      />
    </TarjetaGrafica>
  )
}
