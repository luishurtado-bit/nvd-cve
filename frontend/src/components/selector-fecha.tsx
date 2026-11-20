import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'react-day-picker/locale'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface SelectorFechaProps {
  id: string
  valor: string
  onCambio: (valor: string) => void
  placeholder?: string
  disabled?: boolean
}

// Rango del selector: la NVD publica desde 1999 hasta hoy (se deja hasta fin del año siguiente).
const PRIMER_MES = new Date(1999, 0)
const ULTIMO_MES = new Date(new Date().getFullYear() + 1, 11)

// "AAAA-MM-DD" → Date en hora local (new Date("AAAA-MM-DD") la interpretaría en UTC
// y podría mostrar el día anterior).
function aFecha(valor: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

// Selector de fecha de shadcn (Popover + Calendar). Entrega y recibe cadenas "AAAA-MM-DD",
// igual que <input type="date">, así el resto del código no cambia.
export function SelectorFecha({
  id,
  valor,
  onCambio,
  placeholder = 'Selecciona una fecha',
  disabled,
}: SelectorFechaProps) {
  const [abierto, setAbierto] = useState(false)
  const fecha = aFecha(valor)

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn('w-full justify-start font-normal', !fecha && 'text-muted-foreground')}
          />
        }
      >
        <CalendarIcon />
        {fecha ? format(fecha, 'dd/MM/yyyy') : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={es}
          selected={fecha}
          defaultMonth={fecha}
          captionLayout="dropdown"
          startMonth={PRIMER_MES}
          endMonth={ULTIMO_MES}
          onSelect={(elegida) => {
            onCambio(elegida ? format(elegida, 'yyyy-MM-dd') : '')
            setAbierto(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
