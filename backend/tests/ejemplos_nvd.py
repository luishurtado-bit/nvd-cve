from typing import Any
from nvd.extraccion import severidad_cvss

class RespuestaFalsa:
    def __init__(self, status_code: int, cuerpo: Any = None, headers: dict | None = None) -> None:
        self.status_code = status_code
        self._cuerpo = cuerpo
        self.headers = headers or {}

    def json(self) -> Any:
        if self._cuerpo is None:
            raise ValueError("no es JSON")
        return self._cuerpo

class SesionFalsa:
    """Devuelve, en orden, las respuestas (o lanza las excepciones) que se le dan."""

    def __init__(self, *respuestas: RespuestaFalsa | Exception) -> None:
        self.respuestas = list(respuestas)
        self.llamadas: list[dict] = []

    def get(self, url: str, *, params: dict, headers: dict, timeout: float) -> RespuestaFalsa:
        self.llamadas.append({"url": url, "params": params, "headers": headers})
        r = self.respuestas.pop(0)
        if isinstance(r, Exception):
            raise r
        return r

def pagina(cves: list[dict] | list[str], total: int | None = None) -> RespuestaFalsa:
    """Página de la API 2.0; acepta objetos cve o solo sus ids."""
    objetos = [c if isinstance(c, dict) else {"id": c} for c in cves]
    return RespuestaFalsa(
        200,
        {
            "totalResults": len(objetos) if total is None else total,
            "resultsPerPage": len(objetos),
            "vulnerabilities": [{"cve": c} for c in objetos],
        },
    )

def metrica(
    puntuacion: float,
    vector: str = "NETWORK",
    privilegios: str = "NONE",
    tipo: str = "Primary",
    severidad: str | None = None,
) -> dict:
    datos: dict = {
        "baseScore": puntuacion,
        "attackVector": vector,
        "privilegesRequired": privilegios,
    }
    if severidad != "":
        datos["baseSeverity"] = severidad or severidad_cvss(puntuacion)
    return {
        "source": "nvd@nist.gov" if tipo == "Primary" else "cna@example.com",
        "type": tipo,
        "cvssData": datos,
    }

def cve(
    id_: str,
    publicado: str = "2026-11-01T10:00:00.000",
    estado: str = "Analyzed",
    metricas: dict | None = None,
    cwes: list[str] | None = None,
) -> dict:
    debilidades = (
        [{"source": "nvd@nist.gov", "type": "Primary", "description": [{"lang": "en", "value": c} for c in cwes]}]
        if cwes
        else []
    )
    return {
        "id": id_,
        "published": publicado,
        "vulnStatus": estado,
        "metrics": metricas or {},
        "weaknesses": debilidades,
    }
