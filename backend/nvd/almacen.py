import gzip
import io
import json
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from pathlib import Path
import pandas as pd
import config
from nvd.extraccion import COLUMNAS, a_dataframe, severidad_cvss
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
    # Cuándo se consultó la NVD (ISO-8601, UTC); None si los datos vienen de un CSV
    fecha_consulta: str | None = None

def _carpeta(carpeta: Path | None) -> Path:
    return carpeta if carpeta is not None else config.dir_datos()

def ruta_crudo(ruta: Path) -> Path:
    """Dónde va la base original (JSON de la API, comprimido) de un CSV guardado."""
    return ruta.with_name(f"{ruta.stem}.crudo.json.gz")

def guardar(
    df: pd.DataFrame,
    inicio: date | None,
    fin: date | None,
    origen: str,
    carpeta: Path | None = None,
    crudo: list[dict] | None = None,
) -> Path:
    """Guarda lo descargado (sin depurar) como CSV y sus metadatos como JSON al lado.
    Con `crudo` guarda además la respuesta de la API tal cual (la base original)."""
    destino = _carpeta(carpeta)
    destino.mkdir(parents=True, exist_ok=True)
    ahora = datetime.now(timezone.utc)
    nombre = f"cves_{inicio or 'na'}_{fin or 'na'}_{origen}_{ahora:%Y%m%dT%H%M%S%f}"
    ruta = destino / f"{nombre}.csv"
    df.loc[:, list(COLUMNAS)].to_csv(ruta, index=False, encoding="utf-8")
    meta = Metadatos(
        inicio=inicio,
        fin=fin,
        origen=origen,
        guardado=ahora.isoformat(),
        fecha_consulta=ahora.isoformat() if origen == "api" else None,
    )
    if crudo is not None:
        # Con la misma forma que la respuesta de la NVD, para poder releerlo igual
        original = {
            "periodo": {"inicio": inicio, "fin": fin},
            "fecha_consulta": meta.fecha_consulta,
            "totalResults": len(crudo),
            "vulnerabilities": [{"cve": c} for c in crudo],
        }
        with gzip.open(ruta_crudo(ruta), "wt", encoding="utf-8", compresslevel=6) as archivo:
            json.dump(original, archivo, default=str, ensure_ascii=False)
    ruta.with_suffix(".json").write_text(
        json.dumps(asdict(meta), default=str, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return ruta

def guardar_descarga(cves: list[dict], inicio: date, fin: date, carpeta: Path | None = None) -> Path:
    """Único camino para guardar lo bajado de la NVD: base original y CSV de 20 columnas."""
    return guardar(a_dataframe(cves), inicio, fin, "api", carpeta, crudo=cves)

def leer_crudo(ruta: Path) -> list[dict]:
    """Los objetos `cve` de una base original guardada."""
    with gzip.open(ruta, "rt", encoding="utf-8") as archivo:
        return [v["cve"] for v in json.load(archivo)["vulnerabilities"]]

def leer_csv(contenido: bytes | str | Path, permitir_vacio: bool = False) -> pd.DataFrame:
    """Lee un CSV con el formato de COLUMNAS, todo como texto; completa las columnas
    opcionales con nulos. Un CSV subido sin filas es un error; uno guardado por una
    descarga de un periodo sin CVE (`permitir_vacio`), no."""
    try:
        fuente = io.BytesIO(contenido) if isinstance(contenido, bytes) else contenido
        df = pd.read_csv(fuente, dtype=_TIPOS_TEXTO, encoding="utf-8-sig")
    except (ValueError, UnicodeDecodeError, pd.errors.ParserError) as e:
        raise ErrorCSV(f"No se pudo leer el CSV: {e}") from e
    faltantes = [c for c in COLUMNAS_OBLIGATORIAS if c not in df.columns]
    if faltantes:
        raise ErrorCSV(f"Al CSV le faltan columnas: {', '.join(faltantes)}")
    if df.empty and not permitir_vacio:
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
    df = leer_csv(ruta, permitir_vacio=True)
    crudo = json.loads(ruta.with_suffix(".json").read_text(encoding="utf-8"))
    meta = Metadatos(
        inicio=date.fromisoformat(crudo["inicio"]) if crudo.get("inicio") else None,
        fin=date.fromisoformat(crudo["fin"]) if crudo.get("fin") else None,
        origen=crudo["origen"],
        guardado=crudo["guardado"],
        # Los metadatos anteriores a B19 no la traen: en una descarga es cuando se guardó
        fecha_consulta=crudo.get("fecha_consulta") or (crudo["guardado"] if crudo["origen"] == "api" else None),
    )
    return df, meta

def ultimo(carpeta: Path | None = None) -> Path | None:
    """El CSV guardado más reciente que tenga sus metadatos, o None."""
    origen = _carpeta(carpeta)
    if not origen.is_dir():
        return None
    candidatos = [p for p in origen.glob("cves_*.csv") if p.with_suffix(".json").is_file()]
    return max(candidatos, key=lambda p: p.stat().st_mtime_ns, default=None)
