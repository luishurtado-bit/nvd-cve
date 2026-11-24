# Plan de Edwin: backend (rama `snydev`)

Resumen de **lo mío** del [plan de trabajo v2](plan-de-trabajo-v2.md), sección 4 (tareas B11 a B28). Aquí se marca el avance; las mismas tareas se marcan también en el plan v2.

**Cómo trabajo:** 5 iteraciones grandes. Cada una cierra con `python -m pytest -q` en verde (desde `backend/`, con `.venv` activo), commits en español (Conventional Commits; `feat(api)!:` si rompe el contrato) y revisión antes de seguir.

**Línea base (antes de empezar):** 229 pruebas pasan.

## Estado

| # | Iteración | Tareas | Desbloquea | Estado |
|---|---|---|---|---|
| 1 | Datos y depuración | B16, B17, B18 | B19 | [x] hecha (`6fc6746`) |
| 2 | Calidad, bases y kpis | B19, B20, B24 | FB7, FG1, FB6 (Gaby) | [x] hecha (`f6708cf`) |
| 3 | Descriptivo | B21, B22, B23 | FB6, FB8 (Gaby) | [x] hecha (`928476f`) |
| 4 | Estadística clara | B26, B27 | FA7, FA5 (Luis) | [x] hecha (`10adc5f`) |
| 5 | Demo y cierre | B13, B11, B12, B28 | FC1 a FC4 | [x] hecha (`825b8c0`); la demo de 120 días está en `data/demo/` (falta probar `docker build`) |

## Ya existía antes del plan v2

- [x] Cliente NVD paginado, en tramos de 120 días, con reintentos (`nvd/cliente.py`, `nvd/periodos.py`).
- [x] Descarga en segundo plano con progreso (`api/descargas.py`).
- [x] Depuración simple: rechazados y sin puntuación (`nvd/depuracion.py`).
- [x] Eventos, reglas, Bayes y binomial (`api/rutas/`, `stats/`).
- [x] Dashboard básico: severidad, vector, serie diaria, histograma, CWE.
- [x] Exportación CSV y registro de ejecuciones.

## Decisiones tomadas

