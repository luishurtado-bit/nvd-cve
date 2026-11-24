export interface PasoCalculo {
  /** La fórmula con letras: «p = K / N». */
  formula: string
  /** La misma fórmula con los números puestos: «1.381 / 15.922». */
  sustituida?: string
  resultado: string
}

/**
 * Desplegable con el cálculo detrás de una cifra: fórmula, números puestos y resultado. Así la
 * respuesta se lee en lenguaje sencillo y las cuentas (con sus decimales) quedan a un clic.
 */
export default function VerCalculo({ pasos, titulo = 'Ver cálculo' }: { pasos: PasoCalculo[]; titulo?: string }) {
  return (
    <details className="rounded-md border bg-muted/30 text-sm">
      <summary className="cursor-pointer select-none px-3 py-2 font-medium">{titulo}</summary>
      <ol className="m-0 grid list-decimal gap-2 py-1 pr-3 pb-3 pl-9">
        {pasos.map((paso) => (
          <li key={paso.formula}>
            <span className="font-mono">{paso.formula}</span>
            {paso.sustituida ? <span className="font-mono text-muted-foreground"> = {paso.sustituida}</span> : null}
            <span className="font-mono font-semibold"> = {paso.resultado}</span>
          </li>
        ))}
      </ol>
    </details>
  )
}
