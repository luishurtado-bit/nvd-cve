import type { ItemLeyendaPng } from '@/utils/exportarPng'

export type ItemLeyenda = ItemLeyendaPng

/** Leyenda de un gráfico, en HTML (la de Recharts queda fuera del <svg> y no entra en el PNG). */
export default function Leyenda({ items }: { items: ItemLeyenda[] }) {
  return (
    <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.texto} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={item.forma === 'linea' ? 'inline-block h-0.5 w-4' : 'inline-block size-3 rounded-sm'}
            style={{ backgroundColor: item.color }}
          />
          {item.texto}
        </li>
      ))}
    </ul>
  )
}
