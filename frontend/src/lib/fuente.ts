import type { ResumenDatos } from '@/api/tipos'
import { fechaHora, numero, periodo } from '@/lib/formato'

/**
 * La fuente de los datos en una línea de texto, para el pie de los gráficos exportados a PNG:
 * de dónde vienen, cuándo se consultaron y qué periodo y cuántos CVE cubren.
 */
export function textoFuente(resumen: ResumenDatos | undefined): string {
  if (!resumen) return 'Fuente: NVD – NIST, CVE API 2.0.'
  const cobertura = `Periodo: ${periodo(resumen.periodo)} · N = ${numero(resumen.N)} CVE.`
  if (resumen.origen === 'simulado') {
    return `Fuente: datos simulados de ejemplo (no provienen de la NVD). N = ${numero(resumen.N)} CVE.`
  }
  if (resumen.origen === 'csv') return `Fuente: archivo CSV cargado por el usuario. ${cobertura}`
  const consulta = resumen.fecha_consulta ? ` Consultado el ${fechaHora(resumen.fecha_consulta)}.` : ''
  return `Fuente: NVD – NIST, CVE API 2.0.${consulta} ${cobertura}`
}
