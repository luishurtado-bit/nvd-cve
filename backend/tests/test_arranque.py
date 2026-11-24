"""Al arrancar el backend: la última descarga de data/, la demo de data/demo/ o los simulados."""

from datetime import date
from pathlib import Path
from fastapi.testclient import TestClient
import config
from api.main import app
from nvd import almacen
from tests.ejemplos_nvd import cve, metrica

PERIODO = {"inicio": "2026-11-01", "fin": "2026-11-02"}

# 4 descargados: 1 rechazado y 1 sin puntuación, N = 2
CVES = [
    cve("CVE-1", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(9.8)]}),
    cve("CVE-2", "2026-11-02T11:00:00.000", metricas={"cvssMetricV31": [metrica(5.5, "LOCAL", "LOW")]}),
    cve("CVE-3", "2026-11-02T12:00:00.000", estado="Rejected"),
    cve("CVE-4", "2026-11-02T13:00:00.000", estado="Awaiting Analysis"),
]

def _guardar_en(carpeta: Path, cves: list[dict]) -> None:
    almacen.guardar_descarga(cves, date(2026, 11, 1), date(2026, 11, 2), carpeta=carpeta)

def _danado(carpeta: Path) -> None:
    carpeta.mkdir(parents=True, exist_ok=True)
    (carpeta / "cves_danado.csv").write_text("no,es,el,formato\n1,2,3,4\n", encoding="utf-8")
    (carpeta / "cves_danado.json").write_text("{}", encoding="utf-8")

def _arrancar() -> dict:
    # El context manager ejecuta el ciclo de vida (como uvicorn al arrancar)
    with TestClient(app) as arrancado:
        return arrancado.get("/api/datos/resumen").json()

def test_la_demo_esta_dentro_de_la_carpeta_de_datos() -> None:
    assert config.dir_demo() == config.dir_datos() / "demo"

def test_sin_nada_usa_los_simulados() -> None:
    assert _arrancar()["origen"] == "simulado"

def test_sin_descargas_usa_la_demo() -> None:
    _guardar_en(config.dir_demo(), CVES)
    assert almacen.ultimo(config.dir_datos()) is None  # la carpeta de la demo no cuenta como descarga
    c = _arrancar()
    assert (c["origen"], c["N"], c["periodo"]) == ("api", 2, PERIODO)
    assert c["fecha_consulta"] is not None  # la demo conserva cuándo se consultó la NVD

def test_una_descarga_propia_tiene_prioridad_sobre_la_demo() -> None:
    _guardar_en(config.dir_demo(), CVES)  # N = 2
    _guardar_en(config.dir_datos(), CVES[:1])  # N = 1
    assert _arrancar()["N"] == 1

def test_si_la_descarga_propia_esta_danada_se_usa_la_demo() -> None:
    _guardar_en(config.dir_demo(), CVES)
    _danado(config.dir_datos())
    assert _arrancar()["N"] == 2

def test_si_la_demo_esta_danada_usa_los_simulados() -> None:
    _danado(config.dir_demo())
    assert _arrancar()["origen"] == "simulado"

def test_una_carpeta_de_demo_vacia_usa_los_simulados() -> None:
    config.dir_demo().mkdir(parents=True)
    assert _arrancar()["origen"] == "simulado"
