# Plan de trabajo v2: NVD/CVE (backend y frontend)

Este plan cubre lo que falta del proyecto para cumplir dos materias:

- **Electiva III (Ciencia de Datos):** selección de datos, limpieza, análisis descriptivo, dashboard y entregables.
- **Estadística:** reglas de probabilidad, Bayes y **distribución binomial**, explicados de forma que se entiendan.

---

## 0. Cómo leer este plan

### Quién es quién

| Rol | Persona | Rama | Secciones que le tocan |
|---|---|---|---|
| **Backend**: API, limpieza y cálculos | Edwin | `snydev` | 1, 2, 3, **4**, 6, 7, 8 |
| **Front A**: páginas de estadística (eventos, Bayes, binomial) | Luis | `luis` | 1, 2, **3**, **5.1**, **5.3**, 6, 7 |
| **Front B**: datos, calidad y dashboard | Gaby | `gaby-front-b` | 1, 2, 3, **5.1**, **5.2**, 6, 7 |

Las secciones 1 a 3 son para todos. Explican qué construimos y el vocabulario común, que es lo que más se presta a confusión.

### Códigos de las tareas

| Prefijo | De quién | Ejemplo |
|---|---|---|
| `B` | Backend | B16: extraer 20 variables |
| `FG` | Frontend, base común: cada tarea tiene un responsable | FG1: barra de contexto |
| `FA` | Front A | FA7: página de la binomial |
| `FB` | Front B | FB7: página de calidad |
| `FC` | Cierre: los tres | FC4: guion de la presentación |

Los números siguen la numeración del plan anterior; por eso empiezan en B16, FA5 y FB6.

Tamaño aproximado: **S** ≈ medio día, **M** ≈ 1–2 días, **L** ≈ 3 días o más.

Cada tarea dice:

- **Qué** hay que hacer.
- **Dónde**: archivos.
- **Necesita**: de qué otra tarea depende. Si no depende de ninguna, se puede empezar ya.
- **Listo cuando**: cómo saber que está terminada.

---

## 1. Resumen en una página

### Qué estamos construyendo

Una aplicación web que hace lo siguiente:

1. **Descarga** de la NVD los CVE (vulnerabilidades) publicados en un **rango de fechas** que elige el usuario. El periodo de estudio previsto es de **120 días**, el máximo que la API devuelve en una consulta.
2. **Limpia** los datos con los mismos pasos del notebook `nvd-electiva-3.ipynb` y muestra un reporte de qué se quitó y por qué.
3. **Describe** los datos en un dashboard: cuántos hay, qué severidad tienen, cómo cambian en el tiempo y por fuente.
4. **Explica la probabilidad** con esos datos: eventos, reglas, Bayes y, al final, la **binomial**, que responde la pregunta principal.

### La pregunta que responde la aplicación

> Si un equipo de seguridad revisa al azar un **lote de n CVE** del periodo, **¿cuántos críticos debe esperar encontrar y con qué probabilidad?**

### Recorrido de la aplicación: cada página responde algo

| # | Página (ruta) | Qué responde | Quién la hace |
|---|---|---|---|
| 1 | **Inicio** (`/`) | ¿De qué trata esto y qué encontramos? Es el dashboard único que pide la guía. | Front B |
| 2 | **Datos y calidad** (`/datos`) | ¿Qué datos se usaron y cómo se limpiaron? | Front B |
| 3 | **Análisis descriptivo** (`/descriptivo`) | ¿Cómo son los CVE del periodo? (P1 a P4) | Front B |
| 4 | **Eventos y reglas** (`/eventos`) | ¿Qué tan probable es que un CVE sea crítico, sea de red o no pida privilegios? ¿Esos eventos se relacionan? | Front A |
| 5 | **Bayes** (`/bayes`) | Si sé que un CVE es de red, ¿cambia la probabilidad de que sea crítico? | Front A |
| 6 | **Binomial** (`/binomial`) | ¿Cuántos críticos hay en un lote de n? (la pregunta principal) | Front A |

### Quién hace qué, por fase

| Fase | Backend | Front A | Front B |
|---|---|---|---|
| **5. Datos y limpieza** | B16 → B17 → B18 → B19 → B20 → B13 | FG3 (formato y «Ver cálculo»), FG5 (colores de los gráficos) | FG4 (unir carpetas y componentes de dashboard), FG1 y FG2 (barra de contexto y pie), FB9 (progreso de la descarga) |
| **6. Descriptivo** | B21, B22, B23, B24 | FA6 (Bayes: no necesita backend) | FB7 (calidad), FB6 (inicio), FB8 (descriptivo) |
| **7. Estadística clara** | B26, B27 | FA5 (eventos y reglas), FA7 (binomial), FA8 (exportar) | Apoya con capturas y textos de los hallazgos |
| **8. Cierre** | B11, B12, B28 | FC1 a FC4 | FC1 a FC4 |

---

