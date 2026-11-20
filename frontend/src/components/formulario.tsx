import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

// <form> en cuadrícula con separación estándar, para usar dentro de un Card.
export function Formulario({ className, ...props }: ComponentProps<"form">) {
  return <form className={cn("grid gap-4", className)} {...props} />
}
