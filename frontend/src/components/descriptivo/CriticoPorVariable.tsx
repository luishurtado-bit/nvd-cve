import { useState } from 'react'
import { api } from '@/api/cliente'
import type { VariableGrupo } from '@/api/tipos'
import { Campo } from '@/components/campo'
import GraficoCriticoPor from '@/components/descriptivo/GraficoCriticoPor'
import { SelectOpciones } from '@/components/select-opciones'
import { useDatos } from '@/contexto/datos'
import { useFiltros } from '@/contexto/filtros'
import { useConsulta } from '@/hooks/use-consulta'

const VARIABLES: { valor: VariableGrupo; texto: string }[] = [
  { valor: 'vector', texto: 'Vector de ataque' },
  { valor: 'privilegios', texto: 'Privilegios requeridos' },
  { valor: 'version', texto: 'Versión de CVSS' },
  { valor: 'fuente', texto: 'Fuente (CNA)' },
]

const TOP_FUENTES = 8

/** El % de críticos de cada grupo, con un selector para elegir por cuál variable se reparte. Responde a los filtros globales. */
export default function CriticoPorVariable({ className }: { className?: string }) {
  const { version } = useDatos()
  const { filtros } = useFiltros()
  const [variable, setVariable] = useState<VariableGrupo>('vector')

  const consulta = useConsulta(
    (signal) =>
      api.dashboard.criticoPor(variable, filtros, { top: variable === 'fuente' ? TOP_FUENTES : undefined, signal }),
    [variable, filtros, version],
    { retardo: 300 },
  )

  return (
    <GraficoCriticoPor
      className={className}
      // Mientras llega la variable nueva, el gráfico sigue siendo coherente con los datos que ya tiene
      variable={consulta.datos?.variable ?? variable}
      datos={consulta.datos}
      cargando={consulta.cargando && !consulta.datos}
      error={consulta.error}
      controles={
        <Campo etiqueta="Repartir por" htmlFor="critico-por-variable">
          <SelectOpciones id="critico-por-variable" opciones={VARIABLES} valor={variable} onCambio={setVariable} />
        </Campo>
      }
    />
  )
}