## 2. Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| **Periodo** | Lo elige el usuario con un rango de fechas. El de estudio previsto es de **120 días**. Nada depende de un periodo concreto: todo se calcula sobre lo que esté cargado. |
| **Cifras de ejemplo** | En este plan se usa como ejemplo la semana del notebook (12 al 18 nov 2026): 3645 descargados, 22 *Rejected*, 0 duplicados, 64 sin puntuación, **N = 3559**, **311 críticos (8,7 %)**. Son solo ilustración: **no** se escriben en el código ni en las pruebas. |
| **Obtención y limpieza** | El backend usa la lógica del notebook: 20 variables y los pasos 4.1 a 4.7. El notebook se entrega como evidencia reproducible. |
| **Estadística** | Solo reglas de probabilidad, Bayes y **binomial**. No entran normal, TLC, intervalos, pruebas de hipótesis, hipergeométrica ni simulación. |
| **Binomial** | Los mismos cálculos de hoy, con una presentación nueva. |
| **Predictivo** (opcional en la guía) | En espera (sección 9). |
| **Nombres de columnas** | Se conservan los actuales (`cve_id`, `publicado`, `base_score`…). Las nuevas van en español y `snake_case`. |
| **Datos simulados** | Mientras no haya un periodo real cargado, la API responde con datos simulados y lo indica con `origen: "simulado"`. El frontend debe mostrarlo (FG1). |

---

## 3. Vocabulario común (para los tres)

### Los datos

| Término | Qué significa | Dónde aparece |
|---|---|---|
| **CVE** | Una vulnerabilidad publicada, con identificador `CVE-AAAA-NNNN`. | Cada fila de la base |
| **NVD** | Base de datos del NIST de donde descargamos los CVE (CVE API 2.0). | Fuente; se cita en el pie (FG2) |
| **CVSS / `base_score`** | Puntaje de gravedad de 0 a 10. Hay versiones 3.1, 3.0 y 4.0; se usa la primera disponible en ese orden. | Dashboard, evento A |
| **Severidad** | Categoría del puntaje: BAJA, MEDIA, ALTA o CRÍTICA (≥ 9,0). | Gráfico de severidad |
| **Vector de ataque (AV)** | Desde dónde se explota: red (NETWORK), red adyacente, local o físico. | Evento B |
| **Privilegios (PR)** | Qué permisos necesita el atacante: ninguno (NONE), bajos o altos. | Evento C |
| **Fuente (CNA)** | Organización que publicó el CVE. | P3, top de fuentes |
| **CWE** | Tipo de debilidad, por ejemplo CWE-79 (XSS). | P4 |
| **KEV** | El CVE está en el catálogo de vulnerabilidades explotadas de CISA. | Indicador |
| ***Rejected*** | CVE anulado. Se excluye porque no es una vulnerabilidad real. | Limpieza |
| **Sin puntuación** | CVE sin CVSS. Se excluye porque no se puede clasificar. | Limpieza |

### La estadística

| Término | Qué significa | Ejemplo (semana del notebook) |
|---|---|---|
| **Experimento** | Elegir **al azar un CVE** de los publicados en el periodo, ya limpios. | — |
| **N** | Cuántos CVE quedan después de limpiar: el espacio muestral Ω. | 3559 |
| **Evento A** | El CVE es **crítico** (`base_score` ≥ 9,0; el umbral se puede cambiar). | 311 CVE |
| **Evento B** | El CVE se explota **por red** (AV = NETWORK). | — |
| **Evento C** | El CVE **no pide privilegios** (PR = NONE). | — |
| **K** | Cuántos CVE cumplen A. | 311 |
| **p = P(A) = K / N** | Probabilidad de que un CVE al azar sea crítico. | 311 / 3559 = 8,7 % |
| **P(A \| B)** | Probabilidad de que sea crítico **sabiendo** que es de red. | — |
| **Independencia** | A y B son independientes si P(A ∩ B) = P(A)·P(B). Con datos reales casi nunca se cumple exactamente; por eso se muestra **cuánto** se alejan (B27). | — |
| **Prior y posterior** | En Bayes: la probabilidad de A antes de saber E y después de saberlo. | — |
| **Lote de n** | Grupo de n CVE que el equipo revisa. | n = 20 |
| **X ~ Bin(n, p)** | X = cuántos críticos hay en el lote. | — |
| **E(X) = n·p** | Cuántos críticos se esperan en promedio. | 20 · 0,087 ≈ 1,7 |
| **σ = √(n·p·(1−p))** | Cuánto varía X de un lote a otro. | ≈ 1,3 |
| **n mínimo** | El lote más pequeño que da al menos un X % de probabilidad de encontrar un crítico: n = ln(1−X) / ln(1−p), redondeado hacia arriba. | — |
| **Regla del 5 %** | La binomial es válida si el lote es pequeño frente a N: n < 0,05·N. | n < 177 |

### Las preguntas de análisis (la guía pide al menos tres)

- **P1:** ¿Qué proporción de los CVE es crítica y cómo se reparte la severidad?
- **P2:** ¿Cambia la proporción de críticos según el vector de ataque y los privilegios?
  - Es una **observación, no una causa**: la relación viene de cómo se calcula el CVSS.
