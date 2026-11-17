import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import config
from api import fuente
from api.esquemas import Ejecucion

log = logging.getLogger(__name__)
ARCHIVO = "ejecuciones.jsonl"
_candado = threading.Lock()

def ruta() -> Path:
    return config.dir_datos() / ARCHIVO

def registrar(operacion: str, parametros: dict[str, Any], resultado: dict[str, Any]) -> None:
    """Agrega una línea con los parámetros y el resultado de un cálculo, junto con
    los datos usados (origen, N y periodo), para que sea reproducible.
    Si no se puede escribir, avisa en el log pero no interrumpe la petición."""
    resumen = fuente.resumen()
    ejecucion = Ejecucion(
        fecha=datetime.now(timezone.utc),
        operacion=operacion,
        origen=resumen.origen,
        N=resumen.N,
        periodo=resumen.periodo,
        parametros=parametros,
        resultado=resultado,
    )
    linea = ejecucion.model_dump_json() + "\n"
    try:
        with _candado:
            ruta().parent.mkdir(parents=True, exist_ok=True)
            with ruta().open("a", encoding="utf-8") as archivo:
                archivo.write(linea)
    except OSError as e:
        log.warning("No se pudo registrar la ejecución: %s", e)

def leer(limite: int = 50) -> list[Ejecucion]:
    """Las últimas `limite` ejecuciones, de la más reciente a la más antigua."""
    if not ruta().is_file():
        return []
    with _candado:
        lineas = ruta().read_text(encoding="utf-8").splitlines()
    ejecuciones = []
    for linea in reversed(lineas):
        if len(ejecuciones) >= limite:
            break
        try:
            ejecuciones.append(Ejecucion.model_validate(json.loads(linea)))
        except ValueError:
            continue  # línea dañada: se omite
    return ejecuciones
