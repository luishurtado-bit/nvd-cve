# NVD-CVE

Proyecto de análisis estadístico de vulnerabilidades CVE mediante Python, FastAPI y React.

A partir de los datos de la National Vulnerability Database (NVD) del NIST, el software calcula probabilidades de eventos, reglas de probabilidad, la actualización por el teorema de Bayes y el modelo binomial del número de CVE críticos en un lote. El reparto del trabajo y el contrato de la API están en [plan-de-trabajo-software.md](plan-de-trabajo-software.md).

## Estructura

```
nvd-cve/
├── backend/           API en FastAPI
│   ├── api/           rutas, esquemas (Pydantic) y datos simulados
│   ├── stats/         estadística pura: eventos, probabilidad, Bayes, binomial, descriptiva
│   ├── nvd/           cliente de la API de la NVD (fase 2)
│   ├── tests/         pruebas con pytest
│   └── requirements.txt
├── frontend/          React + TypeScript + Vite
│   └── src/api/schema.d.ts   tipos generados desde la API (no se editan a mano)
├── data/              datos descargados (no se suben al repositorio)
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

El archivo `.env` **nunca** se sube al repositorio. Por ahora la clave no es obligatoria: el backend responde con datos simulados hasta la fase 2.

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

## Pruebas y verificación

| Qué | Dónde | Comando |
|---|---|---|
| Pruebas del backend | `backend/` | `python -m pytest -q` |
| Revisión de tipos del frontend | `frontend/` | `npx tsc -b` |
| Lint del frontend | `frontend/` | `npm run lint` |
| Compilar el frontend | `frontend/` | `npm run build` |

## Regenerar los tipos de la API en el frontend

Los tipos de `frontend/src/api/schema.d.ts` se generan desde el esquema OpenAPI del backend. Hay que regenerarlos cada vez que cambie el contrato (los commits que lo cambian llevan `!`, por ejemplo `feat(api)!: ...`).

Con el backend levantado, desde `frontend/`:

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts
```

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
- Más detalles en [plan-de-trabajo-software.md](plan-de-trabajo-software.md).
