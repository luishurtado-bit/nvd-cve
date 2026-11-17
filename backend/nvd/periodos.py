from datetime import date, timedelta

# La API de la NVD acepta como máximo 120 días consecutivos por consulta
MAX_DIAS = 120

def partir_periodo(inicio: date, fin: date, max_dias: int = MAX_DIAS) -> list[tuple[date, date]]:
    """Divide [inicio, fin] (ambos incluidos) en tramos de a lo sumo `max_dias` días.

    Los tramos son contiguos: cada uno empieza el día siguiente al fin del anterior.
    """
    if fin < inicio:
        raise ValueError(f"fin ({fin}) es anterior a inicio ({inicio})")
    if max_dias < 1:
        raise ValueError("max_dias debe ser al menos 1")
    tramos = []
    desde = inicio
    while desde <= fin:
        hasta = min(desde + timedelta(days=max_dias - 1), fin)
        tramos.append((desde, hasta))
        desde = hasta + timedelta(days=1)
    return tramos

def inicio_del_dia(dia: date) -> str:
    """Formato ISO-8601 extendido de la NVD, en UTC: 2026-01-01T00:00:00.000."""
    return f"{dia.isoformat()}T00:00:00.000"

def fin_del_dia(dia: date) -> str:
    return f"{dia.isoformat()}T23:59:59.999"

def parametros_tramo(desde: date, hasta: date) -> dict[str, str]:
    """Parámetros de fecha de publicación para una consulta a la API."""
    return {"pubStartDate": inicio_del_dia(desde), "pubEndDate": fin_del_dia(hasta)}
