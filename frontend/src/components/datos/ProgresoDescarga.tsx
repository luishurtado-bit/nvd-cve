import { CircleCheck } from 'lucide-react'
import type { DescargaOut } from '@/api/tipos'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { numero } from '@/lib/formato'

interface Props {
  descarga: DescargaOut | null
  /** De 0 a 1; null si todavía no se puede saber. */
  progreso: number | null
  activa: boolean
  error: string | null
  aviso: string | null
  onDejarDeSeguir: () => void
  onActualizar: () => void
}

/** Avance de la descarga en curso, su resultado cuando termina y los avisos (error, dejó de seguirse, servidor reiniciado). */
export default function ProgresoDescarga({ descarga, progreso, activa, error, aviso, onDejarDeSeguir, onActualizar }: Props) {
  return (
    <div className="grid gap-3" aria-live="polite">
      {activa && descarga?.estado !== 'fallida' ? (
        <div className="grid gap-2 rounded-lg border p-4">
          <Progress value={progreso === null ? null : Math.round(progreso * 100)}>
            <ProgressLabel>{descarga ? `Tramo ${descarga.tramo} de ${descarga.n_tramos}` : 'Iniciando la descarga…'}</ProgressLabel>
            <ProgressValue />
          </Progress>
          {descarga ? (
            <p className="m-0 text-sm text-muted-foreground">
              {numero(descarga.descargados)} CVE descargados
              {descarga.total_tramo > 0 ? ` · este tramo trae ${numero(descarga.total_tramo)}` : ''}.
            </p>
          ) : null}
          {/* El resto de los mensajes del servidor repite lo que ya se ve; los reintentos sí avisan que la NVD está fallando */}
          {descarga?.mensaje?.startsWith('Reintento') ? (
            <p className="m-0 text-sm text-amber-700 dark:text-amber-400">La NVD no respondió bien y se está reintentando ({descarga.mensaje}).</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onDejarDeSeguir}>
              Dejar de seguir
            </Button>
            <span className="text-xs text-muted-foreground">El servidor sigue descargando aunque dejes de seguirla.</span>
          </div>
        </div>
      ) : null}

      {descarga?.estado === 'terminada' && descarga.resumen ? (
        <Alert>
          <CircleCheck />
          <AlertTitle>Descarga terminada</AlertTitle>
          <AlertDescription>
            Quedaron {numero(descarga.resumen.N)} CVE con puntuación, de {numero(descarga.resumen.descargados)} descargados.
          </AlertDescription>
        </Alert>
      ) : null}

      {descarga?.estado === 'fallida' ? (
        <Alert variant="destructive">
          <AlertTitle>La descarga falló</AlertTitle>
          <AlertDescription>{descarga.error ?? 'El servidor no dio más detalles.'}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {aviso ? (
        <Alert variant="warning">
          <AlertDescription>
            {aviso}{' '}
            <Button type="button" variant="outline" size="sm" onClick={onActualizar}>
              Actualizar datos
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
