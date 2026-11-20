import { Alert, AlertDescription } from '@/components/ui/alert'

export default function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{mensaje}</AlertDescription>
    </Alert>
  )
}
