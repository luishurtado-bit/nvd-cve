import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Formulario({ className, ...props }: ComponentProps<"form">) {
  return (
    <form
      className={cn(
        "m-0 grid gap-4 rounded-none border-0 bg-transparent p-0 shadow-none",
        className,
      )}
      {...props}
    />
  )
}
