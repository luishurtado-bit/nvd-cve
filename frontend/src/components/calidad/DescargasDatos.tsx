import { Download } from 'lucide-react'
import { urlExportar, type RecursoExportable } from '@/api/cliente'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const BASES: { recurso: RecursoExportable; titulo: string; texto: string }[] = [
  {
    recurso: 'crudo',
    titulo: 'Base original',
    texto: 'Lo que llegó de la NVD, sin tocar. Si viene de una descarga es el JSON comprimido (.json.gz); si viene de un CSV, ese mismo CSV.',
  },
  { recurso: 'cve', titulo: 'Base limpia', texto: 'Los CVE del conjunto de análisis, con las 20 variables y la columna «critico» (CSV).' },
  { recurso: 'calidad', titulo: 'Reporte de limpieza', texto: 'Los pasos de la limpieza con lo que quitó cada uno y su justificación (CSV).' },
]

/** Las tres bases que pide la guía como entregable: la original, la limpia y el reporte. */
export default function DescargasDatos() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Descargar las bases</CardTitle>
        <CardDescription>Para el informe: lo que se descargó, lo que quedó y cómo se llegó de uno a otro.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {BASES.map((b) => (
          <div key={b.recurso} className="grid content-between gap-3 rounded-lg border p-4">
            <div>
              <h2 className="m-0 text-sm font-semibold">{b.titulo}</h2>
              <p className="mt-1 mb-0 text-sm text-muted-foreground">{b.texto}</p>
            </div>
            <a href={urlExportar(b.recurso)} download className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Download aria-hidden="true" /> Descargar
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