- **P3:** ¿Cómo varían el volumen de CVE y el % de críticos en el tiempo (por día, semana o mes) y por fuente?
- **P4** (complementaria): ¿Qué debilidades (CWE) son las más frecuentes?

---

## 4. Backend

Se trabaja por **iteraciones pequeñas**: código, prueba con `pytest` y un commit sugerido, y se revisa antes de seguir. Las pruebas usan `tests/conftest.py`, que aísla `DIR_DATOS` y bloquea la red.

### Fase 5: obtención y limpieza con la lógica del notebook

**[x] B16 (M) Extraer las 20 variables.**
- **Qué:** llevar al backend lo que hacen las celdas 7–8 del notebook. Columnas nuevas:
  - `complejidad_ataque`, `interaccion_usuario`;
  - `impacto_confidencialidad`, `impacto_integridad`, `impacto_disponibilidad`;
  - `puntaje_explotabilidad`, `puntaje_impacto`;
  - `fuente` (en minúsculas), `n_referencias`, `kev`, `ultima_modificacion`.

  En v4.0, la interacción de usuario P o A pasa a R, y los impactos salen de VC, VI y VA. Se conserva la prioridad v3.1 → v3.0 → v4.0, con Primary antes que Secondary (`elegir_metrica`).
- **Dónde:** `backend/nvd/extraccion.py`; las pruebas en `tests/test_extraccion.py` con `tests/ejemplos_nvd.py`.
- **Necesita:** nada.
- **Listo cuando:** cada columna nueva tiene una prueba con un CVE de ejemplo v3.1 y otro v4.0.
- **El frontend lo nota en:** el diccionario de variables (FB7) y la exportación `/api/exportar/cve`.

**[x] B17 (M) Depuración por pasos, con su justificación.**
- **Qué:** `depurar()` devuelve, además de los datos, una lista de pasos `PasoDepuracion{paso, descripcion, antes, despues, eliminados, justificacion}`, en el orden del notebook:

  | Paso | Qué hace |
  |---|---|
  | 4.1 Inventario | Cuenta los nulos por columna antes de limpiar. |
  | 4.2 *Rejected* | Los excluye: no son vulnerabilidades reales. |
  | 4.3 Duplicados por `cve_id` | Los cuenta y deja la versión con la `ultima_modificacion` más reciente. |
  | 4.4 Tipos | Pasa los puntajes a número, la fecha a UTC, `n_referencias` a entero y `kev` a booleano. Los **errores de formato** se cuentan aparte de los CVE sin puntuación. |
  | 4.5 Texto y dominio | Quita espacios, pasa a mayúsculas y valida que severidad, AV, AC, PR y UI tengan valores permitidos. Un valor fuera de dominio se cuenta y queda nulo. |
  | 4.6 Nulos | Sin puntuación → se excluye. CWE, explotabilidad e impacto nulos se conservan: v4.0 no los trae y no afectan los eventos. |
  | 4.7 Validaciones | `base_score` en [0, 10], ids únicos y conciliación **descargados − eliminados = N**. |

  `ConteoDepuracion` gana `duplicados` y `formato_invalido`.
- **Dónde:** `backend/nvd/depuracion.py`.
- **Necesita:** B16.
- **Listo cuando:** hay una prueba por paso y la conciliación cuadra.

**[x] B18 (S) Atípicos.**
- **Qué:** con el método IQR se **marcan, sin eliminarlos**, los atípicos de `n_referencias` y del volumen diario. Son datos reales y quitarlos sesgaría las proporciones. `base_score` va de 0 a 10, así que no tiene atípicos; eso se deja documentado.
- **Dónde:** `backend/stats/descriptiva.py` (`atipicos_iqr`).
- **Necesita:** B16.
- **Listo cuando:** la función pura tiene su prueba.

**[x] B19 (M) Reporte de calidad y bases para entregar.**
- **Qué:**
  - Nuevo `GET /api/datos/calidad` con los pasos de B17, los nulos por columna antes y después, las frecuencias de dominio, los atípicos de B18 y la conciliación.
  - `ResumenDatos` gana `duplicados`, `formato_invalido` y `fecha_consulta`, que sale del `guardado` de los metadatos actuales.
  - Se guarda la **base original** (JSON crudo de la API; hoy solo se guardan el CSV limpio y los metadatos) y la **base limpia** (CSV).
  - Nuevos `GET /api/exportar/crudo` y `GET /api/exportar/calidad`. `GET /api/exportar/cve` pasa a 20 columnas más `critico`.
  - Cada llamada queda en el registro de ejecuciones (`api/registro.py`).
- **Dónde:** `api/rutas/datos.py`, `api/rutas/exportar.py`, `api/esquemas.py`, `nvd/almacen.py`.
- **Necesita:** B17 y B18.
- **Listo cuando:** `/api/datos/calidad` responde con datos reales y simulados, y las tres descargas funcionan.
- **El frontend lo nota en:** **FB7** (página de calidad) y FG1 (fecha de consulta).

