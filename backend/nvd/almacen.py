import io
import json
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from pathlib import Path
import pandas as pd
import config
from nvd.extraccion import COLUMNAS, severidad_cvss
from stats.eventos import COL_ID, COL_PRIVILEGIOS, COL_PUBLICADO, COL_PUNTUACION, COL_SEVERIDAD, COL_VECTOR

# Un CSV subido debe traer al menos estas; las demás se completan con nulos
COLUMNAS_OBLIGATORIAS = (COL_ID, COL_PUBLICADO, COL_PUNTUACION, COL_VECTOR, COL_PRIVILEGIOS)
# Todo se lee como texto: la conversión de tipos es el paso 4.4 de la depuración,
# que así puede contar los valores con formato inválido
_TIPOS_TEXTO = {c: "string" for c in COLUMNAS}

class ErrorCSV(ValueError):
    """El CSV no tiene el formato esperado."""

@dataclass(frozen=True)
class Metadatos:
    inicio: date | None
    fin: date | None
    origen: str  # "api" o "csv"
    guardado: str  # fecha y hora UTC, ISO-8601

def _carpeta(carpeta: Path | None) -> Path:
    return carpeta if carpeta is not None else config.dir_datos()

def guardar(
    df: pd.DataFrame,
    inicio: date | None,
    fin: date | None,
    origen: str,
    carpeta: Path | None = None,
) -> Path:
    """Guarda lo descargado (sin depurar) como CSV y sus metadatos como JSON al lado."""
    destino = _carpeta(carpeta)
    destino.mkdir(parents=True, exist_ok=True)
    ahora = datetime.now(timezone.utc)
    nombre = f"cves_{inicio or 'na'}_{fin or 'na'}_{origen}_{ahora:%Y%m%dT%H%M%S%f}"
    ruta = destino / f"{nombre}.csv"
    df.loc[:, list(COLUMNAS)].to_csv(ruta, index=False, encoding="utf-8")
    meta = Metadatos(inicio=inicio, fin=fin, origen=origen, guardado=ahora.isoformat())
    ruta.with_suffix(".json").write_text(
        json.dumps(asdict(meta), default=str, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return ruta

def leer_csv(contenido: bytes | str | Path) -> pd.DataFrame:
    """Lee un CSV con el formato de COLUMNAS, todo como texto; completa las columnas
    opcionales con nulos."""
    try:
        fuente = io.BytesIO(contenido) if isinstance(contenido, bytes) else contenido
        df = pd.read_csv(fuente, dtype=_TIPOS_TEXTO, encoding="utf-8-sig")
    except (ValueError, UnicodeDecodeError, pd.errors.ParserError) as e:
        raise ErrorCSV(f"No se pudo leer el CSV: {e}") from e
    faltantes = [c for c in COLUMNAS_OBLIGATORIAS if c not in df.columns]
    if faltantes:
        raise ErrorCSV(f"Al CSV le faltan columnas: {', '.join(faltantes)}")
    if df.empty:
        raise ErrorCSV("El CSV no tiene filas")
    for col in COLUMNAS:
        if col not in df.columns:
            df[col] = pd.Series(pd.NA, index=df.index, dtype="string")
    # Severidad faltante: se deduce de la puntuación (si es un número válido)
    puntuacion = pd.to_numeric(df[COL_PUNTUACION], errors="coerce")
    falta = df[COL_SEVERIDAD].isna() & puntuacion.between(0, 10)
    df.loc[falta, COL_SEVERIDAD] = puntuacion[falta].map(severidad_cvss)
    return df.loc[:, list(COLUMNAS)]

def cargar(ruta: Path) -> tuple[pd.DataFrame, Metadatos]:
    df = leer_csv(ruta)
    crudo = json.loads(ruta.with_suffix(".json").read_text(encoding="utf-8"))
    meta = Metadatos(
        inicio=date.fromisoformat(crudo["inicio"]) if crudo.get("inicio") else None,
        fin=date.fromisoformat(crudo["fin"]) if crudo.get("fin") else None,
        origen=crudo["origen"],
        guardado=crudo["guardado"],
    )
    return df, meta

def ultimo(carpeta: Path | None = None) -> Path | None:
    """El CSV guardado más reciente que tenga sus metadatos, o None."""
    origen = _carpeta(carpeta)
    if not origen.is_dir():
        return None
    candidatos = [p for p in origen.glob("cves_*.csv") if p.with_suffix(".json").is_file()]
    return max(candidatos, key=lambda p: p.stat().st_mtime_ns, default=None)
