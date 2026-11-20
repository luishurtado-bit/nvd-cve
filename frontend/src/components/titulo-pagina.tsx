import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

// Título <h2> de cada pantalla o sección (mismo azul de antes, con variante para modo oscuro).
export function TituloPagina({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "m-0 text-xl font-bold tracking-tight text-blue-900 dark:text-blue-300",
        className,
      )}
      {...props}
    />
  )
}
