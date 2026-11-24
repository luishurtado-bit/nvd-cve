# Pendientes del Front A (para Luis)

Este documento dice qué falta de las páginas de estadística y con qué piezas ya hechas se puede construir. El detalle de cada tarea (qué mostrar, «listo cuando») está en [plan-de-trabajo-v2.md](../plan-de-trabajo-v2.md), sección 5.3. Las rutas y los campos de la API están en [contrato-api.md](contrato-api.md).

Estado al 2026-11-24: el backend y el Front B (Inicio, Datos y calidad, Descriptivo) están terminados en la rama `snydev`. Las cuatro páginas de estadística **siguen como estaban** y no se rediseñaron.

## Lo que hay que hacer

| Tarea | Página | Qué falta, en una línea |
|---|---|---|
| **FA7** | `/binomial` (`paginas/Binomial.tsx`) | Rediseño en cuatro bloques: modelo con sus supuestos, pregunta con una respuesta grande, qué esperar (E(X) y σ) y n mínimo. Es la pregunta principal del proyecto: **empieza por aquí**. |
| **FA5** | `/eventos` (une `Eventos.tsx` y `Reglas.tsx`) | Frase del experimento, tarjetas A/B/C con fracción, tabla 2×2 real, reglas como frases e independencia con la `razon`. |
| **FA6** | `/bayes` (`paginas/Bayes.tsx`) | Solo el campo del evento elegido, prior con control deslizante, árbol de probabilidad en frecuencias y paso a paso. |
| **FA8** | las cuatro | Botones de exportar CSV (`/api/exportar/*`) y PNG de la pmf. |
| **FG5** | `components/graficos/GraficoPmf.tsx` | Modo oscuro, títulos de eje, unidades, leyenda y PNG. |
| Menú | `components/layout/Layout.tsx` | Cuando `Reglas` se una a `Eventos`: borrar `Reglas.tsx`, quitar su ítem del menú y redirigir `/reglas` a `/eventos` en `App.tsx`. |
| Cálculo automático | las cuatro | Quitar el botón «Calcular» y consultar solo, con espera de 300 ms (`useConsulta` ya lo hace con `retardo`). |

Tres cosas que no se hicieron y que conviene saber antes de empezar:

- **Las cuatro páginas siguen con botón «Calcular»**, `toFixed(4)` y los resultados sin formato. Ninguna usa todavía `formato.ts`, `VerCalculo` ni `Ayuda`.
- **La binomial cambió en el backend** (`criterios` pasó a `umbral`; la respuesta trae `umbral`, `n_max_recomendado` y `supuestos`). Edwin solo hizo **una línea de ajuste en `Binomial.tsx`** para que compile y envíe `umbral`. Es probable que la página todavía muestre campos que la API ya no usa (vector y privilegios): se eliminan en FA7.
- **`/api/reglas` ahora devuelve** `N`, la `tabla` 2×2, `diferencia` y `razon`, y la `nota` de B y C ya no es `null`. La página actual los ignora. Los tipos están al día en `src/api/schema.d.ts`.

## Lo que ya está hecho y se puede reutilizar

Todo está en `frontend/src/`. No hace falta copiar nada: se importa con `@/`.

**Formato (`lib/formato.ts`)**: usarlo para **toda** cifra que se vea. Nunca mostrar `0.0874`.

| Función | Ejemplo | Resultado |
|---|---|---|
| `numero(55399)` | miles con punto | «55.399» |
| `porcentaje(0.0874)` | coma decimal y espacio duro | «8,7 %» |
| `fraccion(311, 3559)` | porcentaje con la fracción | «8,7 % (311 de 3.559)» |
| `decimal4(x)` | solo dentro de «Ver cálculo» | «0,0874» |
| `fechaCorta`, `periodo`, … | fechas sin desfase de un día | «26 jul 2026» |

Un `null` se muestra como «—», no como «NaN %».

**Componentes**

- `components/comunes/VerCalculo.tsx`: desplegable «Ver cálculo». Recibe `pasos: { formula, sustituida?, resultado }[]`. Es donde van las fórmulas y los decimales largos.
- `components/comunes/Ayuda.tsx`: icono con tooltip. `<Ayuda termino="critico" />`; los términos están en `lib/glosario.ts` (se agregan allí).
- `components/comunes/TarjetaKpi.tsx`: una cifra grande con etiqueta y detalle (`valor` ya formateado; `null` = «—»). Sirve para las tarjetas A/B/C y para E(X) y σ.
- `components/comunes/TarjetaGrafica.tsx`: tarjeta de gráfico con título, pregunta, descripción para lectores de pantalla, «Ver tabla de datos», CSV y PNG, y estados de carga, error y vacío.
- `components/comunes/Leyenda.tsx`, `Cargando.tsx`, `MensajeError.tsx`, `Pestanas.tsx`.
- `components/graficos/GraficoBarras.tsx` (vertical y horizontal, con títulos de eje), `GraficoSerie.tsx`, `GraficoApilado.tsx`, `CajaTooltip.tsx`. Ninguno es la pmf, pero `GraficoBarras` es un buen punto de partida para el FG5.
- `utils/exportarPng.ts`: `descargarPng(contenedor, nombre, { titulo, subtitulo, leyenda, fuente, fondo, texto })` compone un PNG con título, leyenda y fuente (la leyenda de Recharts queda fuera del `<svg>`, por eso la leyenda es propia).
- `lib/csv.ts`: `descargarCsv(nombre, columnas, filas)` con BOM, para que Excel abra las tildes.
- `lib/paleta.ts`: `usePaleta()` da los colores en HEX según el tema (el PNG necesita colores literales, no variables CSS).