**[x] B20 (S) Consulta por rango de fechas.**
- **Qué:** se mantiene la consulta por rango (`pubStartDate`/`pubEndDate`), paginada y en tramos de hasta 120 días, que ya existe en `ClienteNVD` y `nvd/periodos.py`.
  - **No** se descarga día por día como en el notebook: con 120 días serían más de 120 consultas.
  - El conteo **por día** se calcula después, agrupando por `publicado`.
  - El backend sigue aceptando hasta 366 días (`CargarIn`); la interfaz sugiere 120.
- **Dónde:** `nvd/descargar.py`, `api/descargas.py`, `nvd/almacen.py`.
- **Necesita:** B19.
- **Listo cuando:** una descarga de 120 días queda guardada con la base cruda, la limpia y la `fecha_consulta`.

**B13 (S) Conjunto para la demo y pruebas del flujo completo.**
- **Qué:**
  - El equipo elige el periodo de 120 días. Se descarga una vez y se guarda en `data/demo/` (con una excepción en `.gitignore`), para no depender de la API en la sustentación. El backend lo carga al arrancar si no hay otro.
  - Pruebas del flujo con datos sintéticos: un caso por paso de limpieza más la conciliación. No dependen del periodo.
  - Opcional: pasar por el backend el JSON crudo del notebook y comprobar que los conteos por paso coinciden. Valida la lógica, no fija el periodo.
- **Necesita:** B20.
- **Listo cuando:** el backend arranca sin conexión y muestra el periodo de la demo.
- **El frontend lo nota en:** desde aquí se puede trabajar con datos reales en lugar de los simulados.

### Fase 6: descriptivo para el dashboard

**[x] B21 (M) Filtros globales.**
- **Qué:** todos los `GET /api/dashboard/*` aceptan `desde`, `hasta`, `severidad`, `vector` y `privilegios`, para que los indicadores y los gráficos respondan al mismo filtro. Se implementa con una función común `filtrar(df, filtros)`.
- **Dónde:** `api/fuente.py`, `api/rutas/dashboard.py`.
- **Listo cuando:** una prueba confirma que dos endpoints con el mismo filtro dan el mismo total.
- **El frontend lo nota en:** FB8.

**[x] B22 (S) Resumen numérico ampliado.**
- **Qué:** agrega mínimo, Q1, Q3, máximo y asimetría a n, media, mediana y desviación, para `base_score` y `n_referencias`.
- **Dónde:** `stats/descriptiva.py`.
- **El frontend lo nota en:** la tabla de resumen de FB8.

**[x] B23 (M) Agrupaciones para P2 y P3.**
- **Qué:**
  - `GET /api/dashboard/critico-por?variable=vector|privilegios|version|fuente` devuelve conteo, críticos y % crítico por grupo.
  - `GET /api/dashboard/cruce` devuelve la tabla cruzada severidad × vector, con conteos y % por fila.
  - `GET /api/dashboard/serie-diaria` agrega críticos y % de críticos, y acepta `agrupar=dia|semana|mes`; con 120 días, la serie por día tiene demasiados puntos.
  - `GET /api/dashboard/privilegios` y `GET /api/dashboard/fuentes?top=10`.
- **El frontend lo nota en:** FB6 y FB8.

**[x] B24 (S) Indicadores clave.**
- **Qué:** `GET /api/dashboard/kpis` devuelve N, críticos, % críticos, media y mediana de `base_score`, % de red, % sin privilegios, KEV, periodo, `fecha_consulta` y `origen`.
- **El frontend lo nota en:** FB6 y FG1.

### Fase 7: apoyo para que la estadística se entienda

**B26 (S) Binomial más clara.**
- **Qué:**
  - `BinomialIn` deja de pedir vector y privilegios, que no intervienen en p; solo queda `umbral`.
  - La salida, que ya trae `K` y `N`, gana:
    - `n_max_recomendado = ⌊0,05·N⌋`;
    - `supuestos`: n fijo, dos resultados, p constante e independencia aproximada (n < 0,05·N). Cada uno con estado `cumple` o `advertencia` y un texto corto.
  - Los cálculos no cambian, y las `advertencias` actuales se mantienen.
- **Dónde:** `api/rutas/binomial.py`, `api/esquemas.py`, `stats/binomial.py`.
- **El frontend lo nota en:** **FA7**. ⚠ Cambia la forma de la API: hay que regenerar los tipos.

**B27 (S) Reglas más explicables.**
- **Qué:**
  - Se agregan `diferencia = P(X∩Y) − P(X)·P(Y)` y `razon = P(X∩Y) / (P(X)·P(Y))`. Hoy solo se devuelve el sí/no `independientes`, decidido con tolerancia 1e-9.
  - Se agregan los 4 conteos de la tabla 2×2: X∩Y, X∩Yᶜ, Xᶜ∩Y y Xᶜ∩Yᶜ.
  - La `nota` se adapta a los eventos elegidos, no siempre «A y B».
- **Dónde:** `stats/probabilidad.py`, `api/rutas/probabilidad.py`.
- **El frontend lo nota en:** **FA5**.

### Fase 8: cierre del backend

