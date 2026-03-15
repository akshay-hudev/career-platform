import pytest
import unittest.mock as mock


def test_search_jobs_returns_results(client):
    """Job search should return results (uses mock data without API keys)."""
    res = client.post("/api/v1/jobs/search", json={
        "query": "Python Backend Engineer",
        "location": "Bengaluru",
        "results": 5,
    })
    assert res.status_code == 200
    data = res.json()
    assert "jobs" in data
    assert "total" in data
    assert data["query"] == "Python Backend Engineer"
    assert isinstance(data["jobs"], list)


def test_search_jobs_with_empty_query(client):
    res = client.post("/api/v1/jobs/search", json={
        "query": "",
        "location": "India",
        "results": 5,
    })
    # Empty query still hits the API/mock — expect 200
    assert res.status_code == 200


def test_save_job(client, test_user):
    user_id = test_user["id"]
    res = client.post(
        f"/api/v1/jobs/save?user_id={user_id}",
        json={
            "job_external_id": "test-job-001",
            "title": "Backend Engineer",
            "company": "Razorpay",
            "location": "Bengaluru",
            "description": "Python FastAPI backend role",
            "salary_min": 1200000,
            "salary_max": 1800000,
            "job_url": "https://example.com/job/1",
            "match_score": 78.5,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Backend Engineer"
    assert data["status"] == "saved"
    assert data["match_score"] == 78.5


def test_save_job_duplicate_rejected(client, test_user):
    user_id = test_user["id"]
    payload = {
        "job_external_id": "duplicate-job-001",
        "title": "Frontend Developer",
        "company": "Swiggy",
        "location": "Bengaluru",
        "description": "React developer role",
        "salary_min": None,
        "salary_max": None,
        "job_url": None,
        "match_score": None,
    }
    r1 = client.post(f"/api/v1/jobs/save?user_id={user_id}", json=payload)
    r2 = client.post(f"/api/v1/jobs/save?user_id={user_id}", json=payload)
    assert r1.status_code == 200
    assert r2.status_code == 409


def test_get_saved_jobs(client, test_user):
    user_id = test_user["id"]
    res = client.get(f"/api/v1/jobs/saved/{user_id}")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_update_job_status(client, test_user):
    user_id = test_user["id"]

    # Save a job first
    save_res = client.post(
        f"/api/v1/jobs/save?user_id={user_id}",
        json={
            "job_external_id": "status-test-job",
            "title": "ML Engineer",
            "company": "PhonePe",
            "location": "Bengaluru",
            "description": "Machine learning role",
            "salary_min": None,
            "salary_max": None,
            "job_url": None,
            "match_score": None,
        },
    )
    job_id = save_res.json()["id"]

    # Update to applied
    update_res = client.patch(
        f"/api/v1/jobs/saved/{job_id}/status",
        json={"status": "applied", "notes": "Applied via LinkedIn"},
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["status"] == "applied"
    assert data["notes"] == "Applied via LinkedIn"
    assert data["applied_at"] is not None


def test_delete_saved_job(client, test_user):
    user_id = test_user["id"]

    save_res = client.post(
        f"/api/v1/jobs/save?user_id={user_id}",
        json={
            "job_external_id": "delete-test-job",
            "title": "DevOps Engineer",
            "company": "Zepto",
            "location": "Mumbai",
            "description": "DevOps role",
            "salary_min": None,
            "salary_max": None,
            "job_url": None,
            "match_score": None,
        },
    )
    job_id = save_res.json()["id"]

    del_res = client.delete(f"/api/v1/jobs/saved/{job_id}")
    assert del_res.status_code == 200

    # Verify it's gone — check saved list doesn't contain it
    jobs = client.get(f"/api/v1/jobs/saved/{user_id}").json()
    assert all(j["id"] != job_id for j in jobs)
