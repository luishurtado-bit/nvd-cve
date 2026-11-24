import type { Agrupacion, Periodo } from '@/api/tipos'

const DIA_EN_MS = 86_400_000

/** Con pocos días se ve cada día; con muchos, por semana o por mes, para que la serie se pueda leer. */
export function agrupacionSugerida(periodo: Periodo | null | undefined): Agrupacion {
  if (!periodo?.inicio || !periodo.fin) return 'semana'
  const dias = (Date.parse(periodo.fin) - Date.parse(periodo.inicio)) / DIA_EN_MS + 1
  return dias <= 21 ? 'dia' : dias <= 150 ? 'semana' : 'mes'
}
