export default function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p role="status">{texto}</p>
}