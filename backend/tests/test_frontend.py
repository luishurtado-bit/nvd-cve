"""B12: el backend sirve el frontend compilado (frontend/dist)."""

from pathlib import Path
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
import api.main as principal
from api.main import DIST_FRONTEND, montar_frontend

INDEX = "<!doctype html><title>NVD</title><div id=root></div>"

@pytest.fixture
def cliente(tmp_path: Path) -> TestClient:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(INDEX, encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    (dist / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    app = FastAPI()

    @app.get("/api/salud")
    def salud() -> dict[str, str]:
        return {"estado": "ok"}

    assert montar_frontend(app, dist)
    return TestClient(app)

def test_la_ruta_es_frontend_dist_y_no_frontend_underscore_dist() -> None:
    raiz = Path(principal.__file__).resolve().parents[2]  # la raíz del repositorio
    assert DIST_FRONTEND == raiz / "frontend" / "dist"
    assert (raiz / "frontend" / "package.json").is_file()  # frontend/ existe: la ruta apunta a su carpeta

def test_sin_compilar_no_monta_nada(tmp_path: Path) -> None:
    assert montar_frontend(FastAPI(), tmp_path / "no-existe") is False

def test_sirve_index_y_archivos(cliente: TestClient) -> None:
    raiz = cliente.get("/")
    assert raiz.status_code == 200 and raiz.text == INDEX
    assert cliente.get("/assets/app.js").text == "console.log(1)"
    assert cliente.get("/favicon.svg").status_code == 200

@pytest.mark.parametrize("ruta", ["/binomial", "/datos", "/eventos/", "/bayes?x=1", "/a/b/c"])
def test_al_recargar_una_ruta_del_front_devuelve_index(cliente: TestClient, ruta: str) -> None:
    r = cliente.get(ruta)
    assert r.status_code == 200 and r.text == INDEX

def test_un_archivo_que_no_existe_sigue_siendo_404(cliente: TestClient) -> None:
    assert cliente.get("/assets/otro.js").status_code == 404
    assert cliente.get("/logo.png").status_code == 404

def test_la_api_no_se_confunde_con_el_front(cliente: TestClient) -> None:
    assert cliente.get("/api/salud").json() == {"estado": "ok"}
    # Una ruta de la API que no existe es 404, no el index.html del front
    r = cliente.get("/api/no-existe")
    assert r.status_code == 404 and "<title>" not in r.text
    assert cliente.get("/api").status_code == 404
