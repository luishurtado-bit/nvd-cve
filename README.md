# NVD-CVE

Proyecto de análisis estadístico de vulnerabilidades CVE mediante Python, FastAPI y React.

A partir de los datos de la National Vulnerability Database (NVD) del NIST, el software descarga los CVE de un rango de fechas (hasta 120 días por consulta), los limpia con los pasos del notebook, los describe en un dashboard y calcula probabilidades de eventos, reglas de probabilidad, la actualización por el teorema de Bayes y el modelo binomial del número de CVE críticos en un lote.

| Documento | Para qué |
|---|---|
| [plan-de-trabajo-v2.md](plan-de-trabajo-v2.md) | Plan vigente: reparto del trabajo (backend y frontend), tareas y entregables |
| [plan-de-trabajo-software.md](plan-de-trabajo-software.md) | Plan anterior (fases 1 a 3), como historial |
| [docs/contrato-api.md](docs/contrato-api.md) | Qué hace cada ruta de la API y qué parámetros acepta |
| [docs/diccionario-de-datos.md](docs/diccionario-de-datos.md) | Las 20 variables, los pasos de la limpieza y los archivos de `data/` |
| `nvd-electiva-3.ipynb` | Notebook de la descarga y la limpieza (evidencia reproducible para Electiva III) |

## Estructura

```
nvd-cve/
├── backend/           API en FastAPI
│   ├── api/           rutas, esquemas (Pydantic) y datos simulados
│   ├── stats/         estadística pura: eventos, probabilidad, Bayes, binomial, descriptiva
│   ├── nvd/           descarga de la NVD: cliente, extracción, depuración y almacenamiento
│   ├── tests/         pruebas con pytest
│   └── requirements.txt
├── frontend/          React + TypeScript + Vite
│   └── src/api/schema.d.ts   tipos generados desde la API (no se editan a mano)
├── data/              CVE descargados (no se suben al repositorio)
│   └── demo/          conjunto de la demo: el CSV y sus metadatos sí se suben
├── docs/              contrato de la API y diccionario de datos
├── Dockerfile         imagen única: API + frontend compilado
└── .env.example       plantilla de variables de entorno
```

## Requisitos

- **Python 3.12 o superior**
- **Node.js 20.19+ o 22.12+** y npm (lo pide Vite 8).
- Git.

Comprobar las versiones:

```bash
python --version
node --version
npm --version
```

## Instalación (la primera vez, después de clonar)

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd nvd-cve
```

### 2. Backend: entorno virtual y dependencias

El entorno virtual se crea **dentro de `backend/`** con el nombre `.venv` (ya está en el `.gitignore`).

**Windows (PowerShell):**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

> Si PowerShell no deja activar el entorno («la ejecución de scripts está deshabilitada»), ejecutar una sola vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y volver a intentar.
> En Git Bash se activa con `source .venv/Scripts/activate`.

**macOS / Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Comprobar que todo quedó bien corriendo las pruebas (desde `backend/`, con el entorno activado):

```bash
python -m pytest -q
```

### 3. Frontend: dependencias

En otra terminal, desde la raíz del repositorio:

```bash
cd frontend
npm install
```

### 4. Variables de entorno

Copiar la plantilla y poner la clave de la API de la NVD (se pide gratis en <https://nvd.nist.gov/developers/request-an-api-key>):

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# macOS / Linux / Git Bash
cp .env.example .env
```

```dotenv
NVD_API_KEY=pega_aqui_tu_clave
```

El archivo `.env` **nunca** se sube al repositorio, y la clave **nunca** se escribe en el código.

La clave no es obligatoria: sin ella la descarga funciona igual, pero más lenta (la NVD permite 5 solicitudes cada 30 s sin clave y 50 con clave).

## Levantar el proyecto (uso diario)

Se usan **dos terminales**.

**Terminal 1: backend** (desde `backend/`, con el entorno activado):

```bash
uvicorn api.main:app --reload
```

- API: <http://localhost:8000/api/salud>
- Documentación interactiva (Swagger): <http://localhost:8000/docs>

**Terminal 2: frontend** (desde `frontend/`):

```bash
npm run dev
```

- Aplicación: <http://localhost:5173>

Vite reenvía todas las peticiones que empiezan por `/api` al backend en el puerto 8000 (ver `frontend/vite.config.ts`), así que el frontend llama a rutas relativas como `fetch('/api/salud')`. **El backend tiene que estar levantado** para que el frontend reciba datos.

## Datos de la NVD

