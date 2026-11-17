from pathlib import Path
import pytest
import config

def test_sin_clave(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NVD_API_KEY", raising=False)
    assert config.nvd_api_key() is None

@pytest.mark.parametrize("valor", ["", "   ", "pega_aqui_tu_clave"])
def test_clave_vacia_o_de_ejemplo(monkeypatch: pytest.MonkeyPatch, valor: str) -> None:
    monkeypatch.setenv("NVD_API_KEY", valor)
    assert config.nvd_api_key() is None

def test_con_clave(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NVD_API_KEY", "  abc-123  ")
    assert config.nvd_api_key() == "abc-123"

def test_dir_datos_por_defecto(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DIR_DATOS", raising=False)
    ruta = config.dir_datos()
    assert ruta == config.RAIZ / "data"
    # La raíz es la carpeta del repositorio, la que contiene backend/
    assert (config.RAIZ / "backend" / "config.py").is_file()

def test_dir_datos_configurable(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("DIR_DATOS", str(tmp_path))
    assert config.dir_datos() == tmp_path
