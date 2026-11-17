import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol
import requests
from nvd.periodos import parametros_tramo, partir_periodo

URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
RESULTADOS_POR_PAGINA = 2000  # máximo que permite la API
# Límite de la NVD: 5 solicitudes cada 30 s sin clave y 50 con clave
ESPERA_SIN_CLAVE = 6.0
ESPERA_CON_CLAVE = 0.6
# 403 y 429: límite superado (o clave inválida); 5xx: servidor caído o saturado
ESTADOS_REINTENTABLES = {403, 429, 500, 502, 503, 504}
MAX_REINTENTOS = 5
TIMEOUT = 60

class ErrorNVD(Exception):
    """La API de la NVD no respondió bien después de los reintentos."""

@dataclass(frozen=True)
class Avance:
    tramo: int  # 1, 2, …
    n_tramos: int
    descargados: int  # acumulado en todo el periodo
    total_tramo: int  # totalResults del tramo actual

class Respuesta(Protocol):
    status_code: int
    headers: Any
    def json(self) -> Any: ...

class Sesion(Protocol):
    def get(self, url: str, *, params: dict, headers: dict, timeout: float) -> Respuesta: ...

class ClienteNVD:
    def __init__(
        self,
        api_key: str | None = None,
        sesion: Sesion | None = None,
        dormir: Callable[[float], None] = time.sleep,
        max_reintentos: int = MAX_REINTENTOS,
        progreso: Callable[[str], None] | None = None,
        al_avanzar: Callable[[Avance], None] | None = None,
    ) -> None:
        self.api_key = api_key
        self.sesion = sesion if sesion is not None else requests.Session()
        self.dormir = dormir
        self.max_reintentos = max_reintentos
        self.progreso = progreso
        self.al_avanzar = al_avanzar
        # Posición dentro de descargar(): tramo actual y CVE de tramos anteriores
        self._tramo = (1, 1)
        self._previos = 0
        self.espera = ESPERA_CON_CLAVE if api_key else ESPERA_SIN_CLAVE
        self.solicitudes = 0

    def _avisar(self, mensaje: str) -> None:
        if self.progreso is not None:
            self.progreso(mensaje)

    def _get(self, params: dict) -> dict:
        """Una solicitud respetando el límite, con reintentos y espera creciente."""
        headers = {"apiKey": self.api_key} if self.api_key else {}
        ultimo_error = ""
        for intento in range(self.max_reintentos + 1):
            if intento > 0:
                # 2·espera, 4·espera, 8·espera, …
                self.dormir(self.espera * 2**intento)
            elif self.solicitudes > 0:
                self.dormir(self.espera)
            self.solicitudes += 1
            try:
                r = self.sesion.get(URL, params=params, headers=headers, timeout=TIMEOUT)
            except requests.RequestException as e:
                ultimo_error = f"error de conexión: {e}"
                self._avisar(f"Reintento {intento + 1}: {ultimo_error}")
                continue
            if r.status_code == 200:
                try:
                    return r.json()
                except ValueError:
                    ultimo_error = "respuesta que no es JSON"
                    continue
            mensaje = r.headers.get("message", "") if r.headers else ""
            ultimo_error = f"HTTP {r.status_code}" + (f" ({mensaje})" if mensaje else "")
            if r.status_code not in ESTADOS_REINTENTABLES:
                raise ErrorNVD(f"La NVD rechazó la consulta: {ultimo_error}")
            self._avisar(f"Reintento {intento + 1}: {ultimo_error}")
        raise ErrorNVD(
            f"La NVD no respondió después de {self.max_reintentos} reintentos: {ultimo_error}"
        )

    def descargar_tramo(self, desde: date, hasta: date) -> list[dict]:
        """Todos los CVE publicados en un tramo de a lo sumo 120 días, página por página."""
        cves: list[dict] = []
        inicio = 0
        while True:
            params = {
                **parametros_tramo(desde, hasta),
                "resultsPerPage": RESULTADOS_POR_PAGINA,
                "startIndex": inicio,
            }
            datos = self._get(params)
            pagina = [v["cve"] for v in datos.get("vulnerabilities", [])]
            cves.extend(pagina)
            total = int(datos.get("totalResults", 0))
            self._avisar(f"{desde} a {hasta}: {len(cves)} de {total} CVE")
            if self.al_avanzar is not None:
                tramo, n_tramos = self._tramo
                self.al_avanzar(Avance(tramo, n_tramos, self._previos + len(cves), total))
            inicio += len(pagina)
            # Sin más resultados o página vacía (evita un ciclo infinito)
            if inicio >= total or not pagina:
                return cves

    def descargar(self, inicio: date, fin: date) -> list[dict]:
        """Todos los CVE publicados entre inicio y fin (ambos incluidos)."""
        cves: list[dict] = []
        tramos = partir_periodo(inicio, fin)
        for i, (desde, hasta) in enumerate(tramos, start=1):
            self._avisar(f"Tramo {i} de {len(tramos)}: {desde} a {hasta}")
            self._tramo, self._previos = (i, len(tramos)), len(cves)
            cves.extend(self.descargar_tramo(desde, hasta))
        return cves
