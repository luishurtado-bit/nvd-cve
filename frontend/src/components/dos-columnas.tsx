import type { ReactNode } from "react"

interface DosColumnasProps {
  formulario: ReactNode
  resultados: ReactNode
}

export function DosColumnas({ formulario, resultados }: DosColumnasProps) {
  return (
    <div className="grid items-start gap-6 min-[56rem]:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]">
      <div className="grid gap-4 min-[56rem]:sticky min-[56rem]:top-4">{formulario}</div>
      <div className="grid min-w-0 gap-4">{resultados}</div>
    </div>
  )
}