**Datos y estado**

- `hooks/use-consulta.ts`: `useConsulta(fn, deps, { activo, retardo })` devuelve `{ datos, cargando, error, recargar }`. Cancela la petición anterior, **conserva `datos` mientras recarga** y espera `retardo` ms antes de consultar. Úsalo con `activo: false` mientras el formulario no sea válido.
- `contexto/datos.ts`: `useDatos()` da `{ resumen, version, … }`. Pon `version` en los `deps` para que la página se refresque cuando se cargan otros datos. `resumen` trae `N`, el periodo, el origen y la fecha de consulta (para frases como «Se elige al azar un CVE de los N publicados entre …»).
- `api/cliente.ts`: `api.eventos`, `api.reglas`, `api.bayes`, `api.binomial` aceptan un `signal` opcional. `urlExportar('eventos' | 'reglas' | 'bayes' | 'binomial', params)` da el enlace para un `<a download>`.
- `lib/dominio.ts`: `VECTORES`, `PRIVILEGIOS`, `SEVERIDADES` con su etiqueta en español, `etiquetaDe`, `leerUmbral` y `mensajeDe(error)`. Ya reemplazaron las listas y `mensajeDe` que estaban repetidas en las cuatro páginas.
- `lib/preguntas.ts` y `lib/glosario.ts`: textos comunes; sin cifras (todo número sale de la respuesta de la API).

El `Layout` ya monta la **barra de contexto** (origen, periodo, N y fecha) y el **pie con la fuente** en todas las páginas, incluidas las tuyas.

## Cómo conviene trabajar cada página

Las reglas del plan (sección 5.3) son: la pregunta en palabras arriba, la respuesta en frase y en grande, y el cálculo dentro de «Ver cálculo». Con las piezas de arriba, el esqueleto de una página queda así:

```tsx
const { resumen, version } = useDatos()
const { datos, cargando, error } = useConsulta(
  (signal) => api.binomial({ n, k, umbral }, signal),
  [n, k, umbral, version],
  { activo: entradaValida, retardo: 300 },
)
// ... <TarjetaKpi valor={porcentaje(datos?.prob_igual)} /> y <VerCalculo pasos={[...]} />
```

Cosas que pasaron en el Front B y conviene no repetir:

- **Dos cambios seguidos sobre el mismo estado se pisan** si cada uno copia el estado viejo: usa la forma funcional `setX((anterior) => …)`.
- **No leas el reloj (`Date.now()`) durante el render**: lo marca el lint. Si hace falta, `useState(() => …)`.
- **Un `useEffect` que solo copia datos a un estado** suele sobrar: calcula el valor en el render.
- Para probar el diseño sin esperar al backend, el plan v2 (sección 6) trae ejemplos de respuesta.

## Cómo verificar

Desde `frontend/`: `npx tsc -b`, `npm run lint` y `npm run build` tienen que quedar en verde (hay 4 avisos de lint anteriores que no son de las páginas nuevas). Después, con el backend (`uvicorn api.main:app` en `backend/`) y `npm run dev`:

- Consola del navegador sin errores y las peticiones esperadas en la pestaña Red.
- Tema claro y oscuro (ejes, rejilla y tooltips de los gráficos).
- Con datos simulados (sin `data/`) y con la demo.
- Casos límite: N = 0, P(E) = 0, n grande y un backend caído.
- Que ningún número salga con 4 decimales fuera de «Ver cálculo».

## Coordinación

- **`Layout.tsx` y `App.tsx`** los tocó Edwin para el menú y las rutas del Front B. Si necesitas cambiarlos (por ejemplo, quitar «Reglas»), avísale o haz el cambio en un commit aparte.
- No hay framework de pruebas: la verificación es `tsc`, `oxlint`, `build` y mirar la página.
- El guion de la presentación (FC4) y las capturas (FC3) necesitan las cuatro páginas terminadas: el apartado «Modelo (Binomial)» sale de FA7.
