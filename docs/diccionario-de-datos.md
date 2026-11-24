# Diccionario de datos

Cada fila es un **CVE** publicado en la National Vulnerability Database (NVD, CVE API 2.0). El backend extrae
**20 variables** (`backend/nvd/extraccion.py`) y las depura (`backend/nvd/depuracion.py`). El conjunto que queda,
después de limpiar, es el **espacio muestral Ω** y su tamaño es **N**.

Este diccionario sirve para el informe y la presentación (Electiva III) y para el frontend. Los nombres de las
columnas son los de los archivos CSV y los de la API.

## Las 20 variables

| # | Columna | Tipo en Ω | Qué es | De dónde sale en la NVD | Valores o rango | Nulos |
|---|---|---|---|---|---|---|
| 1 | `cve_id` | texto | Identificador del CVE | `id` | `CVE-AAAA-NNNN`, en mayúsculas. Único en Ω | Nunca |
| 2 | `publicado` | fecha y hora (UTC) | Cuándo se publicó el CVE | `published` | Dentro del periodo cargado | Nunca |
| 3 | `estado` | texto | Estado del CVE en la NVD | `vulnStatus` | `Analyzed`, `Modified`, `Awaiting Analysis`, `Undergoing Analysis`, `Received`, `Deferred`. (`Rejected` se excluye) | Nunca |
| 4 | `version_cvss` | texto | Versión de CVSS de la puntuación elegida | Clave de la métrica (`cvssMetricV31`, `V30`, `V40`) | `3.1`, `3.0`, `4.0` | Nunca (sin puntuación no hay fila) |
| 5 | `base_score` | número | Puntuación base CVSS | `cvssData.baseScore` | 0,0 a 10,0 | Nunca |
| 6 | `severidad` | texto | Severidad cualitativa | `cvssData.baseSeverity` (si falta, se deduce de la puntuación) | `NONE` (0), `LOW` (0,1–3,9), `MEDIUM` (4,0–6,9), `HIGH` (7,0–8,9), `CRITICAL` (9,0–10,0) | Casi nunca |
| 7 | `vector_ataque` | texto | Desde dónde se explota (AV) | `cvssData.attackVector` | `NETWORK`, `ADJACENT_NETWORK` (v3.x), `ADJACENT` (v4.0), `LOCAL`, `PHYSICAL` | Si el valor no es de este dominio |
| 8 | `complejidad_ataque` | texto | Qué tan difícil es explotarlo (AC) | `cvssData.attackComplexity` | `LOW`, `HIGH` | Casi nunca |
| 9 | `privilegios` | texto | Permisos que necesita el atacante (PR) | `cvssData.privilegesRequired` | `NONE`, `LOW`, `HIGH` | Si el valor no es de este dominio |
| 10 | `interaccion_usuario` | texto | Si la víctima tiene que participar (UI) | `cvssData.userInteraction` | `NONE`, `REQUIRED`. En v4.0, `PASSIVE` y `ACTIVE` se unifican como `REQUIRED` | Casi nunca |
| 11 | `impacto_confidencialidad` | texto | Impacto sobre la confidencialidad (C) | `confidentialityImpact`; en v4.0, `vulnConfidentialityImpact` | `NONE`, `LOW`, `HIGH` | Casi nunca |
| 12 | `impacto_integridad` | texto | Impacto sobre la integridad (I) | `integrityImpact`; en v4.0, `vulnIntegrityImpact` | `NONE`, `LOW`, `HIGH` | Casi nunca |
| 13 | `impacto_disponibilidad` | texto | Impacto sobre la disponibilidad (A) | `availabilityImpact`; en v4.0, `vulnAvailabilityImpact` | `NONE`, `LOW`, `HIGH` | Casi nunca |
| 14 | `puntaje_explotabilidad` | número | Subpuntaje de explotabilidad | `exploitabilityScore` de la métrica | Hasta 3,9 | **Siempre en v4.0**: esa versión no lo calcula |
| 15 | `puntaje_impacto` | número | Subpuntaje de impacto | `impactScore` de la métrica | 0,0 a 6,0 | **Siempre en v4.0** |
| 16 | `cwe` | texto | Tipo de debilidad | `weaknesses`: el primer `CWE-*` (el *Primary* antes que el *Secondary*) | `CWE-79`, `CWE-787`… También `NVD-CWE-noinfo` y `NVD-CWE-Other` si es lo único que hay | Si el CVE no trae debilidades |
| 17 | `fuente` | texto | Organización que publicó el CVE (CNA) | `sourceIdentifier`, en minúsculas y sin espacios | Un correo, por ejemplo `security-advisories@github.com` | Rara vez |
| 18 | `n_referencias` | entero | Cuántos enlaces de referencia trae | Cantidad de elementos de `references` | 0 o más | Nunca |
| 19 | `kev` | verdadero/falso | Está en el catálogo KEV de CISA (vulnerabilidades explotadas) | Existe el campo `cisaExploitAdd` | `True`, `False` | Nunca |
| 20 | `ultima_modificacion` | fecha y hora (UTC) | Última vez que se modificó el CVE | `lastModified` | Igual o posterior a `publicado` | Nunca |

