// Formato de números y fechas en español de Colombia (es-CO): coma decimal, punto para los miles.
// Sin dependencias del proyecto, para poder comprobarlo con Node directamente.

const LOCALE = 'es-CO'
const SIN_DATO = '—'
const ZONA_CONSULTA = 'America/Bogota'
const ESPACIO = ' ' // no se separa del número al partir la línea

const formateadores = new Map<number, Intl.NumberFormat>()

function formateador(decimales: number): Intl.NumberFormat {
  let f = formateadores.get(decimales)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    formateadores.set(decimales, f)
  }
  return f
}

function esNumero(valor: number | null | undefined): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor)
}

/** «15.922», «6,9». Sin dato (null, undefined, NaN) devuelve «—», nunca «NaN». */
export function numero(valor: number | null | undefined, decimales = 0): string {
  return esNumero(valor) ? formateador(decimales).format(valor) : SIN_DATO
}

/** Una proporción (0 a 1) como porcentaje: «8,7 %». Lo que no llega al mínimo del redondeo se escribe «< 0,1 %». */
export function porcentaje(proporcion: number | null | undefined, decimales = 1): string {
  if (!esNumero(proporcion)) return SIN_DATO
  const minimo = 10 ** -decimales
  const valor = proporcion * 100
  if (valor > 0 && valor < minimo) return `< ${numero(minimo, decimales)}${ESPACIO}%`
  return `${numero(valor, decimales)}${ESPACIO}%`
}

/** «8,7 % (1.381 de 15.922)». Con total 0 no hay proporción: devuelve «0 de 0». */
export function fraccion(parte: number | null | undefined, total: number | null | undefined, decimales = 1): string {
  if (!esNumero(parte) || !esNumero(total)) return SIN_DATO
  if (total === 0) return `${numero(parte)} de ${numero(total)}`
  return `${porcentaje(parte / total, decimales)} (${numero(parte)} de ${numero(total)})`
}

/** Cuatro decimales, solo para las cuentas que se muestran dentro de «Ver cálculo»: «0,0874». */
export function decimal4(valor: number | null | undefined): string {
  return numero(valor, 4)
}

// --- Fechas ---

const MESES_CORTOS = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' })

/** AAAA-MM-DD → medianoche UTC; una fecha con hora se lee tal cual. Los días de la NVD son UTC. */
function leerFecha(texto: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return new Date(`${texto}T00:00:00Z`)
  // Algunos navegadores no aceptan más de 3 decimales en los segundos (el backend manda 6)
  return new Date(texto.replace(/(\.\d{3})\d+/, '$1'))
}

function esValida(fecha: Date): boolean {
  return !Number.isNaN(fecha.getTime())
}

/** «23 oct 2026». */
export function fechaCorta(texto: string | null | undefined): string {
  if (!texto) return SIN_DATO
  const fecha = leerFecha(texto)
  if (!esValida(fecha)) return SIN_DATO
  return `${fecha.getUTCDate()} ${MESES_CORTOS.format(fecha).replace('.', '')} ${fecha.getUTCFullYear()}`
}

/** «23 de octubre de 2026». */
export function fechaLarga(texto: string | null | undefined): string {
  if (!texto) return SIN_DATO
  const fecha = leerFecha(texto)
  if (!esValida(fecha)) return SIN_DATO
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: 'UTC' }).format(fecha)
}

/** «23 nov 2026, 19:14», en la hora de Colombia. Para marcas de tiempo como la fecha de consulta. */
export function fechaHora(texto: string | null | undefined): string {
  if (!texto) return SIN_DATO
  const fecha = leerFecha(texto)
  if (!esValida(fecha)) return SIN_DATO
  const partes = new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: ZONA_CONSULTA,
  }).formatToParts(fecha)
  const de = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  return `${de('day')} ${de('month').replace('.', '')} ${de('year')}, ${de('hour')}:${de('minute')}`
}

/** «23 oct 2026 – 22 nov 2026», o «sin periodo» si el conjunto no lo trae. */
export function periodo(p: { inicio?: string | null; fin?: string | null } | null | undefined): string {
  if (!p?.inicio || !p?.fin) return 'sin periodo'
  return `${fechaCorta(p.inicio)} – ${fechaCorta(p.fin)}`
}
