import type { KpisOut } from '@/api/tipos'
import VerCalculo from '@/components/comunes/VerCalculo'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { decimal4, numero } from '@/lib/formato'
import type { Hallazgo } from '@/lib/hallazgos'

interface Props {
  hallazgos: Hallazgo[]
  kpis: KpisOut
}

/** Hasta tres observaciones escritas con las cifras de los datos cargados, siempre con la aclaración de que no prueban causas. */
export default function Hallazgos({ hallazgos, kpis }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hallazgos</CardTitle>
        <CardDescription>Observaciones calculadas con los datos cargados; cambian si cambia el periodo.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ol className="m-0 grid list-none gap-3 p-0">
          {hallazgos.map((h) => (
            <li key={h.id} className="flex items-start gap-2">
              {h.pregunta ? <Badge variant="secondary">{h.pregunta}</Badge> : null}
              <div>
                <p className="m-0">{h.texto}</p>
                {h.nota ? <p className="m-0 mt-0.5 text-xs text-muted-foreground">{h.nota}</p> : null}
              </div>
            </li>
          ))}
        </ol>
        {kpis.N > 0 ? (
          <p className="m-0 rounded-md bg-muted px-3 py-2 text-sm">
            <strong>Observación, no causa.</strong> Estas cifras describen el periodo cargado: que dos cosas aparezcan juntas no
            prueba que una produzca la otra.
          </p>
        ) : null}
        {kpis.N > 0 ? (
          <VerCalculo
            pasos={[
              {
                formula: 'p = K / N',
                sustituida: `${numero(kpis.criticos)} / ${numero(kpis.N)}`,
                resultado: decimal4(kpis.proporcion_criticos),
              },
            ]}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
