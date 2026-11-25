import { Download } from 'lucide-react'
import { urlExportar, type RecursoExportable } from '@/api/cliente'
import type { Params } from '@/api/consulta'
import { buttonVariants } from '@/components/ui/button'

interface Props {
  recurso: RecursoExportable
  /** Los mismos valores del cálculo que se ve en pantalla. */
  params: Params
  texto?: string
}

/** Enlace de descarga de un CSV de /api/exportar/*, con aspecto de botón. */
export default function BotonExportar({ recurso, params, texto = 'CSV' }: Props) {
  return (
    <a
      href={urlExportar(recurso, params)}
      download
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
      aria-label={`Descargar ${recurso} como CSV`}
    >
      <Download aria-hidden="true" /> {texto}
    </a>
  )
}