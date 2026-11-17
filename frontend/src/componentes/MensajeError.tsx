export default function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <p role="alert" style={{ color: 'var(--error)' }}>
      {mensaje}
    </p>
  )
}