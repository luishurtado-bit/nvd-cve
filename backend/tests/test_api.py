from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_salud() -> None:
    assert client.get("/api/salud").json() == {"estado": "ok"}


def test_binomial() -> None:
    r = client.post(
        "/api/binomial",
        json={"n": 20, "p": 0.1, "k": 3}
    )

    assert r.status_code == 200
    assert abs(r.json()["prob_al_menos_k"] - 0.3231) < 1e-4