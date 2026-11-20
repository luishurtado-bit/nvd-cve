import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface CampoProps {
  etiqueta: ReactNode
  htmlFor: string
  ayuda?: ReactNode
  className?: string
  children: ReactNode
}

// Etiqueta + control (+ ayuda) que se repite en todos los formularios.
export function Campo({ etiqueta, htmlFor, ayuda, className, children }: CampoProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{etiqueta}</Label>
      {children}
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  )
}
