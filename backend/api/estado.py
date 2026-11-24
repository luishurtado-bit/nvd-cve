import logging
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
import pandas as pd
import config
from api.esquemas import Origen, Periodo, ResumenDatos
from nvd import almacen
from nvd.depuracion import ResultadoDepuracion, depurar

log = logging.getLogger(__name__)

@dataclass(frozen=True)
class Conjunto:
    omega: pd.DataFrame  # CVE depurados (Ω)
    resumen: ResumenDatos
    depuracion: ResultadoDepuracion  # pasos, nulos, dominios y validaciones
    ruta: Path | None = None  # CSV guardado en data/ (sin depurar)

_actual: Conjunto | None = None

def actual() -> Conjunto | None:
    """El conjunto cargado, o None si se trabaja con los datos simulados."""
    return _actual

def establecer(
    crudo: pd.DataFrame,
    inicio: date | None,
    fin: date | None,
    origen: Origen,
    fecha_consulta: datetime | None = None,
    ruta: Path | None = None,
) -> Conjunto:
    """Depura lo descargado y lo deja como conjunto actual."""
    global _actual
    depuracion = depurar(crudo)
    conteo = depuracion.conteo
    _actual = Conjunto(
        omega=depuracion.omega,
        resumen=ResumenDatos(
            periodo=Periodo(inicio=inicio, fin=fin),
            descargados=conteo.descargados,
            rechazados=conteo.rechazados,
            duplicados=conteo.duplicados,
            sin_puntuacion=conteo.sin_puntuacion,
            formato_invalido=conteo.formato_invalido,
            N=conteo.N,
            origen=origen,
            fecha_consulta=fecha_consulta,
        ),
        depuracion=depuracion,
        ruta=ruta,
    )
    return _actual

def cargar(ruta: Path) -> Conjunto:
    """Carga un conjunto guardado en data/. Es el único camino: lo recién descargado
    o subido también se lee del CSV, así que siempre se depura igual."""
    crudo, meta = almacen.cargar(ruta)
    fecha = datetime.fromisoformat(meta.fecha_consulta) if meta.fecha_consulta else None
    return establecer(crudo, meta.inicio, meta.fin, meta.origen, fecha, ruta)  # type: ignore[arg-type]

def reiniciar() -> None:
    """Vuelve a los datos simulados."""
    global _actual
    _actual = None

def cargar_ultimo() -> Conjunto | None:
    """Al arrancar: el último conjunto descargado en data/ y, si no hay ninguno (o no se puede
    leer), el de la demo en data/demo/. Sin ninguno de los dos, se siguen usando los simulados."""
    for carpeta, nombre in ((config.dir_datos(), "Datos"), (config.dir_demo(), "Datos de la demo")):
        ruta = almacen.ultimo(carpeta)
        if ruta is None:
            continue
        try:
            conjunto = cargar(ruta)
        except (OSError, ValueError, KeyError) as e:
            log.warning("No se pudo cargar %s: %s", ruta, e)
            continue
        log.info("%s cargados de %s (N = %d)", nombre, ruta.name, conjunto.resumen.N)
        return conjunto
    log.warning("No hay datos guardados ni de la demo: se usan los datos simulados")
    return None
