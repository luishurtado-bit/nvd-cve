import logging
import threading
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from api import estado, registro
from api.esquemas import DescargaOut, EstadoDescarga, Periodo, ResumenDatos
from nvd.cliente import Avance, ClienteNVD, ErrorNVD
from nvd.descargar import descargar_y_guardar
from nvd.periodos import partir_periodo

log = logging.getLogger(__name__)

class DescargaEnCurso(Exception):
    """Ya hay una descarga corriendo: la NVD limita las solicitudes, así que van de a una."""

@dataclass
class _Descarga:
    id: str
    inicio: date
    fin: date
    n_tramos: int
    estado: EstadoDescarga = "en_curso"
    tramo: int = 1
    descargados: int = 0
    total_tramo: int = 0
    mensaje: str | None = None
    resumen: ResumenDatos | None = None
    error: str | None = None
    iniciada: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    terminada: datetime | None = None
    hilo: threading.Thread | None = None

    def como_salida(self) -> DescargaOut:
        return DescargaOut(
            id=self.id,
            estado=self.estado,
            periodo=Periodo(inicio=self.inicio, fin=self.fin),
            tramo=self.tramo,
            n_tramos=self.n_tramos,
            descargados=self.descargados,
            total_tramo=self.total_tramo,
            mensaje=self.mensaje,
            resumen=self.resumen,
            error=self.error,
            iniciada=self.iniciada,
            terminada=self.terminada,
        )

_descargas: dict[str, _Descarga] = {}
_candado = threading.Lock()

def _ejecutar(d: _Descarga, cliente: ClienteNVD) -> None:
    def al_avanzar(a: Avance) -> None:
        with _candado:
            d.tramo, d.n_tramos, d.descargados, d.total_tramo = a.tramo, a.n_tramos, a.descargados, a.total_tramo

    def al_avisar(mensaje: str) -> None:
        with _candado:
            d.mensaje = mensaje

    cliente.al_avanzar = al_avanzar
    cliente.progreso = al_avisar
    try:
        ruta = descargar_y_guardar(d.inicio, d.fin, cliente)
        resumen = estado.cargar(ruta).resumen
        registro.registrar(
            "descarga", {"inicio": d.inicio.isoformat(), "fin": d.fin.isoformat()}, resumen.model_dump(mode="json")
        )
        with _candado:
            d.resumen, d.estado, d.mensaje = resumen, "terminada", f"Listo: N = {resumen.N}"
    except ErrorNVD as e:
        with _candado:
            d.error, d.estado = f"La NVD no respondió bien: {e}", "fallida"
    except Exception as e:  # el hilo no debe morir en silencio
        log.exception("Falló la descarga %s", d.id)
        with _candado:
            d.error, d.estado = f"Error inesperado: {e}", "fallida"
    finally:
        with _candado:
            d.terminada = datetime.now(timezone.utc)

def iniciar(inicio: date, fin: date, cliente: ClienteNVD) -> DescargaOut:
    """Lanza la descarga en un hilo aparte y devuelve enseguida su estado inicial."""
    with _candado:
        if any(d.estado == "en_curso" for d in _descargas.values()):
            raise DescargaEnCurso("Ya hay una descarga en curso; espera a que termine")
        d = _Descarga(id=uuid.uuid4().hex, inicio=inicio, fin=fin, n_tramos=len(partir_periodo(inicio, fin)))
        d.mensaje = "Iniciando la descarga"
        _descargas[d.id] = d
        d.hilo = threading.Thread(target=_ejecutar, args=(d, cliente), name=f"descarga-{d.id[:8]}", daemon=True)
    d.hilo.start()
    return consultar(d.id)  # type: ignore[return-value]

def consultar(id_: str) -> DescargaOut | None:
    with _candado:
        d = _descargas.get(id_)
        return d.como_salida() if d is not None else None

def esperar(id_: str, segundos: float = 10) -> DescargaOut | None:
    """Espera a que termine (para pruebas y scripts)."""
    d = _descargas.get(id_)
    if d is not None and d.hilo is not None:
        d.hilo.join(segundos)
    return consultar(id_)

def reiniciar() -> None:
    with _candado:
        _descargas.clear()
