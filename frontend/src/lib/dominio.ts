import { ErrorApi } from '@/api/cliente'
import type { Privilegios, Severidad, Vector } from '@/api/tipos'

export interface OpcionDominio<T extends string> {
  valor: T
  /** Nombre corto para frases y gráficos: «Red». */
  etiqueta: string
  /** Texto de las listas desplegables, con el valor técnico: «Red (NETWORK)». */
  texto: string
}

export const VECTORES: OpcionDominio<Vector>[] = [
  { valor: 'NETWORK', etiqueta: 'Red', texto: 'Red (NETWORK)' },
  { valor: 'ADJACENT_NETWORK', etiqueta: 'Red adyacente', texto: 'Red adyacente (ADJACENT_NETWORK)' },
  { valor: 'ADJACENT', etiqueta: 'Adyacente', texto: 'Adyacente (ADJACENT)' },
  { valor: 'LOCAL', etiqueta: 'Local', texto: 'Local (LOCAL)' },
  { valor: 'PHYSICAL', etiqueta: 'Físico', texto: 'Físico (PHYSICAL)' },
]

export const PRIVILEGIOS: OpcionDominio<Privilegios>[] = [
  { valor: 'NONE', etiqueta: 'Ninguno', texto: 'Ninguno (NONE)' },
  { valor: 'LOW', etiqueta: 'Bajos', texto: 'Bajos (LOW)' },
  { valor: 'HIGH', etiqueta: 'Altos', texto: 'Altos (HIGH)' },
]

export const SEVERIDADES: OpcionDominio<Severidad>[] = [
  { valor: 'CRITICAL', etiqueta: 'Crítica', texto: 'Crítica (CRITICAL)' },
  { valor: 'HIGH', etiqueta: 'Alta', texto: 'Alta (HIGH)' },
  { valor: 'MEDIUM', etiqueta: 'Media', texto: 'Media (MEDIUM)' },
  { valor: 'LOW', etiqueta: 'Baja', texto: 'Baja (LOW)' },
  { valor: 'NONE', etiqueta: 'Ninguna', texto: 'Ninguna (NONE)' },
]

/** Nombre corto de un valor del dominio; si el valor no está en la lista, devuelve el valor tal cual. */
export function etiquetaDe<T extends string>(opciones: readonly OpcionDominio<T>[], valor: string): string {
  return opciones.find((o) => o.valor === valor)?.etiqueta ?? valor
}

export const MENSAJE_UMBRAL = 'El umbral debe ser un número entre 0 y 10.'

/** El umbral de criticidad escrito en un campo de texto, o null si no es un número entre 0 y 10. */
export function leerUmbral(texto: string): number | null {
  const valor = Number(texto)
  if (texto.trim() === '' || Number.isNaN(valor) || valor < 0 || valor > 10) return null
  return valor
}

/** El texto que se le muestra a la persona cuando una consulta falla. */
export function mensajeDe(error: unknown): string {
  if (error instanceof ErrorApi) return error.message
  return 'Ocurrió un error inesperado.'
}
