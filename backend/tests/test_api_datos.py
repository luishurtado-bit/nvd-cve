from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

CAMPOS = {"periodo", "descargados", "rechazados", "sin_puntuacion", "N"}


def _revisar_resumen(cuerpo: dict) -> None:
    assert set(cuerpo) == CAMPOS
    assert set(cuerpo["periodo"]) == {"inicio", "fin"}
    # Ω = descargados − rechazados − sin puntuación
    assert cuerpo["N"] == (
        cuerpo["descargados"] - cuerpo["rechazados"] - cuerpo["sin_puntuacion"]
    )
    assert cuerpo["N"] == 1000  # N del ejemplo del informe


def test_resumen() -> None:
    r = client.get("/api/datos/resumen")
    assert r.status_code == 200
    _revisar_resumen(r.json())
    assert r.json()["periodo"] == {"inicio": None, "fin": None}


def test_cargar_por_fechas() -> None:
    r = client.post(
        "/api/datos/cargar", json={"inicio": "2026-01-01", "fin": "2026-03-31"}
    )
    assert r.status_code == 200
    _revisar_resumen(r.json())
    assert r.json()["periodo"] == {"inicio": "2026-01-01", "fin": "2026-03-31"}


def test_cargar_fin_antes_de_inicio() -> None:
    r = client.post(
        "/api/datos/cargar", json={"inicio": "2026-03-31", "fin": "2026-01-01"}
    )
    assert r.status_code == 422


def test_cargar_fecha_invalida() -> None:
    r = client.post("/api/datos/cargar", json={"inicio": "ayer", "fin": "2026-01-01"})
    assert r.status_code == 422


def test_cargar_archivo_csv() -> None:
    csv = b"cve_id,base_score\nCVE-2026-0001,9.8\n"
    r = client.post(
        "/api/datos/archivo", files={"archivo": ("cves.csv", csv, "text/csv")}
    )
    assert r.status_code == 200
    _revisar_resumen(r.json())


def test_cargar_archivo_que_no_es_csv() -> None:
    r = client.post(
        "/api/datos/archivo", files={"archivo": ("cves.txt", b"hola", "text/plain")}
    )
    assert r.status_code == 400


def test_cargar_sin_archivo() -> None:
    assert client.post("/api/datos/archivo").status_code == 422
