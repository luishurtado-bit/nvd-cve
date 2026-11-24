// Definiciones cortas de los términos que aparecen en la interfaz. Salen en el tooltip de <Ayuda />.
// Sin cifras: todo número se toma siempre de los datos.

export interface Termino {
  titulo: string
  texto: string
}

export const GLOSARIO = {
  cve: {
    titulo: 'CVE',
    texto: 'Identificador público de una vulnerabilidad de seguridad, con la forma CVE-AAAA-NNNN.',
  },
  cvss: {
    titulo: 'CVSS',
    texto:
      'Sistema que puntúa la gravedad de una vulnerabilidad de 0,0 a 10,0. Se usa la versión 3.1 y, si falta, la 3.0 o la 4.0.',
  },
  critico: {
    titulo: 'Crítico',
    texto: 'CVE con puntuación CVSS base igual o mayor al umbral (por defecto 9,0).',
  },
  vector_red: {
    titulo: 'Vector de red',
    texto: 'La vulnerabilidad se puede explotar de forma remota, a través de la red.',
  },
  privilegios: {
    titulo: 'Privilegios requeridos',
    texto: 'Permisos que necesita el atacante antes de explotarla. «Ninguno» significa que no necesita una cuenta.',
  },
  kev: {
    titulo: 'KEV',
    texto: 'Catálogo de la agencia CISA con las vulnerabilidades que ya se están explotando en ataques reales.',
  },
  cwe: {
    titulo: 'CWE',
    texto: 'Tipo de debilidad de software que originó la vulnerabilidad (por ejemplo, CWE-79).',
  },
  cna: {
    titulo: 'CNA',
    texto: 'Organización autorizada para publicar CVE (un fabricante, un investigador…). Es la fuente de cada CVE.',
  },
  independencia: {
    titulo: 'Independencia',
    texto: 'Dos eventos son independientes si saber que ocurrió uno no cambia la probabilidad del otro.',
  },
  prior: {
    titulo: 'Probabilidad previa',
    texto: 'Lo que se cree de un evento antes de observar el dato nuevo.',
  },
  posterior: {
    titulo: 'Probabilidad posterior',
    texto: 'Lo que se cree de un evento después de observar el dato nuevo.',
  },
  pmf: {
    titulo: 'Función de probabilidad',
    texto: 'La probabilidad de cada número posible de críticos en el lote (0, 1, 2…).',
  },
  esperanza: {
    titulo: 'Valor esperado',
    texto: 'Cuántos críticos aparecen en promedio por lote si se repitiera la revisión muchas veces.',
  },
  desviacion: {
    titulo: 'Desviación estándar',
    texto: 'Cuánto suele alejarse el número de críticos de un lote respecto al promedio.',
  },
} satisfies Record<string, Termino>

export type ClaveGlosario = keyof typeof GLOSARIO
