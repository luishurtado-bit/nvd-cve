import logging
from dataclasses import dataclass
from datetime import date
import pandas as pd
from api.esquemas import Origen, Periodo, ResumenDatos
from nvd import almacen
from nvd.depuracion import depurar

log = logging.getLogger(__name__)

@dataclass(frozen=True)
class Conjunto:
    omega: pd.DataFrame  # CVE depurados (Ω)
    resumen: ResumenDatos

_actual: Conjunto | None = None

def actual() -> Conjunto | None:
    """El conjunto cargado, o None si se trabaja con los datos simulados."""
    return _actual

def establecer(
    crudo: pd.DataFrame, inicio: date | None, fin: date | None, origen: Origen
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
        ),
    )
    return _actual

def reiniciar() -> None:
    """Vuelve a los datos simulados."""
    global _actual
    _actual = None

def cargar_ultimo() -> Conjunto | None:
    """Carga el último conjunto guardado en data/, si hay; si falla, sigue con los simulados."""
    ruta = almacen.ultimo()
    if ruta is None:
        return None
    try:
        crudo, meta = almacen.cargar(ruta)
        conjunto = establecer(crudo, meta.inicio, meta.fin, meta.origen)  # type: ignore[arg-type]
    except (OSError, ValueError, KeyError) as e:
        log.warning("No se pudo cargar %s: %s. Se usan los datos simulados.", ruta, e)
        return None
    log.info("Datos cargados de %s (N = %d)", ruta.name, conjunto.resumen.N)
    return conjunto
