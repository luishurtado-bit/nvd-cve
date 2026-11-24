// Las preguntas de análisis del proyecto (guía de Electiva III). Cada gráfico dice a cuál responde.

export type ClavePregunta = 'P1' | 'P2' | 'P3' | 'P4'

export const PREGUNTAS: Record<ClavePregunta, string> = {
  P1: '¿Qué proporción de los CVE es crítica y cómo se reparte la severidad?',
  P2: '¿Cambia la proporción de críticos según el vector de ataque y los privilegios requeridos?',
  P3: '¿Cómo varían el volumen de CVE y el porcentaje de críticos en el tiempo y por fuente?',
  P4: '¿Qué debilidades (CWE) son las más frecuentes?',
}
