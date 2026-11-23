# Plan de Edwin: backend (rama `snydev`)

Resumen de **lo mío** del [plan de trabajo v2](plan-de-trabajo-v2.md), sección 4 (tareas B11 a B28). Aquí se marca el avance; las mismas tareas se marcan también en el plan v2.

**Cómo trabajo:** 5 iteraciones grandes. Cada una cierra con `python -m pytest -q` en verde (desde `backend/`, con `.venv` activo), commits en español (Conventional Commits; `feat(api)!:` si rompe el contrato) y revisión antes de seguir.

**Línea base (antes de empezar):** 229 pruebas pasan.

## Estado

| # | Iteración | Tareas | Desbloquea | Estado |
|---|---|---|---|---|
| 1 | Datos y depuración | B16, B17, B18 | B19 | [x] hecha, pendiente de commit |
| 2 | Calidad, bases y kpis | B19, B20, B24 | FB7, FG1, FB6 (Gaby) | [ ] |
| 3 | Descriptivo | B21, B22, B23 | FB6, FB8 (Gaby) | [ ] |
| 4 | Estadística clara | B26, B27 | FA7, FA5 (Luis) | [ ] |
| 5 | Demo y cierre | B13, B11, B12, B28 | FC1 a FC4 | [ ] |

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

- [ ] **B19** Reporte de calidad y bases para entregar.
  - [ ] `almacen.guardar()` escribe también `nombre.crudo.json.gz` y `fecha_consulta` en los metadatos.
  - [ ] `ResumenDatos` gana `duplicados`, `formato_invalido` y `fecha_consulta`.
  - [ ] `GET /api/datos/calidad` (datos reales y simulados).
  - [ ] `GET /api/exportar/crudo` y `GET /api/exportar/calidad`.
  - [ ] `GET /api/exportar/cve` con 20 columnas más `critico`.
  - [ ] Cada llamada queda en el registro de ejecuciones.
- [ ] **B20** Consulta por rango de fechas: prueba con ~250 días (3 tramos) y un solo camino de guardado (`almacen.guardar_descarga`).
- [ ] **B24** `GET /api/dashboard/kpis` (adelantado: lo piden FB6 y FG1).
- [ ] Avisar a Gaby y regenerar tipos (`npm run tipos`).
- [ ] `pytest` en verde.

Hecho: —

## Iteración 3: descriptivo (B21 + B22 + B23)

- [ ] **B21** Filtros globales (`desde`, `hasta`, `severidad`, `vector`, `privilegios`) con `filtrar(df, filtros)` en todos los `GET /api/dashboard/*`.
- [ ] **B22** Resumen numérico ampliado (mínimo, Q1, Q3, máximo, asimetría) y `GET /api/dashboard/resumen-numerico`.
- [ ] **B23** Agrupaciones para P2 y P3.
  - [ ] `GET /api/dashboard/critico-por`
  - [ ] `GET /api/dashboard/cruce`
  - [ ] `GET /api/dashboard/serie-diaria?agrupar=dia|semana|mes` (con críticos y % de críticos)
  - [ ] `GET /api/dashboard/privilegios` y `GET /api/dashboard/fuentes`
- [ ] Prueba: dos endpoints con el mismo filtro dan el mismo total.
- [ ] Avisar a Gaby y regenerar tipos.
- [ ] `pytest` en verde.

Hecho: —

## Iteración 4: estadística clara (B26 + B27)

- [ ] **B26** Binomial más clara. ⚠ Rompe la API: commit `feat(api)!:` y avisar a Luis antes de unir.
  - [ ] `BinomialIn` y `BinomialQuery` solo con `umbral`.
  - [ ] `n_max_recomendado` y `supuestos` (n fijo, dos resultados, p constante, independencia).
- [ ] **B27** Reglas más explicables.
  - [ ] `diferencia` y `razon`.
  - [ ] Tabla 2×2 con los 4 conteos (suman N).
  - [ ] `nota` según los eventos elegidos.
- [ ] Regenerar tipos.
- [ ] `pytest` en verde.

Hecho: —

## Iteración 5: demo y cierre (B13 + B11 + B12 + B28)

- [ ] **B13** Conjunto para la demo.
  - [ ] Descarga de 120 días (la corro yo con mi clave NVD) y copia a `data/demo/` (CSV y metadatos).
  - [ ] Excepción en `.gitignore` y carga de `data/demo/` al arrancar si no hay otro.
  - [ ] Pruebas del flujo completo con datos sintéticos (un caso por paso + conciliación).
  - [ ] Opcional: pasar el JSON crudo del notebook por el backend y comparar conteos.
- [ ] **B11** Una prueba por endpoint (tabla endpoint → prueba).
- [ ] **B12** `Dockerfile`, `.dockerignore` y corregir `frontend_dist` → `frontend/dist` en `backend/api/main.py`.
- [ ] **B28** `README.md`, diccionario de las 20 variables y tabla del contrato.
- [ ] `pytest` en verde y `docker run` probado.

Hecho: —

## Riesgos

1. **Memoria al descargar 120 días:** unos 60 000 objetos `cve`. Se mide en la iteración 2; si molesta, se escribe el `.gz` por tramos.
2. **Tiempo de descarga:** sin clave son al menos 6 s por solicitud (unos 3 minutos para 120 días). Las pruebas nunca tocan la red.
3. **Cambios que rompen la API:** el significado de `descargados` (iteración 1) y la binomial (iteración 4). Se avisa a los dos frontends.
4. **Orden:** B26 y B27 no dependen de nada; se pueden adelantar si Luis queda bloqueado.

## Registro

| Fecha | Iteración | Commit | Pruebas |
|---|---|---|---|
| 2026-11-23 | Línea base | 20dc49a | 229 pasan |
| 2026-11-23 | 1 · Datos y depuración | (sin commit) | 268 pasan |
