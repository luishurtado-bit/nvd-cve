import { useDatos } from '@/contexto/datos'
import { fechaHora } from '@/lib/formato'

const URL_API_NVD = 'https://nvd.nist.gov/developers/vulnerabilities'

/** Pie de todas las páginas: de dónde salen los datos y cuándo se consultaron. */
export default function PieFuente() {
  const { resumen } = useDatos()

  return (
    <footer className="border-t px-6 py-4 text-xs text-muted-foreground">
      {resumen?.origen === 'simulado' ? (
        <>Fuente: datos simulados de ejemplo; no provienen de la NVD.</>
      ) : resumen?.origen === 'csv' ? (
        <>Fuente: archivo CSV cargado por el usuario.</>
      ) : (
        <>
          Fuente:{' '}
          <a href={URL_API_NVD} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            NVD – NIST, CVE API 2.0
          </a>
          {resumen?.fecha_consulta ? <>. Consultado el {fechaHora(resumen.fecha_consulta)}.</> : '.'}
        </>
      )}
    </footer>
  )
}