- **B11 (S) Pruebas de la API:** una por endpoint, incluidos los nuevos.
- **B12 (S) Despliegue:** `Dockerfile`, más corregir la ruta del frontend compilado en `backend/api/main.py:34`, que dice `frontend_dist` y debe ser `frontend/dist`. Plan B: ejecutarlo en local.
- **B28 (S) Documentación:** `README.md`, diccionario de las 20 variables y tabla del contrato.

---

## 5. Frontend

### 5.1 Base común


**FG4 (M) Unir carpetas y componentes del dashboard. Front B. Va primero.**
- **Qué:**
  - Unir `src/componentes/` y `src/components/` en una sola carpeta, `src/componentes/`. Mueve archivos de los dos, así que se hace primero y se avisa antes de que el otro siga.
  - `TarjetaKpi` reemplaza a `Metrica` (en `CargaDatos.tsx`) y a `Estadistico` (en `DashboardDescriptivo.tsx`).
  - `TarjetaGrafica` (título, subtítulo con la pregunta P1–P4, botones PNG y CSV) sale de `DashboardDescriptivo.tsx`.
- **Necesita:** nada.
- **Listo cuando:** hay una sola carpeta de componentes y las páginas actuales funcionan igual.

**FG3 (M) Formato y explicaciones. Front A.**
- **Qué:**
  - `src/lib/formato.ts`: las probabilidades se muestran como **porcentaje con la fracción**, por ejemplo «8,7 % (311 de 3559)», con coma decimal (es-CO). Los 4 decimales solo aparecen dentro de «Ver cálculo».
  - `VerCalculo`: desplegable con la fórmula y los números ya sustituidos.
  - `Ayuda`: icono con un tooltip que toma su texto del glosario de la sección 3.
  - Las constantes de vectores y privilegios y `mensajeDe`, hoy repetidas en 4 páginas, pasan a un solo archivo.
- **Necesita:** FG4, por la carpeta.
- **Listo cuando:** ninguna página muestra una probabilidad como `0.0874`.

**FG1 (S) Barra de contexto de datos. Front B.**
- **Qué:** en la barra superior (`Layout.tsx`): origen (simulado, NVD API o CSV), periodo, N y fecha de consulta. Con datos simulados, un **aviso amarillo** visible en todas las páginas.
- **Necesita:** hoy sirve `GET /api/datos/resumen` (ya trae `origen`, periodo y N); la fecha de consulta llega con B19.

**FG2 (S) Pie con la fuente. Front B.**
- **Qué:** «Fuente: NVD – NIST, CVE API 2.0. Consultado el …», con enlace.

**FG5 (S) Gráficos con los colores del tema. Front A.**
- **Qué:** `GraficoPmf.tsx` también en modo oscuro, con títulos de eje, unidades y leyenda.

### 5.2 Front B: datos y dashboard (Electiva III)

**FB9 (S) Descarga con progreso real.**
- **Qué:** usar `POST /api/datos/descargas` y consultar `GET /api/datos/descargas/{id}` para mostrar el tramo y los CVE descargados. Las dos rutas **ya existen**. El selector de fechas sugiere 120 días y avisa si el rango los supera, porque la descarga se parte en tramos.
- **Necesita:** nada.

**FB7 (M) Página de calidad de datos** (`/datos`, junto con la carga).
- **Qué:**
  - **Embudo** de la limpieza: un escalón por paso, con lo eliminado y la justificación. Ejemplo: 3645 → 3623 → 3559.
  - Nulos por columna, antes y después.
  - Diccionario de las 20 variables.
  - Atípicos marcados.
  - Botones para descargar la base original, la base limpia y el reporte.
- **Necesita:** B19. Mientras tanto se puede maquetar con el ejemplo de la sección 6.

**FB6 (L) Inicio: el dashboard único de la guía** (`/`).
- **Qué:**
  - El problema y la pregunta principal (sección 1).
  - 5 indicadores de `/api/dashboard/kpis`.
  - 3 o 4 gráficos: severidad, % crítico por vector y privilegios, y serie con % de críticos.
  - **3 hallazgos** escritos a partir de los datos, con la nota «observación, no causa».
  - Fuente y fecha de consulta.
- **Necesita:** B23 y B24.
- **Listo cuando:** la página sola sirve como captura del dashboard para el informe.

**FB8 (L) Análisis descriptivo** (`/descriptivo`, sale de `DashboardDescriptivo.tsx`).
- **Qué:**
  - **Filtros globales** (fechas dentro del periodo, severidad, vector y privilegios) que se envían al backend y cambian **todos** los indicadores y gráficos.
  - Selector de agrupación de la serie: día, semana o mes.
  - Ejes con título y unidades («puntos CVSS, 0–10», «número de CVE»).
  - Gráficos nuevos: severidad × vector en barras apiladas, % crítico por grupo y top de fuentes.
  - Tabla de resumen numérico: mínimo, Q1, mediana, Q3, máximo, media y σ.
  - Cada gráfico lleva como subtítulo la pregunta (P1 a P4) que responde.
- **Necesita:** B21, B22 y B23.

### 5.3 Front A: estadística (rediseño para que se entienda)

**Reglas para las tres páginas** (la idea es que la entienda alguien que no vio la clase):

