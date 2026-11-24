import type { Severidad } from '@/api/tipos'
import { useTema } from '@/hooks/use-tema'

/**
 * Colores de los gráficos para cada tema. Van en HEX y no como variables CSS: al exportar a PNG el
 * <svg> se serializa fuera de la página y las variables no se resolverían.
 */
export interface Paleta {
  /** Texto de ejes y etiquetas. */
  texto: string
  /** Texto secundario: subtítulos, fuente. */
  textoSuave: string
  rejilla: string
  /** Fondo de la tarjeta; también el de los PNG exportados. */
  fondo: string
  /** Color del volumen (número de CVE). */
  principal: string
  /** Color de lo crítico (% de críticos). */
  critico: string
  neutro: string
  severidad: Record<Severidad, string>
}

export const PALETA_CLARA: Paleta = {
  texto: '#334155',
  textoSuave: '#64748b',
  rejilla: '#e2e8f0',
  fondo: '#ffffff',
  principal: '#2563eb',
  critico: '#dc2626',
  neutro: '#94a3b8',
  severidad: { CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#ca8a04', LOW: '#2563eb', NONE: '#64748b' },
}

export const PALETA_OSCURA: Paleta = {
  texto: '#cbd5e1',
  textoSuave: '#94a3b8',
  rejilla: '#334155',
  fondo: '#111827',
  principal: '#60a5fa',
  critico: '#f87171',
  neutro: '#64748b',
  severidad: { CRITICAL: '#f87171', HIGH: '#fb923c', MEDIUM: '#facc15', LOW: '#60a5fa', NONE: '#94a3b8' },
}

export function usePaleta(): Paleta {
  const { tema } = useTema()
  return tema === 'dark' ? PALETA_OSCURA : PALETA_CLARA
}
