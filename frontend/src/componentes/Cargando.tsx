export default function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {texto}
    </p>
  )
}