1. Arriba, **la pregunta en palabras**: «¿Qué tan probable es que un CVE al azar sea crítico?».
2. Luego, **la respuesta grande, en porcentaje y con la fracción**: «8,7 % (311 de 3559)».
3. Abajo, el **cálculo dentro de «Ver cálculo»** (FG3), nunca suelto.
4. **Frecuencias antes que fórmulas**: «de cada 100 CVE de red, unos 10 son críticos».
5. **Solo las entradas que cambian el resultado.** Si un campo no influye, no se muestra.
6. Todas las cifras salen de los datos cargados. Los números de esta sección son ejemplos.

**FA5 (M) Eventos y reglas** (une `Eventos.tsx` y `Reglas.tsx` en `/eventos`).
- **Qué:**
  - Encabezado del experimento: «Se elige al azar un CVE de los N publicados entre [inicio] y [fin]».
  - Tres tarjetas, A (crítico), B (por red) y C (sin privilegios), cada una con una frase, la fracción y el %.
  - Selector de X e Y y una **tabla de contingencia 2×2** con conteos y %. Al pasar el mouse por una celda se resalta la regla que la usa.
  - Las reglas como frases: complemento («no es crítico»), intersección, unión y condicional.
  - Independencia: dos barras, P(X∩Y) frente a P(X)·P(Y), con la `razon` («ocurren juntos 1,4 veces más de lo esperado si fueran independientes») y el aviso de que la relación viene del CVSS.
- **Necesita:** FG3. La tabla 2×2 y la `razon` llegan con B27; antes se pueden calcular en el frontend con los datos de `/api/eventos`.

**FA6 (M) Bayes** (`/bayes`).
- **Qué:**
  - **Árbol de probabilidad**: A / no A → E / no E, con frecuencias («de cada 1000 CVE…»).
  - Barras del prior frente al posterior.
  - Solo el campo del evento elegido: vector si E = B, privilegios si E = C.
  - Prior con deslizador y botón «usar P(A) de los datos».
  - El paso a paso dentro de «Ver cálculo».
- **Necesita:** FG3. **No necesita cambios en el backend.**

**FA7 (L) Binomial: la página central** (`/binomial`). Tiene cuatro bloques, de arriba abajo:

1. **El modelo.**
   - «X = número de CVE críticos en un lote de n CVE elegidos al azar».
   - p = K / N, por ejemplo 311 / 3559 = 8,7 %, con un interruptor para escribir p a mano.
   - **Lista de los 4 supuestos** con su estado, por ejemplo «n = 20 < 0,05·N = 177 ✓». Con 120 días N es mayor, y el límite también.
2. **La pregunta.**
   - Se elige «exactamente / a lo sumo / al menos k». Aparece **una respuesta grande** en palabras: «La probabilidad de encontrar al menos 3 críticos en un lote de 20 es …%». Las otras dos se muestran pequeñas.
   - En el gráfico de la pmf se resaltan las barras que cuentan para la pregunta, con leyenda. El eje x se corta donde P < 0,1 % y el resto se marca «≈ 0».
3. **Qué esperar del lote.**
   - E(X): «en promedio 1,7 críticos por lote de 20».
   - σ y Var, con la fórmula en «Ver cálculo».
4. **Dimensionar el lote.**
   - Tarjeta aparte: «¿Cuántos CVE hay que revisar para tener al menos X % de probabilidad de encontrar un crítico?» → n mínimo, con la fórmula en «Ver cálculo».

Además:
- La tabla de la pmf, en % y no en notación científica, va dentro de un desplegable.
- Se quitan los campos de vector y privilegios. El umbral pasa a «Opciones avanzadas».

- **Necesita:** FG3 y FG5. Con la API actual (que ya trae `K`, `N` y `advertencias`) se pueden hacer los bloques 2, 3 y 4. El bloque 1 completo necesita B26.

**FA8 (S) Exportar.**
- **Qué:** botones CSV en eventos, reglas, Bayes y binomial (`/api/exportar/*`, **ya existen**) y PNG de la pmf.

### 5.4 Cierre (los tres)

- **FC1 (S) Integración:**
  - Probar con el conjunto de la demo (120 días) y con un rango corto.
  - Probar los casos límite: N = 0, P(E) = 0, n grande y un día sin CVE.
- **FC2 (S) Pruebas de los componentes clave** y accesibilidad básica: contraste y etiquetas.
- **FC3 (S) Capturas** de cada página, para el informe y como evidencia del dashboard.
- **FC4 (S) Guion de la presentación de 15 minutos**, en el orden de la guía:
  1. Contexto (Inicio).
  2. Limpieza (Calidad).
  3. Descriptivo.
  4. Modelo (Binomial).
  5. Conclusiones.

---

## 6. Qué cambia en la API (el contrato entre backend y frontend)