- **Base original:** JSON crudo comprimido (`.crudo.json.gz`), **fuera de Git**. En `data/demo/` solo van el CSV de 20 columnas y los metadatos.
- **Fuente de recarga:** el CSV de 20 columnas **sin depurar**; la base limpia se genera desde Ω (`/api/exportar/cve`).
- **Variables:** se leen directo de `cvssData` (no se parsea `vectorString`).
- **`descargados`** pasa a ser el número de filas crudas (con duplicados), para que la conciliación sea `descargados − eliminados = N`.
- **`ResumenDatos`** ya trae `duplicados` y `formato_invalido` (adelantado desde B19, con valor 0 por defecto) para que el resumen cuadre cuando la NVD repite un CVE entre páginas. `fecha_consulta` llega con B19.
- **Formato inválido:** `formato_invalido` cuenta las filas cuya puntuación no es un número entre 0 y 10; se excluyen igual que las que no tienen puntuación. Otras celdas inválidas (fechas, `n_referencias`, `kev`) quedan nulas y la fila se conserva.
- **Tipos de Ω:** `publicado` y `ultima_modificacion` en UTC, `n_referencias` entero con nulos (`Int64`) y `kev` booleano con nulos (`boolean`); un CSV antiguo sin esas columnas no inventa valores.
- **Nuevo endpoint** no previsto en el plan v2: `GET /api/dashboard/resumen-numerico` (para el resumen de `n_referencias`).
- **Un solo camino de carga:** descarga, CSV subido y arranque pasan por `estado.cargar(ruta)`, que relee el CSV guardado. Así lo recién descargado se depura exactamente igual que lo recargado.
- **`fecha_consulta`:** es el momento en que se guardó la descarga. `null` con datos simulados o subidos por CSV (no se sabe cuándo se consultó la NVD). Los metadatos anteriores, sin ese campo, usan `guardado`.
- **`/exportar/crudo`:** de una descarga, el `.crudo.json.gz` (misma forma que la respuesta de la NVD); de un CSV subido, ese CSV; de una descarga anterior a esta iteración, el CSV sin depurar; de los simulados, su versión sin depurar (1300 filas).
- **Simulados en la calidad:** `mocks.crudo()` = Ω + 50 *Rejected* + 250 sin puntuación, y pasa por el mismo `depurar()`. Cuadra con `mocks.resumen()`.
- **Registro:** quedan registradas las exportaciones (`exportar_cve`, `exportar_crudo`, `exportar_calidad`); `GET /datos/calidad` y `/dashboard/kpis` son consultas de pantalla y no se registran.
- **Filtros:** `severidad`, `vector` y `privilegios` aceptan varios valores (parámetro repetido); fechas incluidas en los dos extremos; `hasta < desde` → 422. Se leen con un `Depends` (`leer_filtros`) y se aplican con `fuente.filtrar`, igual en todas las rutas.
- **Agrupaciones:** las filas sin dato no entran en los grupos; `critico-por` informa cuántas son (`sin_dato`). `cruce` admite otras variables además de severidad × vector. La serie conserva el nombre `serie-diaria` para no romper al frontend, aunque ya agrupa por semana o mes.
- **Demo:** al arrancar, `estado.cargar_ultimo()` busca en `data/` y, si no hay nada (o no se puede leer), en `data/demo/` (`config.dir_demo()` = `dir_datos()/demo`, así las pruebas lo aíslan con `DIR_DATOS`). En `data/demo/` van solo el CSV y el JSON de metadatos; el `.crudo.json.gz` queda fuera de Git. Si hay varios CSV en esa carpeta se carga el más reciente: el README dice que hay que borrar los anteriores.
- **Frontend servido por el backend:** `FrontendEstatico` devuelve `index.html` para rutas sin extensión (el front usa `BrowserRouter`) y deja 404 las de `/api/` y los archivos que no existen. Las pruebas encontraron un error solo de Windows: allí `StaticFiles` entrega la ruta con `\` y el guardia de `/api/` no la reconocía.
- **Docker:** no hay Docker en esta máquina, así que el `Dockerfile` **no está probado**. Sí se probó: `npm run build`, y el servidor real en una carpeta con la misma disposición que la imagen (`/app/backend`, `/app/frontend/dist`, `/app/data/demo`, sin `.env`).
- **Documentación vigilada por pruebas:** `test_endpoints.py` (un caso por ruta + tabla endpoint → pruebas) y `test_documentacion.py` (contrato, diccionario y enlaces).
- **Binomial:** `BinomialIn` rechaza campos de más (`extra="forbid"`): con el contrato anterior (`criterios`) ahora responde 422. Se prefirió eso a ignorarlo, porque ignorarlo habría descartado en silencio el umbral que escribe el usuario.
- **`n_max_recomendado`:** el mayor n con n < 0,05·N, calculado con enteros (`(N − 1) // 20`). El plan v2 decía ⌊0,05·N⌋, que con N = 1000 daba 50 aunque n = 50 ya dispara el aviso; así el aviso, el límite y el supuesto de independencia siempre coinciden. El aviso `n_grande_frente_a_N` también pasó a enteros.
- **Supuestos:** `n_fijo` y `dos_resultados` siempre cumplen (son por construcción). `p_constante` avisa si p sale de menos de 30 CVE; con p a mano cumple y lo dice en el texto. `independencia` avisa si n > `n_max_recomendado`. Las `advertencias` de antes siguen igual.
- **Reglas:** la `razon` es `null` si P(X)·P(Y) = 0. La `nota` de B y C dejó de ser `null`: dice que son dos métricas distintas del CVSS y que su relación es lo observado, para no sugerir una dependencia de fórmula que no existe.
- **Frontend:** al regenerar los tipos, `Binomial.tsx` dejó de compilar (usaba `criterios`). Cambié una línea de esa página (`umbral: valorUmbral`) para mantener `tsc -b` en verde; sus campos de vector y privilegios siguen ahí, sin efecto, hasta que Luis haga FA7.
- **KPIs:** proporciones entre 0 y 1 (`proporcion_*`), con su conteo al lado; salen de `contar_eventos`, así que coinciden con A, B y C de `/api/eventos`.

## Iteración 1: datos y depuración (B16 + B17 + B18)

Objetivo: que cualquier rango de fechas produzca las 20 variables y la limpieza del notebook con su conciliación.

- [x] **B16** Extraer las 20 variables (`nvd/extraccion.py`, `tests/test_extraccion.py`, `tests/ejemplos_nvd.py`).
  - [x] `complejidad_ataque`, `interaccion_usuario` (en v4.0, P y A pasan a R).
  - [x] `impacto_confidencialidad`, `impacto_integridad`, `impacto_disponibilidad` (v4.0: VC, VI, VA).
  - [x] `puntaje_explotabilidad`, `puntaje_impacto`.
  - [x] `fuente`, `n_referencias`, `kev`, `ultima_modificacion`.
  - [x] Una prueba por columna con un CVE v3.1 y otro v4.0.
