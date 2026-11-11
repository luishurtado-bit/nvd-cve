"""Datos hipotéticos del informe, usados mientras no hay datos reales (B3).

Se reemplazan en B7 por los del conjunto cargado desde la NVD, sin cambiar
la forma de las respuestas.
"""

from datetime import date

from api.esquemas import Periodo, ResumenDatos

# Ω del informe: N = 1000. Rechazados y sin puntuación son también hipotéticos.
N = 1000
RECHAZADOS = 50
SIN_PUNTUACION = 250


def resumen(inicio: date | None = None, fin: date | None = None) -> ResumenDatos:
    return ResumenDatos(
        periodo=Periodo(inicio=inicio, fin=fin),
        descargados=N + RECHAZADOS + SIN_PUNTUACION,
        rechazados=RECHAZADOS,
        sin_puntuacion=SIN_PUNTUACION,
        N=N,
    )