**Una sola puntuación por CVE.** Si el CVE trae varias, se toma la primera versión disponible en este orden:
CVSS v3.1, v3.0 y v4.0. Dentro de la versión, la métrica *Primary* (la del NIST) va antes que la *Secondary* (la
de la CNA). Por eso `base_score`, `severidad`, `vector_ataque` y las demás columnas CVSS salen siempre de la misma
métrica.

**Los nulos de la tabla** son los que quedan en Ω. En lo descargado hay más: los CVE sin puntuación tienen nulas todas
las columnas del 4 al 15. El reporte de calidad (`GET /api/datos/calidad`) muestra los nulos de cada columna
antes y después de limpiar.

## Columna calculada

| Columna | Dónde aparece | Qué es |
|---|---|---|
| `critico` | `GET /api/exportar/cve` | `True` si `base_score` ≥ el umbral (por defecto 9,0). Es el evento **A** de la estadística. No es parte de las 20 variables. |

## Los eventos de la estadística

| Evento | Se cumple cuando | Columna |
|---|---|---|
| **A** | El CVE es crítico: `base_score` ≥ umbral (9,0) | `base_score` |
| **B** | El CVE se explota por red: `vector_ataque` = `NETWORK` (se puede elegir otro valor) | `vector_ataque` |
| **C** | El CVE no pide privilegios: `privilegios` = `NONE` (se puede elegir otro valor) | `privilegios` |

## Limpieza: de lo descargado a Ω

Los pasos siguen la sección 4 del notebook `nvd-electiva-3.ipynb`. Cada uno queda anotado con cuántas filas había antes y
después y por qué (`GET /api/datos/calidad`).

| Paso | Qué hace | Por qué |
|---|---|---|
| 4.1 Inventario | Cuenta los nulos de cada columna | Para compararlos después de limpiar |
| 4.2 *Rejected* | Excluye los CVE con estado `Rejected` | Fueron anulados: no son vulnerabilidades reales |
| 4.3 Duplicados | Si un `cve_id` se repite, deja la fila con la `ultima_modificacion` más reciente | Un CVE cuenta una sola vez. La NVD puede repetir un CVE entre páginas |
| 4.4 Tipos | Convierte puntuaciones a número, fechas a UTC, `n_referencias` a entero y `kev` a verdadero/falso. Lo que no se pueda convertir queda nulo | Los **errores de formato** se cuentan aparte de los CVE sin puntuación |
| 4.5 Texto y dominio | Quita espacios, pasa a mayúsculas (la `fuente`, a minúsculas) y deja nulo lo que no esté en su dominio | Para que `NETWORK` y ` network ` cuenten igual. El CVE se conserva |
| 4.6 Nulos | Excluye los CVE sin puntuación válida. Conserva los nulos de CWE, explotabilidad e impacto | Sin CVSS no se puede clasificar. Los otros nulos no afectan a los eventos |
| 4.7 Validaciones | `base_score` entre 0 y 10, `cve_id` únicos y **descargados − eliminados = N** | Comprueba que la limpieza no perdió ni inventó filas |

**Atípicos.** Se marcan con el método IQR (fuera de Q1 − 1,5·IQR y Q3 + 1,5·IQR) en `n_referencias` y en los CVE por día,
**sin eliminarlos**: son datos reales y quitarlos sesgaría las proporciones. `base_score` va de 0 a 10, así que no tiene
atípicos por definición.

## Archivos que se guardan en `data/`

| Archivo | Contenido |
|---|---|
| `cves_<inicio>_<fin>_<origen>_<fecha>.csv` | Lo descargado **sin depurar**, con las 20 columnas. De aquí se vuelve a cargar |
| `cves_<…>.json` | Metadatos: `inicio`, `fin`, `origen` (`api` o `csv`), `guardado` y `fecha_consulta` |
| `cves_<…>.crudo.json.gz` | La **base original**: la respuesta de la NVD tal como llegó, comprimida. Solo en las descargas de la API |
| `ejecuciones.jsonl` | Registro de cargas, cálculos y exportaciones |

La base **limpia** (Ω) no se guarda: se genera al cargar y se descarga con `GET /api/exportar/cve`.
