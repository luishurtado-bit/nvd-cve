import FormularioDescarga from '@/components/datos/FormularioDescarga'
import ProgresoDescarga from '@/components/datos/ProgresoDescarga'
import ResumenCarga from '@/components/datos/ResumenCarga'
import SubirCsv from '@/components/datos/SubirCsv'
import { useDatos } from '@/contexto/datos'
import { useDescarga } from '@/hooks/use-descarga'

/** Carga de datos: descarga de la NVD con progreso real, subida de un CSV y resumen de lo que quedó cargado. */
export default function CargaDatos() {
  const { alCargar, recargar } = useDatos()
  const descarga = useDescarga(alCargar)

  return (
    <div className="grid gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="grid gap-4">
          <FormularioDescarga ocupado={descarga.activa} onDescargar={(entrada) => void descarga.iniciar(entrada)} />
          <ProgresoDescarga
            descarga={descarga.descarga}
            progreso={descarga.progreso}
            activa={descarga.activa}
            error={descarga.error}
            aviso={descarga.aviso}
            onDejarDeSeguir={descarga.dejarDeSeguir}
            onActualizar={() => void recargar()}
          />
        </div>
        <SubirCsv />
      </div>
      <ResumenCarga />
    </div>
  )
}
