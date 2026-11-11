# Plan de trabajo: backend y frontend

Proyecto NVD/CVE para **Estadística Inferencial** (Binomial, Bayes, reglas de probabilidad) y **Electiva III** (consumo de API, tratamiento de datos, análisis descriptivo y dashboard). Este plan reparte el trabajo entre **Backend** (una persona) y **Frontend** (dos personas, Front A y Front B), sin fechas fijas: el orden lo marcan las dependencias.

> Conviene cambiar «Front A» y «Front B» por los nombres reales y poner las fechas de entrega cuando se conozcan.

---

## 1. Cómo evitamos estorbarnos: contrato primero

El frontend no puede esperar a que el backend esté terminado. Por eso:

1. **Se acuerda el contrato de la API** (sección 3) antes de escribir pantallas.
2. El backend publica **respuestas de ejemplo fijas** (mocks) en los endpoints, con la misma forma que tendrán las reales. El frontend desarrolla contra eso.
3. Cuando el backend tenga los datos y los cálculos reales, **reemplaza los mocks sin cambiar la forma** de las respuestas.
4. El esquema de la API (`/openapi.json`) genera los tipos de TypeScript, así que si el contrato cambia, el compilador del frontend avisa.

Los valores de ejemplo salen del informe (hipotéticos): N = 1000, P(A) = 0,10, P(B) = 0,75, P(A ∩ B) = 0,09, P(A | B) = 0,12, Bin(20; 0,10).

---

## 2. Reglas del proyecto

- **Ramas y PR:** cada tarea en su rama (`feature/nombre`), Pull Request revisado por otra persona antes de unir a `main`. `main` siempre debe arrancar.
- **Backend:** toda la estadística vive en `backend/stats/`, sin importar FastAPI, y cada función nueva lleva una prueba contra un cálculo manual o el informe.
- **Frontend:** TypeScript estricto, **sin `any`**; los tipos de la API se generan, no se escriben a mano.
- **Alcance:** solo Binomial, Bayes y reglas de probabilidad. **No** se implementa Normal, TLC, intervalos ni pruebas de hipótesis.
- **Secretos:** la clave de la NVD solo en `.env`; nunca en el repositorio.
- **Sincronización:** reunión corta al terminar cada fase (qué terminó, qué bloquea, qué cambia en el contrato).

---

## 3. Contrato de la API (propuesta inicial)

Todas las rutas cuelgan de `/api`. Los nombres de campos van en español, como en el informe.

| Método y ruta | Entrada | Salida |
|---|---|---|
| `GET /salud` | — | `{ estado }` |
| `POST /datos/cargar` | `{ inicio, fin }` (fechas) | Resumen de datos (abajo) |
| `POST /datos/archivo` | CSV subido | Resumen de datos |
| `GET /datos/resumen` | — | Resumen de datos del conjunto cargado |
| `POST /eventos` | Definición de A, B y C (umbral de `baseScore`, vector de ataque, privilegios) | `N`, conteos de A, B, C y de las intersecciones, y sus probabilidades |
| `POST /reglas` | Eventos elegidos | Complemento, unión, intersección y comprobación de independencia |
| `POST /bayes` | Evento condicionante, probabilidad previa (opcional, editable) | `P(A\|B)`, `P(B\|A)`, `P(B)` por probabilidad total y posterior |
| `POST /binomial` | `n`, `k`, `p` (opcional; si falta se estima como K/N) y confianza deseada (opcional) | Tabla de la pmf, `P(X=k)`, `P(X≤k)`, `P(X≥k)`, `E(X)`, `Var(X)`, `n` mínimo y advertencias |
| `GET /dashboard/severidad` | — | Conteo por severidad |
| `GET /dashboard/vector-ataque` | — | Conteo por vector de ataque |
| `GET /dashboard/serie-diaria` | — | CVE publicados por día |
| `GET /dashboard/histograma` | `bins` (opcional) | Intervalos y frecuencias de `baseScore`, más media, mediana y desviación |
| `GET /dashboard/cwe` | `top` (opcional) | Los CWE más frecuentes |

