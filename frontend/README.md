# Frontend

Aplicación React + TypeScript + Vite del proyecto NVD/CVE. Consume la API del backend (FastAPI) y muestra el dashboard, la calidad de los datos y las páginas de estadística. Cómo instalar y levantar todo está en el [README de la raíz](../README.md); aquí solo lo propio del frontend.

**Pila:** React 19, Vite 8, TypeScript (`strict`), Tailwind v4, shadcn/ui sobre Base UI, Recharts 3, react-router-dom 7, sonner y lucide-react. El lint es oxlint.

## Comandos (desde `frontend/`)

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo en <http://localhost:5173>; reenvía `/api` al backend en el puerto 8000, que debe estar levantado |
| `npx tsc -b` | Revisión de tipos |
| `npm run lint` | oxlint (hay 4 avisos anteriores, ninguno en el código nuevo) |
| `npm run build` | Revisa los tipos y genera `dist/`, que el backend sirve en la raíz si existe |
| `npm run tipos` | Regenera `src/api/schema.d.ts` desde el esquema OpenAPI (con el backend levantado). Se hace cada vez que cambia el contrato de la API |

No hay framework de pruebas. Cada cambio se verifica con `tsc`, `lint` y `build`, y mirando la página en el navegador, en tema claro y oscuro, con datos simulados y con la demo.

## Rutas

| Ruta | Archivo | Contenido |
|---|---|---|
| `/` | `paginas/Inicio.tsx` | Dashboard único: indicadores, hallazgos, gráficos y limitaciones |
| `/datos` | `paginas/Datos.tsx` | Pestañas «Cargar datos» y «Calidad de los datos» (`?pestana=calidad`) |
| `/descriptivo` | `paginas/Descriptivo.tsx` | Descriptivo con filtros globales |
| `/eventos`, `/reglas`, `/bayes`, `/binomial` | `paginas/*.tsx` | Estadística (pendiente de rediseño: ver [../docs/pendientes-front-a.md](../docs/pendientes-front-a.md)) |

Cualquier otra ruta redirige a `/`.

## Estructura de `src/`

```
api/         cliente de la API (cliente.ts), query string (consulta.ts), alias de tipos (tipos.ts)
             y schema.d.ts (generado: no se edita a mano)
contexto/    estado compartido: el conjunto cargado (useDatos) y los filtros del descriptivo (useFiltros)
hooks/       use-consulta (consultas con cancelación), use-descarga (progreso de la descarga), use-tema…
lib/         formato (es-CO), dominio (vectores, privilegios, umbral), glosario, preguntas P1–P4,
             hallazgos, paleta de colores, csv, diccionario de las 20 variables
utils/       exportarPng (PNG con título, leyenda y fuente)
components/  ui/ (shadcn), layout/, comunes/, graficos/, inicio/, descriptivo/, datos/, calidad/
paginas/     una por ruta
```

## Cómo está pensado

- **Una sola fuente de verdad para el conjunto cargado.** `DatosProvider` guarda el resumen y un número de `version` que sube cuando se carga o termina una descarga. Las consultas lo ponen en sus dependencias y se refrescan solas.
- **Consultas con `useConsulta`.** Cancela la petición anterior, espera un poco antes de consultar si se le pide y conserva los datos mientras recarga, así los filtros no se desmontan.
- **Los filtros viajan al backend.** El descriptivo no filtra en el navegador: envía fechas, severidad, vector y privilegios, y cada tarjeta hace su propia consulta (un error afecta a un solo gráfico).
- **Formato.** Toda cifra pasa por `lib/formato.ts` (coma decimal, porcentaje con espacio duro, fracción «8,7 % (311 de 3.559)»). Los decimales largos solo aparecen dentro de «Ver cálculo».
- **Sin cifras fijas en los textos.** Los hallazgos, las limitaciones y las frases salen de la respuesta de la API.
- **Gráficos exportables.** Cada tarjeta de gráfico guarda el PNG (con el tema activo; para el informe conviene exportar en claro) y el CSV de sus datos.
- **Accesibilidad.** Pestañas con flechas, controles con nombre, gráficos con descripción en texto y «Ver tabla de datos», resultados en regiones `aria-live` y colores que cumplen el contraste en claro y oscuro.