- [x] **B17** Depuración por pasos (`nvd/depuracion.py`, `tests/test_depuracion.py`).
  - [x] 4.1 inventario de nulos · 4.2 *Rejected* · 4.3 duplicados (queda la `ultima_modificacion` más reciente) · 4.4 tipos y errores de formato · 4.5 texto y dominio · 4.6 nulos · 4.7 validaciones y conciliación.
  - [x] `ConteoDepuracion` gana `duplicados` y `formato_invalido`.
  - [x] Llamadores actualizados (`api/estado.py`, `nvd/descargar.py`).
- [x] **B18** Atípicos con IQR, sin eliminarlos (`stats/descriptiva.py`, `tests/test_descriptiva.py`).
- [x] Simulados con 20 columnas (`api/mocks.py`) y CSV subido con las nuevas columnas opcionales (`nvd/almacen.py`).
- [x] `serie_diaria` acepta fechas ya convertidas a UTC.
- [x] `pytest` en verde.

Hecho: 2026-11-23 · sin commit todavía (pendiente de tu revisión) · 268 pruebas pasan

## Iteración 2: calidad, bases y kpis (B19 + B20 + B24)

Objetivo: desbloquear a Gaby (FB7, FG1, FB6).

- [x] **B19** Reporte de calidad y bases para entregar (`tests/test_api_calidad.py`).
  - [x] `almacen.guardar()` escribe también `nombre.crudo.json.gz` y `fecha_consulta` en los metadatos.
  - [x] `ResumenDatos` gana `duplicados`, `formato_invalido` y `fecha_consulta`.
  - [x] `GET /api/datos/calidad` (datos reales y simulados): resumen, pasos, nulos, dominios, atípicos, validaciones y conciliación.
  - [x] `GET /api/exportar/crudo` y `GET /api/exportar/calidad`.
  - [x] `GET /api/exportar/cve` con 20 columnas más `critico` (`?umbral=`, por defecto 9).
  - [x] Las exportaciones quedan en el registro de ejecuciones.
- [x] **B20** Consulta por rango de fechas: prueba con 250 días (3 tramos) y un solo camino de guardado (`almacen.guardar_descarga` → `estado.cargar`).
  - [x] Corregido: un periodo sin CVE guardaba un CSV vacío que luego no se podía recargar.
- [x] **B24** `GET /api/dashboard/kpis?umbral=` (adelantado: lo piden FB6 y FG1).
- [x] Tipos regenerados (`frontend/src/api/schema.d.ts`, `tsc -b` sin errores). Falta avisar a Gaby.
- [x] `pytest` en verde.
- [x] Riesgo 1 medido: 60 000 CVE sintéticos → guardar 3,0 s (gzip nivel 6; con el 9 eran 8,6 s), cargar y depurar 2,0 s, pico de memoria 63 MB. No hace falta escribir por tramos.

Hecho: 2026-11-23 · sin commit todavía (pendiente de tu revisión) · 292 pruebas pasan

## Iteración 3: descriptivo (B21 + B22 + B23)

- [x] **B21** Filtros globales (`desde`, `hasta`, `severidad`, `vector`, `privilegios`) con `filtrar(df, filtros)` en todos los `GET /api/dashboard/*`, incluido `kpis` (gana `N_sin_filtro`).
- [x] **B22** Resumen numérico ampliado (mínimo, Q1, Q3, máximo, asimetría) y `GET /api/dashboard/resumen-numerico` (`base_score` y `n_referencias`).
- [x] **B23** Agrupaciones para P2 y P3 (`stats/descriptiva.py`: `serie_temporal`, `critico_por`, `tabla_cruzada`).
  - [x] `GET /api/dashboard/critico-por?variable=vector|privilegios|version|fuente&umbral=&top=`
  - [x] `GET /api/dashboard/cruce?fila=&columna=` (por defecto severidad × vector; % por fila)
  - [x] `GET /api/dashboard/serie-diaria?agrupar=dia|semana|mes&umbral=` (con críticos y proporción de críticos)
  - [x] `GET /api/dashboard/privilegios` y `GET /api/dashboard/fuentes?top=`
- [x] Prueba: con el mismo filtro, los 11 endpoints dan el mismo total (`tests/test_api_descriptivo.py`).
- [x] Tipos regenerados (`tsc -b` sin errores). Falta avisar a Gaby.
- [x] `pytest` en verde.

Hecho: 2026-11-23 · sin commit todavía (pendiente de tu revisión) · 321 pruebas pasan

## Iteración 4: estadística clara (B26 + B27)

