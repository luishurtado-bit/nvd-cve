import { CircleHelp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GLOSARIO, type ClaveGlosario } from '@/lib/glosario'

/** Icono de ayuda con la definición de un término del glosario. Se abre con el mouse y con el teclado. */
export default function Ayuda({ termino }: { termino: ClaveGlosario }) {
  const { titulo, texto } = GLOSARIO[termino]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`¿Qué es ${titulo}?`}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        }
      >
        <CircleHelp className="size-3.5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-left">
        <strong>{titulo}.</strong> {texto}
      </TooltipContent>
    </Tooltip>
  )
}
