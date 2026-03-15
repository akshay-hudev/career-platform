import pytest


def test_create_user(client):
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


def test_get_user(client, test_user):
    user_id = test_user["id"]
    res = client.get(f"/api/v1/users/{user_id}")
    assert res.status_code == 200
    assert res.json()["id"] == user_id


def test_get_user_not_found(client):
    res = client.get("/api/v1/users/999999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
