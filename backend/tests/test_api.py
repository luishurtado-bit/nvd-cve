from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_salud() -> None:
    assert client.get("/api/salud").json() == {"estado": "ok"}
