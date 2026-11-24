import Ayuda from '@/components/comunes/Ayuda'
import { Button } from '@/components/ui/button'
import type { ClaveGlosario } from '@/lib/glosario'
import type { OpcionDominio } from '@/lib/dominio'

interface Props<T extends string> {
  titulo: string
  opciones: OpcionDominio<T>[]
  seleccion: T[]
  /** Recibe una función que, dada la selección más reciente, devuelve la nueva. */
  onCambio: (actualizar: (actual: T[]) => T[]) => void
  ayuda?: ClaveGlosario
}

/** Botones que se encienden y se apagan para elegir varios valores. Sin ninguno encendido, se incluyen todos. */
export default function FiltroMultiple<T extends string>({ titulo, opciones, seleccion, onCambio, ayuda }: Props<T>) {
  function alternar(valor: T) {
    onCambio((actual) => {
      const elegidas = new Set(actual)
      if (elegidas.has(valor)) elegidas.delete(valor)
      else elegidas.add(valor)
      // Siempre en el orden de la lista, para que la consulta sea la misma sin importar el orden de los clics
      return opciones.filter((o) => elegidas.has(o.valor)).map((o) => o.valor)
    })
  }

  return (
    <fieldset className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
      <legend className="mb-1.5 flex items-center gap-1 p-0 text-sm font-medium">
        {titulo}
        {ayuda ? <Ayuda termino={ayuda} /> : null}
        <span className="font-normal text-muted-foreground">{seleccion.length === 0 ? '· todos' : ''}</span>
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((o) => {
          const encendida = seleccion.includes(o.valor)
          return (
            <Button
              key={o.valor}
              type="button"
              size="sm"
              variant={encendida ? 'default' : 'outline'}
              aria-pressed={encendida}
              title={o.texto}
              onClick={() => alternar(o.valor)}
            >
              {o.etiqueta}
            </Button>
          )
        })}
      </div>
    </fieldset>
  )
}
