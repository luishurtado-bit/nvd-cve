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
    complejidad: str = "LOW",
    interaccion: str = "NONE",
    impactos: tuple[str, str, str] = ("HIGH", "HIGH", "HIGH"),
    explotabilidad: float | None = 3.9,
    impacto: float | None = 5.9,
) -> dict:
    """Métrica CVSS v3.x: trae `exploitabilityScore` e `impactScore` junto a `cvssData`."""
    datos: dict = {
        "baseScore": puntuacion,
        "attackVector": vector,
        "attackComplexity": complejidad,
        "privilegesRequired": privilegios,
        "userInteraction": interaccion,
        "confidentialityImpact": impactos[0],
        "integrityImpact": impactos[1],
        "availabilityImpact": impactos[2],
    }
    if severidad != "":
        datos["baseSeverity"] = severidad or severidad_cvss(puntuacion)
    m: dict = {
        "source": "nvd@nist.gov" if tipo == "Primary" else "cna@example.com",
        "type": tipo,
        "cvssData": datos,
    }
    if explotabilidad is not None:
        m["exploitabilityScore"] = explotabilidad
    if impacto is not None:
        m["impactScore"] = impacto
    return m

def metrica_v4(
    puntuacion: float,
    vector: str = "NETWORK",
    privilegios: str = "NONE",
    tipo: str = "Secondary",
    complejidad: str = "LOW",
    interaccion: str = "NONE",
    impactos: tuple[str, str, str] = ("HIGH", "HIGH", "HIGH"),
) -> dict:
    """Métrica CVSS v4.0: el impacto va en las claves `vuln…` y no trae puntajes de
    explotabilidad ni de impacto. La interacción es NONE, PASSIVE o ACTIVE."""
    return {
        "source": "cna@example.com" if tipo == "Secondary" else "nvd@nist.gov",
        "type": tipo,
        "cvssData": {
            "baseScore": puntuacion,
            "baseSeverity": severidad_cvss(puntuacion),
            "attackVector": vector,
            "attackComplexity": complejidad,
            "privilegesRequired": privilegios,
            "userInteraction": interaccion,
            "vulnConfidentialityImpact": impactos[0],
            "vulnIntegrityImpact": impactos[1],
            "vulnAvailabilityImpact": impactos[2],
            "subConfidentialityImpact": "NONE",
        },
    }

def cve(
    id_: str,
    publicado: str = "2026-11-01T10:00:00.000",
    estado: str = "Analyzed",
    metricas: dict | None = None,
    cwes: list[str] | None = None,
    fuente: str | None = None,
    n_referencias: int = 0,
    kev: bool = False,
    modificado: str | None = None,
) -> dict:
    debilidades = (
        [{"source": "nvd@nist.gov", "type": "Primary", "description": [{"lang": "en", "value": c} for c in cwes]}]
        if cwes
        else []
    )
    objeto: dict = {
        "id": id_,
        "published": publicado,
        "vulnStatus": estado,
        "metrics": metricas or {},
        "weaknesses": debilidades,
        "references": [{"url": f"https://ejemplo.org/{i}"} for i in range(n_referencias)],
    }
    if fuente is not None:
        objeto["sourceIdentifier"] = fuente
    if modificado is not None:
        objeto["lastModified"] = modificado
    if kev:
        objeto["cisaExploitAdd"] = "2026-11-02"
    return objeto