El periodo lo elige quien usa la aplicación: cualquier rango de fechas. El de estudio previsto es de **120 días**, el máximo que la NVD acepta por consulta; uno mayor se parte en tramos. Mientras no se cargue ningún periodo, la API responde con los **datos simulados** del informe (N = 1000) y `/api/datos/resumen` indica `"origen": "simulado"`. Hay tres formas de cargar datos reales:

1. **Script de descarga** (recomendado), desde `backend/` con el entorno activado:

   ```bash
   python -m nvd.descargar 2026-07-26 2026-11-22
   ```

   Pagina de a 2000 CVE, respeta el límite de solicitudes y reintenta ante errores. Al terminar muestra descargados, rechazados, duplicados, sin puntuación, formato inválido y N. Un mes son unos 17 000 CVE (9 páginas) y 120 días, unos 70 000 (35 páginas). Sin clave la NVD obliga a esperar 6 s entre solicitudes, así que 120 días tardan unos 3 o 4 minutos; con clave es bastante menos.

2. **Desde la API**, con el cuerpo `{"inicio": "AAAA-MM-DD", "fin": "AAAA-MM-DD"}`:
   - `POST /api/datos/cargar` responde cuando termina la descarga. Sirve para periodos cortos y acepta hasta 366 días.
   - `POST /api/datos/descargas` responde enseguida (`202`) con un `id` y descarga en segundo plano. El progreso (tramo, CVE descargados y, al final, el resumen) se consulta con `GET /api/datos/descargas/{id}`. Solo corre una descarga a la vez (`409` si ya hay otra).

3. **Subiendo un CSV:** `POST /api/datos/archivo`. Sirve cualquier CSV guardado en `data/` o uno propio con al menos las columnas `cve_id`, `publicado`, `base_score`, `vector_ataque` y `privilegios` (las demás de las 20 variables son opcionales).

Todo lo que se carga se guarda en `data/`: el CSV de 20 columnas **sin depurar**, un JSON con el periodo, el origen y la fecha de consulta y, si viene de la NVD, la **base original** (`.crudo.json.gz`, la respuesta de la NVD tal como llegó). Para volver a los datos simulados basta con mover o borrar los archivos de `data/` y reiniciar.

### Limpieza

La depuración sigue los pasos 4.1 a 4.7 del notebook y deja anotado cuántos CVE salen en cada uno y por qué: excluye los CVE *Rejected*, cuenta y quita los duplicados (queda la última modificación), convierte los tipos (los errores de formato se cuentan aparte), normaliza el texto y valida los dominios, excluye los que no tienen puntuación y comprueba que **descargados − eliminados = N**. Los atípicos se marcan, no se eliminan. Usa una sola puntuación por CVE: CVSS v3.1, luego v3.0 y luego v4.0, prefiriendo la métrica de la NVD (*Primary*) sobre la de la CNA (*Secondary*).

- El reporte está en `GET /api/datos/calidad` y se baja en CSV con `GET /api/exportar/calidad`.
- La base original se baja con `GET /api/exportar/crudo` y la limpia con `GET /api/exportar/cve`.
- Las 20 variables y cada paso, con su justificación, están en [docs/diccionario-de-datos.md](docs/diccionario-de-datos.md).

### Datos de la demo

**Al arrancar, el backend retoma la última descarga guardada en `data/`; si no hay ninguna, carga el conjunto de `data/demo/`.** Así la demo no depende de que la NVD esté disponible, y esa carpeta viaja en el repositorio y en la imagen de Docker. Si ninguna de las dos se puede leer, usa los datos simulados.

Para cambiar el conjunto de la demo, descargar el periodo con el script, copiar a `data/demo/` el CSV y el JSON que quedan en `data/` (la base original `.crudo.json.gz` no se sube) y **borrar de esa carpeta los archivos anteriores**: se carga el más reciente.

```bash
# desde la raíz del repositorio
cp data/cves_2026-07-26_2026-11-22_api_*.csv data/cves_2026-07-26_2026-11-22_api_*.json data/demo/
```

## Exportar resultados y registro de ejecuciones