| Ruta | Cambio | Tarea | Lo usa | ¿Hay que regenerar los tipos? |
|---|---|---|---|---|
| `GET /api/datos/calidad` | Nueva | B19 | Front B (FB7) | Sí |
| `GET /api/datos/resumen` | Gana `duplicados` y `formato_invalido` (ya, con B17) y `fecha_consulta` (B19). ⚠ `descargados` ahora cuenta las filas crudas, con duplicados | B17, B19 | Los dos (FG1) | Sí |
| `GET /api/exportar/crudo`, `/calidad` | Nuevas. `crudo`: JSON de la NVD comprimido (`.json.gz`) si viene de una descarga; CSV si viene de un CSV subido o de los simulados | B19 | Front B | No |
| `GET /api/dashboard/*` | Aceptan `desde`, `hasta`, `severidad`, `vector` y `privilegios`. Los tres últimos admiten varios valores repitiendo el parámetro (`?severidad=CRITICAL&severidad=HIGH`) | B21 | Front B (FB8) | Sí |
| `GET /api/dashboard/kpis`, `/critico-por`, `/cruce`, `/privilegios`, `/fuentes`, `/resumen-numerico` | Nuevas. `critico-por?variable=vector\|privilegios\|version\|fuente`; `cruce?fila=…&columna=…` (por defecto severidad × vector) | B22, B23, B24 | Front B (FB6, FB8) | Sí |
| `GET /api/dashboard/serie-diaria` | Acepta `agrupar=dia\|semana\|mes` y `umbral`; cada punto gana `criticos` y `proporcion_criticos`. Las semanas empiezan en lunes | B23 | Front B (FB6, FB8) | Sí (sin romper) |
| `POST /api/binomial` | Sin vector ni privilegios; gana `n_max_recomendado` y `supuestos` | B26 | Front A (FA7) | **Sí, y rompe lo actual** |
| `POST /api/reglas` | Gana `diferencia`, `razon` y `tabla` 2×2 | B27 | Front A (FA5) | Sí |

**Cómo regenerar los tipos:** con el backend corriendo en `localhost:8000`, ejecutar `npm run tipos` dentro de `frontend/`. Se actualiza `src/api/schema.d.ts`. La forma exacta de cada respuesta siempre está en `http://localhost:8000/docs`.

### Ejemplos para maquetar antes de que exista el endpoint

**Los números son ilustrativos.** `kpis` y `calidad` ya existen (iteración 2 del backend): esta es su forma real, recortada. Lo que manda es `/docs` y `src/api/schema.d.ts`. Las proporciones van entre 0 y 1; el porcentaje lo arma el frontend con `formato.ts`.

`GET /api/dashboard/kpis`
```json
{
  "N": 3559, "umbral": 9.0, "criticos": 311, "proporcion_criticos": 0.087,
  "media_puntuacion": 6.9, "mediana_puntuacion": 7.0,
  "red": 2958, "proporcion_red": 0.83, "sin_privilegios": 1960, "proporcion_sin_privilegios": 0.55,
  "kev": 4,
  "periodo": { "inicio": "2026-11-12", "fin": "2026-11-18" },
  "fecha_consulta": "2026-11-19T01:57:03Z", "origen": "api"
}
```

`GET /api/datos/calidad` (resumido)
```json
{
  "resumen": { "...": "lo mismo que GET /api/datos/resumen" },
  "pasos": [
    { "paso": "4.2", "descripcion": "Excluir Rejected", "antes": 3645, "despues": 3623,
      "eliminados": 22, "justificacion": "No son vulnerabilidades reales" },
    { "paso": "4.6", "descripcion": "Excluir sin puntuación", "antes": 3623, "despues": 3559,
      "eliminados": 64, "justificacion": "Sin CVSS no se puede clasificar" }
  ],
  "nulos": [ { "columna": "cwe", "antes": 410, "despues": 380 } ],
  "dominios": [ { "columna": "severidad", "fuera_de_dominio": 0,
      "valores": [ { "categoria": "HIGH", "conteo": 1500, "proporcion": 0.42 } ] } ],
  "atipicos": [ { "variable": "n_referencias", "q1": 2, "q3": 7, "limite_inferior": -5.5,
      "limite_superior": 14.5, "cantidad": 95, "nota": "…se marcan y no se eliminan" },
    { "variable": "cve_por_dia", "...": "igual, con el volumen diario" } ],
  "validaciones": [ { "nombre": "cve_id únicos", "cumple": true, "detalle": "0 ids repetidos en Ω" } ],
  "conciliacion": { "descargados": 3645, "eliminados": 86, "N": 3559, "cuadra": true }
}
```

`POST /api/binomial`: lo que se agrega
```json
{
  "n_max_recomendado": 177,
  "supuestos": [
    { "codigo": "n_fijo", "estado": "cumple", "texto": "El lote tiene un tamaño fijo n = 20" },
    { "codigo": "dos_resultados", "estado": "cumple", "texto": "Cada CVE es crítico o no lo es" },
    { "codigo": "p_constante", "estado": "cumple", "texto": "p = 8,7 % es igual para todo el lote" },
    { "codigo": "independencia", "estado": "cumple", "texto": "n = 20 < 0,05·N = 177" }
  ]
}
```

---

## 7. Orden de trabajo y cómo coordinarnos

### Dependencias

