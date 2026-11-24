import Ayuda from '@/components/comunes/Ayuda'
import { Card, CardContent } from '@/components/ui/card'
import type { ClaveGlosario } from '@/lib/glosario'
import { cn } from '@/lib/utils'

interface Props {
  etiqueta: string
  /** El valor ya formateado. `null` = no hay dato: se muestra «—» y «Sin datos». */
  valor: string | null
  detalle?: string
  ayuda?: ClaveGlosario
  tono?: 'normal' | 'alerta'
}

/** Un indicador clave: una etiqueta, una cifra grande y una línea de detalle. */
export default function TarjetaKpi({ etiqueta, valor, detalle, ayuda, tono = 'normal' }: Props) {
  const sinDato = valor === null
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {etiqueta}
          {ayuda ? <Ayuda termino={ayuda} /> : null}
        </div>
        <div className={cn('mt-1 text-2xl font-bold tabular-nums', tono === 'alerta' && 'text-destructive')}>
          {sinDato ? '—' : valor}
        </div>
        <div className="mt-0.5 min-h-4 text-xs text-muted-foreground">{sinDato ? 'Sin datos' : detalle}</div>
      </CardContent>
    </Card>
  )
}
