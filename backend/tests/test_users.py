def test_create_user(client):
    """POST /users/ now requires auth (conftest overrides the auth dep)."""
    res = client.post("/api/v1/users/", json={"email": "akshay@test.com", "name": "Akshay"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "akshay@test.com"
    assert data["name"] == "Akshay"
    assert "id" in data
    assert "created_at" in data


def test_create_user_idempotent(client):
    """Creating a user with same email twice returns the same user."""
    payload = {"email": "idempotent@test.com", "name": "User A"}
    res1 = client.post("/api/v1/users/", json=payload)
    res2 = client.post("/api/v1/users/", json=payload)
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["id"] == res2.json()["id"]


def test_get_me_returns_current_user(client, test_user):
    """GET /users/me replaces the old unauthenticated GET /users/{id}."""
    res = client.get("/api/v1/users/me")
    assert res.status_code == 200
    assert res.json()["id"] == test_user["id"]
    assert res.json()["email"] == test_user["email"]


def test_get_user_by_id_removed(client):
    """The unauthenticated GET /users/{id} (PII leak) is intentionally removed."""
    res = client.get("/api/v1/users/1")
    assert res.status_code == 404


def test_get_me_unauthenticated_returns_401():
    """Without the auth override, /users/me must reject the request."""
    from fastapi.testclient import TestClient
    from backend.main import app

    with TestClient(app) as c:
        res = c.get("/api/v1/users/me")
    assert res.status_code == 401