import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { numero } from '@/lib/formato'

/** El problema y la pregunta que ordenan todo el proyecto, al comienzo del dashboard. */
export default function Presentacion({ umbral }: { umbral: number }) {
  return (
    <Card>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">El problema</h2>
          <p className="mt-1 mb-0">
            Cada día se publican cientos de CVE (vulnerabilidades de seguridad) y un equipo no puede revisarlos todos a la vez.
          </p>
        </div>
        <div>
          <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">La pregunta</h2>
          <p className="mt-1 mb-0">
            Si un equipo revisa al azar un lote de <em>n</em> CVE del periodo, ¿cuántos críticos (CVSS ≥ {numero(umbral, 1)}) debe
            esperar encontrar y con qué probabilidad?{' '}
            <Link to="/binomial" className="whitespace-nowrap underline underline-offset-2">
              Responderla con la binomial →
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
