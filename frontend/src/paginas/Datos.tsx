import { useSearchParams } from 'react-router-dom'
import CalidadDatos from '@/components/calidad/CalidadDatos'
import Pestanas from '@/components/comunes/Pestanas'
import { idPanel, idPestana } from '@/components/comunes/ids-pestanas'
import CargaDatos from '@/components/datos/CargaDatos'

const PESTANAS = [
  { id: 'cargar', titulo: 'Cargar datos' },
  { id: 'calidad', titulo: 'Calidad de los datos' },
]

/** Carga de datos y reporte de calidad. La pestaña va en la URL (`?pestana=calidad`), así se puede enlazar directo. */
export default function Datos() {
  const [params, setParams] = useSearchParams()
  const activa = params.get('pestana') === 'calidad' ? 'calidad' : 'cargar'

  return (
    <div className="grid gap-6">
      <Pestanas
        etiqueta="Secciones de datos"
        pestanas={PESTANAS}
        activa={activa}
        onCambio={(id) => setParams(id === 'cargar' ? {} : { pestana: id })}
      />
      <div role="tabpanel" id={idPanel(activa)} aria-labelledby={idPestana(activa)}>
        {activa === 'cargar' ? <CargaDatos /> : <CalidadDatos />}
      </div>
    </div>
  )
}
