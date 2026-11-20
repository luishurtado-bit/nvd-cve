import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface Opcion<T extends string> {
  valor: T
  texto: string
}

interface SelectOpcionesProps<T extends string> {
  /** id del trigger; es el que referencia el htmlFor de <Campo>. */
  id: string
  opciones: Opcion<T>[]
  valor: T
  onCambio: (valor: NoInfer<T>) => void
}

// Select de shadcn sobre una lista de opciones {valor, texto}. Muestra el texto de la opción
// elegida (no el valor) y solo acepta valores que existan en la lista.
export function SelectOpciones<T extends string>({
  id,
  opciones,
  valor,
  onCambio,
}: SelectOpcionesProps<T>) {
  return (
    <Select
      items={opciones.map((o) => ({ value: o.valor, label: o.texto }))}
      value={valor}
      onValueChange={(nuevo) => {
        const op = opciones.find((o) => o.valor === nuevo)
        if (op) onCambio(op.valor)
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.texto}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
