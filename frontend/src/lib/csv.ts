// CSV sencillo para las tablas de los gráficos. Sin dependencias del proyecto (se puede probar con Node).

export type CeldaCsv = string | number | null | undefined

function escapar(celda: CeldaCsv): string {
  if (celda === null || celda === undefined) return ''
  const texto = String(celda)
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

/** Texto CSV (separado por comas, con saltos de línea CRLF). Las celdas con comas, comillas o saltos van entre comillas. */
export function aCsv(columnas: readonly string[], filas: readonly (readonly CeldaCsv[])[]): string {
  return [columnas, ...filas].map((fila) => fila.map(escapar).join(',')).join('\r\n') + '\r\n'
}

/** Descarga el CSV con BOM UTF-8, para que Excel muestre bien las tildes (igual que las exportaciones del backend). */
export function descargarCsv(nombre: string, columnas: readonly string[], filas: readonly (readonly CeldaCsv[])[]): void {
  const blob = new Blob(['﻿', aCsv(columnas, filas)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `${nombre}.csv`
  enlace.click()
  URL.revokeObjectURL(url)
}
