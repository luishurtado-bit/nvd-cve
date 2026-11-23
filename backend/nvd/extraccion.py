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
COL_COMPLEJIDAD = "complejidad_ataque"
COL_INTERACCION = "interaccion_usuario"
COL_IMPACTO_C = "impacto_confidencialidad"
COL_IMPACTO_I = "impacto_integridad"
COL_IMPACTO_D = "impacto_disponibilidad"
COL_EXPLOTABILIDAD = "puntaje_explotabilidad"
COL_IMPACTO = "puntaje_impacto"
COL_FUENTE = "fuente"
COL_REFERENCIAS = "n_referencias"
COL_KEV = "kev"
COL_MODIFICADO = "ultima_modificacion"

# Las 20 variables de lo descargado (antes de depurar); es también el formato del CSV
COLUMNAS = (
    COL_ID,
    COL_PUBLICADO,
    COL_ESTADO,
    COL_VERSION,
    COL_PUNTUACION,
    COL_SEVERIDAD,
    COL_VECTOR,
    COL_COMPLEJIDAD,
    COL_PRIVILEGIOS,
    COL_INTERACCION,
    COL_IMPACTO_C,
    COL_IMPACTO_I,
    COL_IMPACTO_D,
    COL_EXPLOTABILIDAD,
    COL_IMPACTO,
    COL_CWE,
    COL_FUENTE,
    COL_REFERENCIAS,
    COL_KEV,
    COL_MODIFICADO,
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

def _interaccion(valor: str | None) -> str | None:
    """v3.x: NONE o REQUIRED. En v4.0, PASSIVE y ACTIVE significan que la víctima
    participa: se unifican como REQUIRED."""
    if valor in ("PASSIVE", "ACTIVE"):
        return "REQUIRED"
    return valor

def _primero(datos: dict, *claves: str) -> object:
    """El primer valor presente entre varias claves (v3.x y v4.0 las nombran distinto)."""
    for clave in claves:
        if datos.get(clave) is not None:
            return datos[clave]
    return None

def extraer(cve: dict) -> dict:
    """Un objeto `cve` de la API 2.0 → una fila plana con COLUMNAS.

    Los valores salen tal como llegan: la conversión de tipos es el paso 4.4 de
    `depurar`, que así puede contar los que no tienen el formato esperado.
    """
    fuente = cve.get("sourceIdentifier")
    fila: dict = {
        COL_ID: cve.get("id"),
        COL_PUBLICADO: cve.get("published"),
        COL_ESTADO: cve.get("vulnStatus"),
        COL_VERSION: None,
        COL_PUNTUACION: None,
        COL_SEVERIDAD: None,
        COL_VECTOR: None,
        COL_COMPLEJIDAD: None,
        COL_PRIVILEGIOS: None,
        COL_INTERACCION: None,
        COL_IMPACTO_C: None,
        COL_IMPACTO_I: None,
        COL_IMPACTO_D: None,
        COL_EXPLOTABILIDAD: None,
        COL_IMPACTO: None,
        COL_CWE: extraer_cwe(cve.get("weaknesses")),
        COL_FUENTE: fuente.strip().lower() if isinstance(fuente, str) else None,
        COL_REFERENCIAS: len(cve.get("references") or []),
        COL_KEV: "cisaExploitAdd" in cve,
        COL_MODIFICADO: cve.get("lastModified"),
    }
    elegida = elegir_metrica(cve.get("metrics") or {})
    if elegida is not None:
        version, metrica = elegida
        datos = metrica.get("cvssData", {})
        puntuacion = datos.get("baseScore")
        fila[COL_VERSION] = version
        fila[COL_PUNTUACION] = puntuacion
        fila[COL_SEVERIDAD] = datos.get("baseSeverity") or (
            severidad_cvss(puntuacion) if isinstance(puntuacion, (int, float)) else None
        )
        fila[COL_VECTOR] = datos.get("attackVector")
        fila[COL_COMPLEJIDAD] = datos.get("attackComplexity")
        fila[COL_PRIVILEGIOS] = datos.get("privilegesRequired")
        fila[COL_INTERACCION] = _interaccion(datos.get("userInteraction"))
        # En v4.0 el impacto sobre el sistema vulnerable es el de las claves "vuln…"
        fila[COL_IMPACTO_C] = _primero(datos, "confidentialityImpact", "vulnConfidentialityImpact")
        fila[COL_IMPACTO_I] = _primero(datos, "integrityImpact", "vulnIntegrityImpact")
        fila[COL_IMPACTO_D] = _primero(datos, "availabilityImpact", "vulnAvailabilityImpact")
        # Solo la v3.x los calcula; en v4.0 quedan vacíos
        fila[COL_EXPLOTABILIDAD] = metrica.get("exploitabilityScore")
        fila[COL_IMPACTO] = metrica.get("impactScore")
    return fila

def a_dataframe(cves: list[dict]) -> pd.DataFrame:
    """Lo descargado como tabla de 20 columnas, sin convertir ni depurar."""
    return pd.DataFrame([extraer(c) for c in cves], columns=list(COLUMNAS))
