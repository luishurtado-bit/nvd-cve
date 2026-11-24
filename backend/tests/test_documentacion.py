"""B28: la documentación no se queda atrás del código (contrato, diccionario y enlaces del README)."""

import re
from pathlib import Path
import pytest
from api.main import app
from nvd.depuracion import DOMINIOS
from nvd.extraccion import COLUMNAS

RAIZ = Path(__file__).resolve().parents[2]
CONTRATO = RAIZ / "docs" / "contrato-api.md"
DICCIONARIO = RAIZ / "docs" / "diccionario-de-datos.md"
README = RAIZ / "README.md"

def _endpoints() -> list[str]:
    return sorted(f"{m.upper()} {ruta}" for ruta, ops in app.openapi()["paths"].items() for m in ops)

@pytest.mark.parametrize("endpoint", _endpoints())
def test_el_contrato_documenta_cada_endpoint(endpoint: str) -> None:
    assert f"`{endpoint}`" in CONTRATO.read_text(encoding="utf-8"), (
        f"{endpoint} no está en docs/contrato-api.md: agregarlo a la tabla de su sección"
    )

def test_el_contrato_no_documenta_rutas_que_ya_no_existen() -> None:
    documentadas = set(re.findall(r"`((?:GET|POST|PUT|PATCH|DELETE) /api/[^`]*)`", CONTRATO.read_text(encoding="utf-8")))
    assert documentadas == set(_endpoints())

def test_el_diccionario_tiene_las_20_variables_en_orden() -> None:
    texto = DICCIONARIO.read_text(encoding="utf-8")
    filas = re.findall(r"^\| (\d+) \| `(\w+)` \|", texto, flags=re.MULTILINE)
    assert [(int(n), c) for n, c in filas] == list(enumerate(COLUMNAS, start=1))

def test_el_diccionario_menciona_los_valores_de_cada_dominio() -> None:
    texto = DICCIONARIO.read_text(encoding="utf-8")
    for columna, valores in DOMINIOS.items():
        fila = next(f for f in texto.splitlines() if f.startswith("|") and f"`{columna}`" in f)
        faltan = [v for v in valores if f"`{v}`" not in fila]
        assert not faltan, f"{columna}: el diccionario no menciona {faltan}"

def test_el_diccionario_explica_los_siete_pasos_de_la_limpieza() -> None:
    texto = DICCIONARIO.read_text(encoding="utf-8")
    for paso in ("4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"):
        assert f"| {paso} " in texto

def test_los_enlaces_del_readme_y_de_docs_existen() -> None:
    for documento in (README, CONTRATO, DICCIONARIO):
        for destino in re.findall(r"\]\(([^)\s]+)\)", documento.read_text(encoding="utf-8")):
            if destino.startswith(("http", "#", "mailto:")):
                continue
            ruta = (documento.parent / destino.split("#")[0]).resolve()
            assert ruta.exists(), f"{documento.name}: el enlace {destino} no existe"
