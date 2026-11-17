import pandas as pd
from stats.eventos import (
    COL_CWE,
    COL_ID,
    COL_PRIVILEGIOS,
    COL_PUBLICADO,
    COL_PUNTUACION,
    COL_SEVERIDAD,
    COL_VECTOR,
)

COL_ESTADO = "estado"
COL_VERSION = "version_cvss"

# Columnas de lo descargado (antes de depurar); es también el formato del CSV
COLUMNAS = (
    COL_ID,
    COL_PUBLICADO,
    COL_ESTADO,
    COL_VERSION,
    COL_PUNTUACION,
    COL_SEVERIDAD,
    COL_VECTOR,
    COL_PRIVILEGIOS,
    COL_CWE,
)

# Una sola puntuación por CVE: v3.1, luego v3.0 y luego v4.0
PRIORIDAD_METRICAS = (
    ("cvssMetricV31", "3.1"),
    ("cvssMetricV30", "3.0"),
    ("cvssMetricV40", "4.0"),
)

def severidad_cvss(puntuacion: float) -> str:
    """Escala cualitativa de CVSS (v3.x y v4.0)."""
    if puntuacion == 0:
        return "NONE"
    if puntuacion < 4:
        return "LOW"
    if puntuacion < 7:
        return "MEDIUM"
    if puntuacion < 9:
        return "HIGH"
    return "CRITICAL"

def elegir_metrica(metricas: dict) -> tuple[str, dict] | None:
    """Primera versión disponible según la prioridad; dentro de ella, Primary
    (de la NVD) antes que Secondary (de la CNA)."""
    for clave, version in PRIORIDAD_METRICAS:
        lista = metricas.get(clave) or []
        if lista:
            primarias = [m for m in lista if m.get("type") == "Primary"]
            return version, (primarias or lista)[0]
    return None

def extraer_cwe(debilidades: list[dict] | None) -> str | None:
    """Primer CWE-* (Primary antes que Secondary); si no hay, el primer valor
    que venga (NVD-CWE-noinfo, NVD-CWE-Other) o None."""
    ordenadas = sorted(debilidades or [], key=lambda d: d.get("type") != "Primary")
    valores = [
        desc["value"]
        for d in ordenadas
        for desc in d.get("description", [])
        if desc.get("value") and desc.get("lang", "en") == "en"
    ]
    for valor in valores:
        if valor.startswith("CWE-"):
            return valor
    return valores[0] if valores else None

def extraer(cve: dict) -> dict:
    """Un objeto `cve` de la API 2.0 → una fila plana con COLUMNAS."""
    fila: dict = {
        COL_ID: cve.get("id"),
        COL_PUBLICADO: cve.get("published"),
        COL_ESTADO: cve.get("vulnStatus"),
        COL_VERSION: None,
        COL_PUNTUACION: None,
        COL_SEVERIDAD: None,
        COL_VECTOR: None,
        COL_PRIVILEGIOS: None,
        COL_CWE: extraer_cwe(cve.get("weaknesses")),
    }
    elegida = elegir_metrica(cve.get("metrics") or {})
    if elegida is not None:
        version, metrica = elegida
        datos = metrica.get("cvssData", {})
        puntuacion = datos.get("baseScore")
        fila[COL_VERSION] = version
        fila[COL_PUNTUACION] = puntuacion
        fila[COL_SEVERIDAD] = datos.get("baseSeverity") or (
            severidad_cvss(puntuacion) if puntuacion is not None else None
        )
        fila[COL_VECTOR] = datos.get("attackVector")
        fila[COL_PRIVILEGIOS] = datos.get("privilegesRequired")
    return fila

def a_dataframe(cves: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame([extraer(c) for c in cves], columns=list(COLUMNAS))
    df[COL_PUNTUACION] = pd.to_numeric(df[COL_PUNTUACION], errors="coerce")
    return df
