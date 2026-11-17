from datetime import date
from typing import Any
import pytest
import requests
from nvd.cliente import ESPERA_CON_CLAVE, ESPERA_SIN_CLAVE, ClienteNVD, ErrorNVD
from tests.ejemplos_nvd import RespuestaFalsa, SesionFalsa, pagina

def cliente(sesion: SesionFalsa, api_key: str | None = None, **kwargs: Any) -> tuple[ClienteNVD, list[float]]:
    esperas: list[float] = []
    return ClienteNVD(api_key=api_key, sesion=sesion, dormir=esperas.append, **kwargs), esperas

DIA = date(2026, 11, 1)

def test_una_pagina() -> None:
    sesion = SesionFalsa(pagina(["CVE-1", "CVE-2"], 2))
    c, esperas = cliente(sesion)
    cves = c.descargar(DIA, DIA)
    assert [x["id"] for x in cves] == ["CVE-1", "CVE-2"]
    params = sesion.llamadas[0]["params"]
    assert params["pubStartDate"] == "2026-11-01T00:00:00.000"
    assert params["pubEndDate"] == "2026-11-01T23:59:59.999"
    assert params["resultsPerPage"] == 2000
    assert params["startIndex"] == 0
    assert sesion.llamadas[0]["headers"] == {}
    assert esperas == []  # la primera solicitud no espera

def test_varias_paginas() -> None:
    sesion = SesionFalsa(pagina(["1", "2"], 5), pagina(["3", "4"], 5), pagina(["5"], 5))
    c, esperas = cliente(sesion)
    cves = c.descargar(DIA, DIA)
    assert [x["id"] for x in cves] == ["1", "2", "3", "4", "5"]
    assert [ll["params"]["startIndex"] for ll in sesion.llamadas] == [0, 2, 4]
    assert esperas == [ESPERA_SIN_CLAVE, ESPERA_SIN_CLAVE]

def test_con_clave() -> None:
    sesion = SesionFalsa(pagina(["1"], 2), pagina(["2"], 2))
    c, esperas = cliente(sesion, api_key="mi-clave")
    c.descargar(DIA, DIA)
    assert sesion.llamadas[0]["headers"] == {"apiKey": "mi-clave"}
    assert esperas == [ESPERA_CON_CLAVE]

def test_varios_tramos() -> None:
    # 121 días: dos tramos (120 + 1)
    sesion = SesionFalsa(pagina(["a"], 1), pagina(["b"], 1))
    c, _ = cliente(sesion)
    cves = c.descargar(date(2026, 1, 1), date(2026, 5, 1))
    assert [x["id"] for x in cves] == ["a", "b"]
    fechas = [(ll["params"]["pubStartDate"][:10], ll["params"]["pubEndDate"][:10]) for ll in sesion.llamadas]
    assert fechas == [("2026-01-01", "2026-04-30"), ("2026-05-01", "2026-05-01")]

def test_sin_resultados() -> None:
    c, _ = cliente(SesionFalsa(pagina([], 0)))
    assert c.descargar(DIA, DIA) == []

def test_pagina_vacia_no_cicla() -> None:
    # Si la API dice que hay más pero manda una página vacía, se detiene
    sesion = SesionFalsa(pagina(["1"], 10), pagina([], 10))
    c, _ = cliente(sesion)
    assert len(c.descargar(DIA, DIA)) == 1
    assert len(sesion.llamadas) == 2

@pytest.mark.parametrize("fallo", [RespuestaFalsa(503), RespuestaFalsa(403), RespuestaFalsa(429), requests.ConnectionError("sin red"), requests.Timeout("lento"), RespuestaFalsa(200)])
def test_reintenta_y_se_recupera(fallo: RespuestaFalsa | Exception) -> None:
    # RespuestaFalsa(200) sin cuerpo = respuesta que no es JSON
    sesion = SesionFalsa(fallo, pagina(["1"], 1))
    c, esperas = cliente(sesion)
    assert [x["id"] for x in c.descargar(DIA, DIA)] == ["1"]
    assert esperas == [ESPERA_SIN_CLAVE * 2]

def test_espera_creciente_y_se_agotan_los_reintentos() -> None:
    sesion = SesionFalsa(*[RespuestaFalsa(503)] * 3)
    c, esperas = cliente(sesion, max_reintentos=2)
    with pytest.raises(ErrorNVD, match="503"):
        c.descargar(DIA, DIA)
    assert len(sesion.llamadas) == 3
    assert esperas == [ESPERA_SIN_CLAVE * 2, ESPERA_SIN_CLAVE * 4]

def test_error_no_reintentable() -> None:
    sesion = SesionFalsa(RespuestaFalsa(404, headers={"message": "Invalid pubStartDate"}))
    c, esperas = cliente(sesion)
    with pytest.raises(ErrorNVD, match="Invalid pubStartDate"):
        c.descargar(DIA, DIA)
    assert len(sesion.llamadas) == 1
    assert esperas == []

def test_progreso() -> None:
    mensajes: list[str] = []
    c, _ = cliente(SesionFalsa(pagina(["1"], 1)), progreso=mensajes.append)
    c.descargar(DIA, DIA)
    assert mensajes[0].startswith("Tramo 1 de 1")
    assert "1 de 1 CVE" in mensajes[-1]

def test_avance_estructurado() -> None:
    from nvd.cliente import Avance
    avances: list[Avance] = []
    sesion = SesionFalsa(pagina(["1", "2"], 3), pagina(["3"], 3), pagina(["4"], 1))
    c, _ = cliente(sesion, al_avanzar=avances.append)
    c.descargar(date(2026, 1, 1), date(2026, 5, 1))  # 2 tramos
    assert avances == [Avance(1, 2, 2, 3), Avance(1, 2, 3, 3), Avance(2, 2, 4, 1)]