Orden del backend: B16 → B17 → B18 → B19 → B20 → B13 → B21…B24 → B26, B27 → B11, B12, B28.

| Tarea del frontend | Responsable | Espera a |
|---|---|---|
| FG4 (unir carpetas) | Front B | Nada: va primero |
| FG1, FG2, FB9 | Front B | FG4 |
| FG3, FG5 | Front A | FG4 |
| FA6 (Bayes), FA8 (exportar) | Front A | FG3 |
| FB7 (calidad) | Front B | **B19** |
| FB6 (inicio), FB8 (descriptivo) | Front B | **B21–B24** |
| FA7 (binomial) | Front A | FG3, FG5 y **B26** (solo el bloque 1) |
| FA5 (eventos y reglas) | Front A | FG3 y **B27** (solo la tabla 2×2 y la razón) |
| FC1 → FC4 | Los tres | Todo lo anterior |

### Qué puede hacer cada frontend sin esperar al backend

- **Front B:** FG4, FG1 (con `/datos/resumen`), FG2, FB9 (las descargas ya existen) y la maqueta de FB7 con el ejemplo de la sección 6.
- **Front A:** FG3, FG5, **FA6 completa**, FA8 y los bloques 2–4 de FA7 con la API actual.

El backend entrega primero lo que desbloquea más: **B19** (calidad, para FB7) y **B24** (kpis, para FB6 y FG1).

### Reglas de convivencia

1. **Cada quien trabaja en su rama.** La integración se hace en `snydev` y de ahí pasa a `main`.
2. **El backend avisa antes de unir un cambio que rompe la forma de la API** (los marcados «rompe» en la sección 6). El commit lleva `!`, por ejemplo `feat(api)!: …`.
3. **Después de traer cambios del backend**, regenerar los tipos (`npm run tipos`) antes de tocar las páginas.
4. **FG4 va primero** porque mueve carpetas. Hasta que se una, Front A no crea archivos nuevos en `components/`.
5. **Commits** en español con Conventional Commits: `feat(frontend): …`, `fix(api): …`, `docs: …`.
6. Si algo de este plan no se entiende o no cuadra con el código, se pregunta en el grupo y se corrige aquí mismo.

---

## 8. Entregables de la guía y quién los prepara

| Entregable | De dónde sale | Responsable |
|---|---|---|
| Dashboard funcional y capturas | Inicio y Descriptivo (FB6, FB8) y FC3 | Front B |
| Base original o enlace a la fuente | `data/demo/` (JSON crudo) y `/api/exportar/crudo` | Backend |
| Base limpia | `data/demo/` (CSV) y `/api/exportar/cve` | Backend |
| Evidencia reproducible | Notebook `nvd-electiva-3.ipynb` (falta subirlo al repositorio), `backend/nvd/` y pruebas | Backend |
| Informe de máximo 3 páginas: objetivo, fuente, metodología, indicadores, 3 hallazgos, limitaciones y conclusiones | Cifras de FB6 y FB7 | Los tres |
| Presentación de 15 minutos | FC4 | Los tres |

**Limitaciones que hay que declarar** en el informe y en la presentación:

- Es un solo periodo, de hasta 120 días, y las conclusiones valen solo para ese periodo.
- Solo se analizan los CVE con puntuación; se informa cuántos quedaron fuera.
- Desde abril de 2026, el NIST no enriquece todos los CVE.
- Conviven las versiones 3.1, 3.0 y 4.0 del CVSS.
- La relación entre eventos viene de cómo se calcula el CVSS: es una observación, no una causa.

---

## 9. Ideas en espera (no se hacen por ahora)

- **Componente predictivo:** regresión logística que clasifique «crítico» usando **solo variables que no forman parte del CVSS** (CWE, fuente, `n_referencias` y versión), para no hacer trampa.
  - Separar entrenamiento y prueba, y medir con F1.
  - Nunca presentarlo como certeza.
  - Necesita `scikit-learn`.
- Rango habitual μ ± 2σ en la binomial.
- Comparar la binomial con lotes reales y con la hipergeométrica.
- Tabla de CVE con búsqueda y paginación, que necesita un endpoint `/cve`.

---

## 10. Lista de verificación final

- [ ] La limpieza del notebook funciona con **cualquier rango de fechas**, y la conciliación cuadra.
- [ ] Hay un reporte de calidad con los pasos, su justificación, los nulos, el dominio y los atípicos.
- [ ] Se pueden descargar la base original y la limpia.
- [ ] Hay 3 preguntas, cada una con sus indicadores, gráficos y hallazgos (observación, no causa).
- [ ] El dashboard es único y tiene título, unidades, fuente, fecha de consulta y filtros globales.
- [ ] Eventos, reglas, Bayes y binomial se leen en porcentajes y frases, con el cálculo a la vista solo si se pide.
- [ ] La binomial muestra sus supuestos y la regla del 5 %.
- [ ] Hay exportación CSV y PNG, y un registro de ejecuciones.
- [ ] Hay aviso visible cuando los datos son simulados.
- [ ] Están las capturas, el informe y el guion de la presentación.
