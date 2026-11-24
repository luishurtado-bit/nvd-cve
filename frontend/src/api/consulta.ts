type Valor = string | number | boolean | null | undefined

export type Params = Record<string, Valor | readonly Valor[]>

/**
 * Arma el query string. Omite los valores nulos, indefinidos o vacíos; un arreglo repite el
 * parámetro, que es como lo espera el backend para los filtros de varios valores:
 * `{ severidad: ['CRITICAL', 'HIGH'] }` → `?severidad=CRITICAL&severidad=HIGH`.
 * Devuelve `''` si no queda ningún parámetro.
 */
export function qs(params: Params = {}): string {
  const partes: string[] = []
  for (const [clave, valor] of Object.entries(params)) {
    const valores = Array.isArray(valor) ? valor : [valor]
    for (const v of valores as Valor[]) {
      if (v === null || v === undefined || v === '') continue
      partes.push(`${encodeURIComponent(clave)}=${encodeURIComponent(String(v))}`)
    }
  }
  return partes.length > 0 ? `?${partes.join('&')}` : ''
}

export function urlApi(ruta: string, params?: Params): string {
  return `${ruta}${qs(params)}`
}
