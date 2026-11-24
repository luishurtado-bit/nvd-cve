# syntax=docker/dockerfile:1
# Una sola imagen: compila el frontend y lo sirve junto con la API en el puerto 8000.
#
#   docker build -t nvd-cve .
#   docker run --rm -p 8000:8000 --env-file .env -v nvd-datos:/app/data nvd-cve
#
# Luego, <http://localhost:8000> (la aplicación) y <http://localhost:8000/docs> (la API).
# El contexto es la raíz del repositorio (hacen falta backend/, frontend/ y data/demo/).

ARG NODE_VERSION=24
ARG PYTHON_VERSION=3.14

# 1. Frontend: npm run build → /app/frontend/dist
FROM node:${NODE_VERSION}-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Backend + el frontend ya compilado
FROM python:${PYTHON_VERSION}-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Mismas rutas que en el repositorio: backend/api/main.py busca ../../frontend/dist y
# backend/config.py guarda los datos en ../data
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Datos de la demo: el backend los carga al arrancar si no hay una descarga propia en /app/data.
# Con un volumen con nombre (-v nvd-datos:/app/data) Docker los copia la primera vez; con una
# carpeta del equipo (-v ./datos:/app/data) quedan ocultos y se parte de los datos simulados.
COPY data/demo /app/data/demo

RUN useradd --create-home --uid 1000 app && chown -R app:app /app/data
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/salud', timeout=3)"

# Un solo proceso: el conjunto cargado y las descargas en curso viven en la memoria del proceso
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