- **Exportar (RF7):** `GET /api/exportar/{tabla}`, con `tabla` = `cve` (la base limpia, con 20 variables y `critico`), `crudo` (la base original), `calidad` (los pasos de la limpieza), `eventos`, `reglas`, `bayes` o `binomial`. Recibe los mismos parámetros del cálculo por query string, así que se puede descargar con un enlace normal, por ejemplo `/api/exportar/binomial?n=20&p=0.1` o `/api/exportar/eventos?umbral=7`. Los CSV van en UTF-8 con BOM para que Excel muestre bien las tildes.
- **Registro de ejecuciones:** cada carga, cada cálculo (`eventos`, `reglas`, `bayes`, `binomial`) y cada exportación de datos (`cve`, `crudo`, `calidad`) se guarda en `data/ejecuciones.jsonl` con la fecha, los parámetros, el resultado y los datos usados (origen, N y periodo). Se consulta con `GET /api/ejecuciones?limite=50`.
- Todas las rutas y sus parámetros están en [docs/contrato-api.md](docs/contrato-api.md).

## Servir todo desde el backend (sin Vite)

Si existe `frontend/dist`, el backend lo sirve en la raíz, junto con la API, en el mismo puerto. Sirve para la demo o para probar lo que se va a desplegar:

```bash
cd frontend && npm run build        # genera frontend/dist
cd ../backend && uvicorn api.main:app
```

Abrir <http://localhost:8000>. Recargar la página en una ruta como `/binomial` funciona (el backend devuelve `index.html` para las rutas del frontend); una ruta de la API que no existe sigue dando 404.

## Docker

La imagen compila el frontend y lo sirve junto con la API. Hay que construirla desde la **raíz del repositorio**, porque necesita `backend/`, `frontend/` y `data/demo/`:

```bash
docker build -t nvd-cve .
docker run --rm -p 8000:8000 --env-file .env -v nvd-datos:/app/data nvd-cve
```

- Aplicación: <http://localhost:8000> · API: <http://localhost:8000/docs>
- `--env-file .env` pasa `NVD_API_KEY` (opcional). El `.env` no entra en la imagen.
- `-v nvd-datos:/app/data` guarda lo que se descargue entre ejecuciones. Con un **volumen con nombre** Docker copia la primera vez la demo que trae la imagen; con una **carpeta del equipo** (`-v ./datos:/app/data`) esa carpeta oculta la demo y se arranca con los datos simulados hasta que se descargue algo.
- Corre un solo proceso a propósito: el conjunto cargado y las descargas en curso viven en la memoria del proceso.

## Pruebas y verificación

| Qué | Dónde | Comando |
|---|---|---|
| Pruebas del backend (no usan la red; incluyen una por endpoint y la revisión de la documentación) | `backend/` | `python -m pytest -q` |
| Revisión de tipos del frontend | `frontend/` | `npx tsc -b` |
| Lint del frontend | `frontend/` | `npm run lint` |
| Compilar el frontend | `frontend/` | `npm run build` |

## Regenerar los tipos de la API en el frontend

Los tipos de `frontend/src/api/schema.d.ts` se generan desde el esquema OpenAPI del backend. Hay que regenerarlos cada vez que cambie el contrato (los commits que lo cambian llevan `!`, por ejemplo `feat(api)!: ...`).

Con el backend levantado, desde `frontend/`:

```bash
npm run tipos
```

(es lo mismo que `npx openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts`).

## Después de un `git pull`

Si cambiaron las dependencias, volver a instalarlas:

```bash
# backend/ (con el entorno activado), si cambió requirements.txt
pip install -r requirements.txt

# frontend/, si cambió package.json o package-lock.json
npm install
```

## Problemas comunes

| Síntoma | Solución |
|---|---|
| `ModuleNotFoundError` al levantar el backend o correr las pruebas | Activar el entorno (`.venv`) y ejecutar los comandos desde `backend/` |
| `Form data requires "python-multipart" to be installed` | `pip install -r requirements.txt` (la dependencia se agregó en la fase 1) |
| El frontend muestra errores de red en `/api/...` | El backend no está levantado en el puerto 8000 |
| `Address already in use` en el puerto 8000 | Otro proceso usa el puerto; cerrarlo o usar `uvicorn api.main:app --reload --port 8001` y cambiar el puerto del proxy en `vite.config.ts` |
| Vite pide otra versión de Node | Actualizar Node.js a 20.19+ o 22.12+ |

## Convenciones

- Commits en formato [Conventional Commits](https://www.conventionalcommits.org/es/): `tipo(alcance): descripción`, por ejemplo `feat(stats): Se agrega el modelo binomial completo.`
- Toda la estadística vive en `backend/stats/` (sin FastAPI) y cada función lleva su prueba contra el informe.
- Una ruta nueva de la API necesita su caso en `backend/tests/test_endpoints.py` y su fila en [docs/contrato-api.md](docs/contrato-api.md); si no, las pruebas fallan.
- Más detalles en [plan-de-trabajo-v2.md](plan-de-trabajo-v2.md).
