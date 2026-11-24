// Las 20 variables de cada CVE, en el orden de las columnas del backend. Salen de docs/diccionario-de-datos.md;
// si cambian allá, cambian aquí.

export interface Variable {
  columna: string
  nombre: string
  tipo: string
  descripcion: string
  valores: string
  /** Cuándo puede quedar nula en el conjunto de análisis. */
  nulos: string
}

export const DICCIONARIO: Variable[] = [
  { columna: 'cve_id', nombre: 'Identificador', tipo: 'texto', descripcion: 'Identificador público del CVE.', valores: 'CVE-AAAA-NNNN; único en el conjunto', nulos: 'Nunca' },
  { columna: 'publicado', nombre: 'Fecha de publicación', tipo: 'fecha y hora (UTC)', descripcion: 'Cuándo se publicó el CVE.', valores: 'Dentro del periodo cargado', nulos: 'Nunca' },
  { columna: 'estado', nombre: 'Estado en la NVD', tipo: 'texto', descripcion: 'Estado del CVE en la NVD. Los «Rejected» (anulados) se excluyen.', valores: 'Analyzed, Modified, Awaiting Analysis, Undergoing Analysis, Received, Deferred', nulos: 'Nunca' },
  { columna: 'version_cvss', nombre: 'Versión de CVSS', tipo: 'texto', descripcion: 'Versión del CVSS de la puntuación elegida (la 3.1 si existe, luego la 3.0 y la 4.0).', valores: '3.1, 3.0, 4.0', nulos: 'Nunca (sin puntuación no hay fila)' },
  { columna: 'base_score', nombre: 'Puntuación base', tipo: 'número', descripcion: 'Puntuación CVSS base de gravedad.', valores: '0,0 a 10,0', nulos: 'Nunca' },
  { columna: 'severidad', nombre: 'Severidad', tipo: 'texto', descripcion: 'Severidad cualitativa de la puntuación.', valores: 'NONE (0), LOW, MEDIUM, HIGH, CRITICAL (9,0 o más)', nulos: 'Casi nunca' },
  { columna: 'vector_ataque', nombre: 'Vector de ataque', tipo: 'texto', descripcion: 'Desde dónde se puede explotar la vulnerabilidad (AV).', valores: 'NETWORK, ADJACENT_NETWORK, ADJACENT, LOCAL, PHYSICAL', nulos: 'Si el valor no es de este dominio' },
  { columna: 'complejidad_ataque', nombre: 'Complejidad del ataque', tipo: 'texto', descripcion: 'Qué tan difícil es explotarla (AC).', valores: 'LOW, HIGH', nulos: 'Casi nunca' },
  { columna: 'privilegios', nombre: 'Privilegios requeridos', tipo: 'texto', descripcion: 'Permisos que necesita el atacante (PR).', valores: 'NONE, LOW, HIGH', nulos: 'Si el valor no es de este dominio' },
  { columna: 'interaccion_usuario', nombre: 'Interacción del usuario', tipo: 'texto', descripcion: 'Si la víctima tiene que participar (UI). En la v4.0, PASSIVE y ACTIVE se unifican como REQUIRED.', valores: 'NONE, REQUIRED', nulos: 'Casi nunca' },
  { columna: 'impacto_confidencialidad', nombre: 'Impacto en confidencialidad', tipo: 'texto', descripcion: 'Impacto sobre la confidencialidad (C).', valores: 'NONE, LOW, HIGH', nulos: 'Casi nunca' },
  { columna: 'impacto_integridad', nombre: 'Impacto en integridad', tipo: 'texto', descripcion: 'Impacto sobre la integridad (I).', valores: 'NONE, LOW, HIGH', nulos: 'Casi nunca' },
  { columna: 'impacto_disponibilidad', nombre: 'Impacto en disponibilidad', tipo: 'texto', descripcion: 'Impacto sobre la disponibilidad (A).', valores: 'NONE, LOW, HIGH', nulos: 'Casi nunca' },
  { columna: 'puntaje_explotabilidad', nombre: 'Subpuntaje de explotabilidad', tipo: 'número', descripcion: 'Subpuntaje de explotabilidad que calcula el CVSS 3.x.', valores: 'Hasta 3,9', nulos: 'Siempre en la v4.0: esa versión no lo calcula' },
  { columna: 'puntaje_impacto', nombre: 'Subpuntaje de impacto', tipo: 'número', descripcion: 'Subpuntaje de impacto que calcula el CVSS 3.x.', valores: '0,0 a 6,0', nulos: 'Siempre en la v4.0' },
  { columna: 'cwe', nombre: 'Tipo de debilidad (CWE)', tipo: 'texto', descripcion: 'Tipo de debilidad de software que originó la vulnerabilidad: el primer CWE-* que traiga el CVE.', valores: 'CWE-79, CWE-787… (también NVD-CWE-noinfo y NVD-CWE-Other)', nulos: 'Si el CVE no trae debilidades' },
  { columna: 'fuente', nombre: 'Fuente (CNA)', tipo: 'texto', descripcion: 'Organización que publicó el CVE, en minúsculas.', valores: 'Un correo, por ejemplo security-advisories@github.com', nulos: 'Rara vez' },
  { columna: 'n_referencias', nombre: 'Número de referencias', tipo: 'entero', descripcion: 'Cuántos enlaces de referencia trae el CVE.', valores: '0 o más', nulos: 'Nunca' },
  { columna: 'kev', nombre: 'En el catálogo KEV', tipo: 'verdadero/falso', descripcion: 'Si el CVE está en el catálogo KEV de CISA (vulnerabilidades explotadas).', valores: 'Verdadero o falso', nulos: 'Nunca' },
  { columna: 'ultima_modificacion', nombre: 'Última modificación', tipo: 'fecha y hora (UTC)', descripcion: 'Última vez que se modificó el CVE.', valores: 'Igual o posterior a la publicación', nulos: 'Nunca' },
]

const POR_COLUMNA = new Map(DICCIONARIO.map((v) => [v.columna, v]))

export function variableDe(columna: string): Variable | undefined {
  return POR_COLUMNA.get(columna)
}

/** Nombre legible de una columna; si no está en el diccionario, la propia columna. */
export function nombreDe(columna: string): string {
  return POR_COLUMNA.get(columna)?.nombre ?? columna
}
