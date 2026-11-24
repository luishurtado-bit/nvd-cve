export interface FilaTooltip {
  etiqueta: string
  valor: string
  color?: string
}

/** Cuadro que aparece al pasar el mouse por un gráfico: un título y una o más cifras. */
export default function CajaTooltip({ titulo, filas }: { titulo: string; filas: FilaTooltip[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="mb-1 font-semibold">{titulo}</div>
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="flex items-center gap-2">
          {fila.color ? (
            <span aria-hidden="true" className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: fila.color }} />
          ) : null}
          <span className="text-muted-foreground">{fila.etiqueta}:</span>
          <span className="font-medium tabular-nums">{fila.valor}</span>
        </div>
      ))}
    </div>
  )
}