**Resumen de datos** (respuesta común de carga y resumen):
```json
{
  "periodo": { "inicio": "por fijar", "fin": "por fijar" },
  "descargados": 0,
  "rechazados": 0,
  "sin_puntuacion": 0,
  "N": 0
}
```

**Advertencias** que el backend puede devolver en `/binomial` y las pantallas deben mostrar: `n ≥ 0,05·N` (el supuesto de independencia se debilita), `p` fuera de [0, 1], `k > n`, `N` demasiado pequeño.

Este contrato es un punto de partida: se ajusta en la primera reunión y después se cambia solo avisando.

---

## 4. Backend (una persona)

Tamaño: **S** pequeña, **M** mediana, **L** grande.

### Fase 1: base y mocks
- [ ] **B1 (M) Módulo `stats/`:** definir eventos sobre un DataFrame (A: `baseScore` ≥ umbral; B: vector de red; C: sin privilegios), probabilidades, complemento, unión, intersección, independencia, condicional, probabilidad total y Bayes con prior editable. Pruebas contra los números del informe.
- [ ] **B2 (S) Binomial en `stats/`:** pmf, `P(X=k)`, `P(X≤k)`, `P(X≥k)`, `E`, `Var`, `n` mínimo para una confianza dada, y las advertencias. Pruebas (por ejemplo, `P(X≥3)` para Bin(20; 0,10) ≈ 0,3231).
- [ ] **B3 (S) Endpoints con mocks:** todas las rutas del contrato devolviendo datos fijos y la forma final, con modelos de entrada y salida en Pydantic. **Es lo primero que necesita el frontend.**

### Fase 2: datos de la NVD
- [ ] **B4 (M) Cliente de la API (`nvd/`):** consulta con `pubStartDate`/`pubEndDate`, paginación, reintentos y respeto del límite de solicitudes, con la clave leída desde `.env`.
- [ ] **B5 (M) Depuración:** excluir *Rejected* y CVE sin puntuación; **una puntuación por CVE** con prioridad v3.1 → v3.0 → v4.0; extraer `baseScore`, severidad, vector de ataque, privilegios, CWE y fecha. Reportar descargados, rechazados, sin puntuación y N.
- [ ] **B6 (S) Almacenamiento:** guardar lo descargado en `data/` (CSV o parquet) y poder cargarlo desde ahí, para no depender de la API durante la demo. Carga por archivo CSV subido.
- [ ] **B7 (M) Conectar la estadística con datos reales:** `/datos/*`, `/eventos`, `/reglas`, `/bayes` y `/binomial` dejan de usar mocks.

### Fase 3: dashboard e integración
- [ ] **B8 (M) Endpoints del dashboard:** conteos por severidad y vector, serie diaria, histograma con media, mediana y desviación, y top de CWE.
- [ ] **B9 (S) Errores y validaciones:** mensajes claros (`P(B)=0`, `N=0`, rangos inválidos, API caída o con límite excedido) con códigos HTTP correctos.
- [ ] **B10 (S) Descarga lenta:** si la consulta tarda mucho, devolver el progreso o permitir lanzarla aparte (por ejemplo, un script que descarga y guarda).

### Fase 4: cierre
- [ ] **B11 (S) Pruebas de API:** una prueba por endpoint; los cálculos comparados con el informe.
- [ ] **B12 (S) Despliegue:** `Dockerfile`, variable de entorno de la clave y plan B local.
- [ ] **B13 (S) Datos para la demostración:** un conjunto fijo ya descargado y su periodo documentado.

---

## 5. Frontend (dos personas)

Base común (la arma **Front A** al inicio y Front B la usa):
- [ ] **F0 (S) Estructura:** rutas (por ejemplo, React Router), layout con navegación, cliente de la API tipado y generación de tipos desde `/openapi.json`, componentes de carga y de error.

