import { useSyncExternalStore } from 'react'

export type Tema = 'light' | 'dark'

function temaInicial(): Tema {
  const guardado = localStorage.getItem('tema')
  if (guardado === 'light' || guardado === 'dark') return guardado
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let tema: Tema = temaInicial()
const oyentes = new Set<() => void>()

function aplicar(nuevo: Tema) {
  document.documentElement.setAttribute('data-theme', nuevo)
  localStorage.setItem('tema', nuevo)
}
aplicar(tema)

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function alternar() {
  tema = tema === 'dark' ? 'light' : 'dark'
  aplicar(tema)
  oyentes.forEach((oyente) => oyente())
}

export function useTema() {
  const actual = useSyncExternalStore(suscribir, () => tema)
  return { tema: actual, alternar }
}
