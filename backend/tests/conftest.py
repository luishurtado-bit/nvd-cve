from collections.abc import Iterator
from pathlib import Path
import pytest
from api import descargas, estado
from api.main import app
from api.rutas.datos import obtener_cliente
from nvd.cliente import ClienteNVD

class SesionSinRed:
    """Falla si una prueba intenta llamar a la NVD real sin darle una sesión falsa."""

    def get(self, *args: object, **kwargs: object) -> None:
        raise AssertionError("Una prueba intentó llamar a la API real de la NVD")

@pytest.fixture(autouse=True)
def aislar(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Iterator[None]:
    """Cada prueba: datos en una carpeta temporal, sin red y con los datos simulados."""
    monkeypatch.setenv("DIR_DATOS", str(tmp_path / "data"))
    monkeypatch.delenv("NVD_API_KEY", raising=False)
    estado.reiniciar()
    descargas.reiniciar()
    app.dependency_overrides[obtener_cliente] = lambda: ClienteNVD(
        sesion=SesionSinRed(), dormir=lambda _: None
    )
    yield
    app.dependency_overrides.clear()
    estado.reiniciar()
