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


def test_save_job(client):
    # user_id is now taken from the JWT (auth is overridden in conftest).
    res = client.post(
        "/api/v1/jobs/save",
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


def test_save_job_duplicate_rejected(client):
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
    r1 = client.post("/api/v1/jobs/save", json=payload)
    r2 = client.post("/api/v1/jobs/save", json=payload)
    assert r1.status_code == 200
    assert r2.status_code == 409


def test_get_saved_jobs(client):
    res = client.get("/api/v1/jobs/saved")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_get_saved_jobs_with_status_filter(client):
    payload = {
        "job_external_id": "filter-test-job",
        "title": "Data Engineer",
        "company": "Cred",
        "location": "Bengaluru",
        "description": "Spark role",
        "salary_min": None,
        "salary_max": None,
        "job_url": None,
        "match_score": None,
    }
    client.post("/api/v1/jobs/save", json=payload)
    res = client.get("/api/v1/jobs/saved", params={"status": "saved"})
    assert res.status_code == 200
    data = res.json()
    assert any(j["job_external_id"] == "filter-test-job" for j in data)


def test_update_job_status(client):
    save_res = client.post(
        "/api/v1/jobs/save",
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

    update_res = client.patch(
        f"/api/v1/jobs/saved/{job_id}/status",
        json={"status": "applied", "notes": "Applied via LinkedIn"},
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["status"] == "applied"
    assert data["notes"] == "Applied via LinkedIn"
    assert data["applied_at"] is not None


def test_delete_saved_job(client):
    save_res = client.post(
        "/api/v1/jobs/save",
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

    # Verify it's gone — saved list should not contain it.
    jobs = client.get("/api/v1/jobs/saved").json()
    assert all(j["id"] != job_id for j in jobs)


def test_save_job_other_user_isolated(client):
    """Saved jobs must be scoped to the caller — querying /jobs/saved must not
    return jobs owned by other users, and attempting to mutate another user's
    saved job must 404."""
    # Create another user directly via the auth-bypassed test client.
    from backend.tests.conftest import TestingSessionLocal
    from backend.models.models import User

    db = TestingSessionLocal()
    try:
        other = User(email="other@example.com", name="Other")
        db.add(other)
        db.commit()
        db.refresh(other)
        other_id = other.id
    finally:
        db.close()

    # Save a job as the "other" user by hitting the test DB directly (the
    # /jobs/save endpoint derives user_id from the JWT and we cannot impersonate).
    from backend.models.models import SavedJob
    from datetime import datetime, timezone

    db = TestingSessionLocal()
    try:
        sj = SavedJob(
            user_id=other_id,
            job_external_id="other-user-job",
            title="Hidden Job",
            company="Stealth Co",
            location="Remote",
            description="Should not be visible",
            saved_at=datetime.now(timezone.utc),
        )
        db.add(sj)
        db.commit()
        db.refresh(sj)
        other_job_id = sj.id
    finally:
        db.close()

    # The caller must NOT see this job in their saved list.
    jobs = client.get("/api/v1/jobs/saved").json()
    assert all(j["id"] != other_job_id for j in jobs)

    # The caller must NOT be able to mutate or delete it.
    r1 = client.patch(
        f"/api/v1/jobs/saved/{other_job_id}/status",
        json={"status": "applied"},
    )
    assert r1.status_code == 404
    r2 = client.delete(f"/api/v1/jobs/saved/{other_job_id}")
    assert r2.status_code == 404