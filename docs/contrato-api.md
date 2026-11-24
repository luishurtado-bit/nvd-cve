# Contrato de la API

La API vive bajo `/api`. La **forma exacta** de cada petición y respuesta está en Swagger
(<http://localhost:8000/docs>) y en `frontend/src/api/schema.d.ts`; este documento dice **qué hace cada ruta**
y qué parámetros acepta. Una prueba (`backend/tests/test_endpoints.py`) falla si una ruta de la API no aparece aquí.

**Errores.** Un dato inválido responde `422` con `{"detail": "texto"}`. Con N = 0 (sin CVE) los cálculos de
probabilidad responden `422` con «N = 0».

**Proporciones.** Siempre entre 0 y 1; el porcentaje lo arma el frontend.

**Cambios que obligan a regenerar los tipos** (`npm run tipos` en `frontend/`): cualquier cambio en esta tabla.
Los commits que **rompen** lo que ya usa el frontend llevan `!`, por ejemplo `feat(api)!: …`.

## Salud

| Ruta | Qué hace | Respuesta |
|---|---|---|
| `GET /api/salud` | Comprueba que el backend está arriba | `Salud` |

## Datos

Mientras no se cargue nada, la API responde con **datos simulados** (N = 1000) y `origen` vale `"simulado"`.
Al arrancar, el backend retoma la última descarga de `data/`; si no hay, la demo de `data/demo/`.

| Ruta | Qué hace | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/datos/cargar` | Descarga de la NVD los CVE del rango, los guarda y los deja como conjunto actual. Espera a que termine | JSON `{inicio, fin}` (máx. 366 días; `502` si la NVD no responde) | `ResumenDatos` |
| `POST /api/datos/descargas` | Lo mismo, pero **en segundo plano**: responde enseguida. Solo una a la vez (`409` si hay otra) | JSON `{inicio, fin}` | `DescargaOut` (`202`) |
| `GET /api/datos/descargas/{id_}` | Progreso de una descarga: tramo, CVE descargados y, al terminar, el resumen (`404` si no existe) | — | `DescargaOut` |
| `POST /api/datos/archivo` | Carga un CSV con el formato de `data/` (mínimo: `cve_id`, `publicado`, `base_score`, `vector_ataque`, `privilegios`) | Formulario con `archivo` (`.csv`) | `ResumenDatos` |
| `GET /api/datos/resumen` | Cuántos CVE se descargaron, cuántos se quitaron y por qué, N, periodo, origen y fecha de consulta | — | `ResumenDatos` |
| `GET /api/datos/calidad` | Reporte de limpieza: pasos 4.1 a 4.7, nulos antes y después, dominios, atípicos, validaciones y conciliación | — | `CalidadOut` |

La NVD acepta como máximo **120 días por consulta**: un rango de hasta 120 días es un solo tramo (paginado de a 2000 CVE) y uno mayor se parte en varios.

## Probabilidad

Las cuatro son `POST` con JSON. Los **eventos** se definen con `criterios`: `umbral` (A: `base_score` ≥ umbral,
por defecto 9), `vector` (B, por defecto `NETWORK`) y `privilegios` (C, por defecto `NONE`).

| Ruta | Qué hace | Entrada | Respuesta |
|---|---|---|---|
| `POST /api/eventos` | N, conteo y probabilidad de A, B, C y sus intersecciones | `CriteriosIn` | `EventosOut` |
| `POST /api/reglas` | Complemento, unión, intersección e independencia de dos eventos, con la tabla 2×2, la diferencia y la razón | `{criterios, x, y}` (X ≠ Y, de A, B, C) | `ReglasOut` |
| `POST /api/bayes` | Actualiza P(A) al observar B o C, con prior editable | `{criterios, condicionante, prior?}` | `BayesOut` |
| `POST /api/binomial` | X ~ Bin(n, p): número de críticos en un lote de n. Trae la pmf, los supuestos y el n mínimo | `{n, k, p?, confianza?, umbral}` | `BinomialOut` |

En la binomial, `p` se estima como K/N si no se da; solo `umbral` (el evento A) cambia K. **`criterios` ya no
existe en la binomial**: un campo de más responde `422`.

## Dashboard

Todas son `GET` y aceptan los **mismos filtros globales**, que se aplican a todo el conjunto:

| Filtro | Qué hace |
|---|---|
| `desde`, `hasta` | CVE publicados entre esas fechas, ambas incluidas (`AAAA-MM-DD`) |
| `severidad`, `vector`, `privilegios` | Uno o varios valores; se repite el parámetro: `?severidad=CRITICAL&severidad=HIGH` |

| Ruta | Parámetros propios | Qué devuelve | Respuesta |
|---|---|---|---|
| `GET /api/dashboard/severidad` | — | Conteo por severidad, de `CRITICAL` a `NONE` | `DistribucionOut` |
| `GET /api/dashboard/vector-ataque` | — | Conteo por vector de ataque | `DistribucionOut` |
| `GET /api/dashboard/privilegios` | — | Conteo por privilegios (`NONE`, `LOW`, `HIGH`) | `DistribucionOut` |
| `GET /api/dashboard/fuentes` | `top` (10) | Las fuentes (CNA) que más CVE publicaron | `DistribucionOut` |
| `GET /api/dashboard/cwe` | `top` (10) | Los CWE más frecuentes | `DistribucionOut` |
| `GET /api/dashboard/serie-diaria` | `agrupar` = `dia`, `semana` o `mes`; `umbral` | CVE y críticos por periodo, con la proporción de críticos. Las semanas empiezan en lunes | `SerieDiariaOut` |
| `GET /api/dashboard/histograma` | `bins` (10) | Histograma de `base_score` con media, mediana y desviación | `HistogramaOut` |
| `GET /api/dashboard/resumen-numerico` | — | Mínimo, cuartiles, máximo, media, desviación y asimetría de `base_score` y `n_referencias` | `list[ResumenNumericoOut]` |
| `GET /api/dashboard/critico-por` | `variable` = `vector`, `privilegios`, `version` o `fuente` (obligatorio); `umbral`; `top` | Proporción de críticos en cada grupo | `CriticoPorOut` |
| `GET /api/dashboard/cruce` | `fila` y `columna` (por defecto severidad × vector); distintas | Tabla cruzada con conteos y proporción por fila | `CruceOut` |
| `GET /api/dashboard/kpis` | `umbral` | N, críticos, % críticos, media, mediana, % de red, % sin privilegios, KEV, periodo, fecha de consulta y origen | `KpisOut` |

`kpis` incluye `N_sin_filtro` para mostrar «N de N_sin_filtro» cuando hay filtros.

## Exportar

Todas son `GET` y devuelven un archivo. Los CSV van en UTF-8 con BOM para que Excel muestre bien las tildes. Los
parámetros son los del cálculo, por query string, así que sirve un enlace normal.

| Ruta | Qué descarga | Parámetros |
|---|---|---|
| `GET /api/exportar/cve` | **Base limpia**: los CVE de Ω con las 20 variables y `critico` | `umbral` (9) |
| `GET /api/exportar/crudo` | **Base original**: el JSON de la NVD comprimido (`.json.gz`) si viene de una descarga; el CSV si viene de un CSV subido o de los simulados | — |
| `GET /api/exportar/calidad` | Los pasos de la limpieza con lo eliminado y su justificación | — |
| `GET /api/exportar/eventos` | Conteo y probabilidad de A, B, C y sus intersecciones | `umbral`, `vector`, `privilegios` |
| `GET /api/exportar/reglas` | Las medidas de `reglas` (la tabla 2×2 va en cuatro filas `tabla_…`) | `umbral`, `vector`, `privilegios`, `x`, `y` |
| `GET /api/exportar/bayes` | Probabilidad total y Bayes, paso a paso | `umbral`, `vector`, `privilegios`, `condicionante`, `prior` |
| `GET /api/exportar/binomial` | Tabla de P(X = k), P(X ≤ k) y P(X ≥ k) para k = 0…n | `n` (obligatorio), `k`, `p`, `umbral` |

## Registro de ejecuciones

| Ruta | Qué hace | Parámetros |
|---|---|---|
| `GET /api/ejecuciones` | Las últimas cargas, cálculos y exportaciones con sus parámetros, resultado y los datos usados (origen, N y periodo), de la más reciente a la más antigua | `limite` (50) |

Se registran `cargar`, `archivo`, `descarga`, `eventos`, `reglas`, `bayes`, `binomial`, `exportar_cve`,
`exportar_crudo` y `exportar_calidad`. Las consultas del dashboard y de la calidad no se registran.