- [x] **B26** Binomial más clara. ⚠ Rompe la API: commit `feat(api)!:` y avisar a Luis antes de unir.
  - [x] `BinomialIn` y `BinomialQuery` solo con `umbral` (`criterios` ya no existe; un campo de más → 422).
  - [x] `umbral`, `n_max_recomendado` y `supuestos` en la salida (n fijo, dos resultados, p constante, independencia).
  - [x] El límite del 5 % con enteros: el aviso, `n_max_recomendado` y el supuesto coinciden.
  - [x] Exportar binomial con `umbral`.
- [x] **B27** Reglas más explicables.
  - [x] `diferencia` y `razon` (`null` si un evento es imposible).
  - [x] `N` y tabla 2×2 con los 4 conteos (suman N); aplanada en el CSV de `/exportar/reglas`.
  - [x] `nota` según los eventos elegidos (también para B y C).
- [x] Tipos regenerados; `Binomial.tsx` ajustado en una línea para que `tsc -b` pase. Falta avisar a Luis **antes de unir**.
- [x] `pytest` en verde.

Hecho: 2026-11-23 · sin commit todavía (pendiente de tu revisión) · 365 pruebas pasan

## Iteración 5: demo y cierre (B13 + B11 + B12 + B28)

- [x] **B13** Conjunto para la demo.
  - [x] Descarga y copia a `data/demo/` (CSV y metadatos). Quedó el periodo definitivo de **120 días** (26 jul–22 nov de 2026, consultado el 24 nov): 60 145 descargados, N = 55 399.
  - [x] Reemplazado el mes de prueba (23 oct–22 nov, N = 15 922) por el periodo de 120 días.
  - [x] Excepción en `.gitignore` y carga de `data/demo/` al arrancar si no hay otro (`tests/test_arranque.py`).
  - [x] Pruebas del flujo completo con datos sintéticos (`tests/test_flujo.py`: un caso por paso 4.1 a 4.7 + conciliación + reinicio) y una prueba de que la demo del repositorio carga y cuadra.
  - [x] Comprobación cruzada con el notebook (12–18 nov): descargados, rechazados y duplicados coinciden exactamente; los sin puntuación difieren por la fecha de consulta (ver plan v2, B13).
- [x] **B11** Una prueba por endpoint (`tests/test_endpoints.py`): 30 rutas, tabla endpoint → pruebas, y falla si una ruta no tiene caso.
- [x] **B12** `Dockerfile`, `.dockerignore` y `frontend_dist` → `frontend/dist` en `backend/api/main.py`, con la recarga de rutas del frontend.
  - [ ] **`docker build` y `docker run` sin probar** (no hay Docker en esta máquina).
- [x] **B28** `README.md`, `docs/diccionario-de-datos.md` y `docs/contrato-api.md`, con pruebas que las mantienen al día (`tests/test_documentacion.py`).
- [x] `pytest` en verde (516 pruebas). `npm run build` del frontend en verde.

Hecho: 2026-11-23 · sin commit todavía (pendiente de tu revisión) · 516 pruebas pasan

## Riesgos

1. ~~**Memoria al descargar 120 días**~~ Resuelto en la iteración 2: con 60 000 CVE el pico fue de 63 MB.
2. **Tiempo de descarga:** sin clave son 6 s por solicitud (unos 3 o 4 minutos para 120 días). Las pruebas nunca tocan la red.
3. **Cambios que rompen la API:** el significado de `descargados` (iteración 1) y la binomial (iteración 4). Falta avisar a Luis y a Gaby antes de unir.
4. **`docker build` sin probar:** no hay Docker en la máquina del backend. Lo más probable que falle: la versión de Python de la imagen (`python:3.14-slim`; se cambia con `--build-arg PYTHON_VERSION=3.13`) o `npm ci` si el `package-lock.json` no coincide con la plataforma. Probarlo en una máquina con Docker antes de la sustentación; el plan B es `npm run build` + `uvicorn` (README).
5. ~~**La demo tiene un mes, no 120 días**~~ Resuelto: `data/demo/` tiene el periodo definitivo de 120 días y las cifras del informe salen de ese conjunto.

## Registro

| Fecha | Iteración | Commit | Pruebas |
|---|---|---|---|
| 2026-11-23 | Línea base | 20dc49a | 229 pasan |
| 2026-11-23 | 1 · Datos y depuración | 6fc6746 | 268 pasan |
| 2026-11-23 | 2 · Calidad, bases y kpis | f6708cf | 292 pasan |
| 2026-11-23 | 3 · Descriptivo | 928476f | 321 pasan |
| 2026-11-23 | 4 · Estadística clara | 10adc5f | 365 pasan |
| 2026-11-23 | 5 · Demo y cierre | 825b8c0 | 516 pasan |