### Front A: parte estadística (Estadística Inferencial)
- [ ] **FA1 (M) Pantalla de datos y eventos:** formulario para definir A, B y C (umbral, vector, privilegios), tabla con `N`, conteos y probabilidades, y el resumen de datos (descargados, rechazados, sin puntuación).
- [ ] **FA2 (M) Reglas de probabilidad:** complemento, unión, intersección y comprobación de independencia (comparar `P(A∩B)` con `P(A)·P(B)`), con el aviso de que A y B son dependientes por construcción del CVSS.
- [ ] **FA3 (M) Condicional y Bayes:** entradas con prior editable y presentación del paso a paso (P(A\|B), P(B\|A), probabilidad total, posterior).
- [ ] **FA4 (L) Binomial:** entradas `n`, `k` y `p` (estimado o manual), resultados (`P(X=k)`, `P(X≤k)`, `P(X≥k)`, `E`, `Var`), gráfico de la pmf con las barras de `P(X≥k)` resaltadas, cálculo del `n` mínimo y las advertencias del backend.

### Front B: datos y dashboard (Electiva III)
- [ ] **FB1 (M) Carga de datos:** elegir rango de fechas o subir CSV, mostrar progreso y el resumen resultante, y manejar errores de la API.
- [ ] **FB2 (L) Dashboard descriptivo:** tarjetas con los totales, gráfico de severidad, vector de ataque, serie diaria, histograma de `baseScore` con media, mediana y desviación, y top de CWE.
- [ ] **FB3 (S) Filtros y tablas:** filtrar el dashboard (por severidad, por fecha) y una tabla de CVE con búsqueda.
- [ ] **FB4 (S) Diseño y responsive:** consistencia visual, estados vacíos y de carga.

### Cierre (los dos)
- [ ] **FC1 (S) Integración:** quitar dependencias de mocks, revisar casos límite con datos reales.
- [ ] **FC2 (S) Pruebas de componentes clave** y revisión de accesibilidad básica.
- [ ] **FC3 (S) Capturas y guion de demostración** para la sección «Resultados y demostración del software» del informe final.

---

## 6. Orden y dependencias

```
Fase 1:  B1, B2 (stats)  ─►  B3 (endpoints con mocks) ─────────────┐
         F0 (estructura) ─►  FA1..FA4 y FB1..FB2 con mocks  ◄──────┘
Fase 2:  B4 ─► B5 ─► B6 ─► B7  (datos reales)
Fase 3:  B8 (dashboard) ─► FB2/FB3 con datos reales; B9, B10
Fase 4:  integración (FC1), pruebas (B11, FC2), despliegue (B12), demo (B13, FC3)
```

- Lo que **desbloquea** al frontend: **B3** (mocks). Conviene tenerlo en los primeros días.
- Lo que **no depende** del periodo de datos: todo lo de la Fase 1. El periodo se pasa como parámetro y puede fijarse al final.

---

## 7. Riesgos y cómo mitigarlos

| Riesgo | Mitigación |
|---|---|
| La API de la NVD es lenta o limita las solicitudes | Descargar una vez, guardar en `data/` y trabajar desde ahí; tener un conjunto fijo para la demo |
| El periodo de datos aún no está decidido | Parametrizar el rango; los mocks usan los números hipotéticos del informe |
| Cambios en el contrato rompen el frontend | Tipos generados desde OpenAPI y aviso en la reunión de sincronización |
| Muchos CVE sin puntuación reducen N | Mostrar siempre descargados, rechazados, sin puntuación y N |
| El supuesto de independencia de la Binomial se debilita con `n` grande | Advertencia cuando `n ≥ 0,05·N`, que ya está en el informe |
| Alcance que crece (Normal, TLC, intervalos) | Fuera de alcance por decisión de la profesora |
| Despliegue de último momento | Probar el contenedor temprano y tener plan B local |

---

## 8. Lista de verificación frente a lo que pide la guía

- [ ] El software **recibe datos** (API por rango de fechas o CSV).
- [ ] **Automatiza** los cálculos de probabilidad (eventos y reglas).
- [ ] Ejecuta la **actualización de Bayes** con prior editable.
- [ ] Calcula el **modelo asignado** (Binomial).
- [ ] Muestra resultados claros para la **demostración del software** del informe.
- [ ] Para Electiva III: **consumo de API, tratamiento de datos, análisis descriptivo y dashboard**.
