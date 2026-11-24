import { useRef, type KeyboardEvent } from 'react'
import { idPanel, idPestana } from '@/components/comunes/ids-pestanas'
import { cn } from '@/lib/utils'

export interface Pestana {
  id: string
  titulo: string
}

interface Props {
  pestanas: Pestana[]
  activa: string
  onCambio: (id: string) => void
  /** Nombre del grupo para lectores de pantalla. */
  etiqueta: string
}

/** Pestañas accesibles: se recorren con las flechas, Inicio y Fin. El contenido lo pone quien las usa, dentro de un `role="tabpanel"`. */
export default function Pestanas({ pestanas, activa, onCambio, etiqueta }: Props) {
  const botones = useRef<(HTMLButtonElement | null)[]>([])

  function alTeclear(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const n = pestanas.length
    const destino =
      e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (destino === null) return
    e.preventDefault()
    onCambio(pestanas[destino].id)
    botones.current[destino]?.focus()
  }

  return (
    <div role="tablist" aria-label={etiqueta} className="flex gap-1 border-b">
      {pestanas.map((p, i) => {
        const seleccionada = p.id === activa
        return (
          <button
            key={p.id}
            ref={(el) => {
              botones.current[i] = el
            }}
            type="button"
            role="tab"
            id={idPestana(p.id)}
            aria-selected={seleccionada}
            aria-controls={idPanel(p.id)}
            tabIndex={seleccionada ? 0 : -1}
            onClick={() => onCambio(p.id)}
            onKeyDown={(e) => alTeclear(e, i)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              seleccionada ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {p.titulo}
          </button>
        )
      })}
    </div>
  )
}
