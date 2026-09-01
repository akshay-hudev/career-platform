# Security Notes — Resolved & Deferred

**Status as of 2026-09-02:** The BLOCKER and HIGH/MEDIUM items below have all
been resolved. The application is now safe to deploy publicly with the env vars
documented in `README.md` / `deploy.md`. All 56 backend tests pass.

Each item lists severity, the resolution that was applied, and any cosmetic
follow-up that may still be worth doing later.

---

## 1. Broken object-level authorization (IDOR) — ✅ RESOLVED

All data routes now derive the owner from the JWT (`current_user.id`) and verify
ownership on resource-id routes. The client can no longer reach another user's
data by changing a `user_id` query param or a path id — the route either
ignores the parameter entirely, or returns `404` on ownership mismatch (no
existence leak).

| Route | Resolution |
|-------|-----------|
| `GET /resume/{user_id}/list` | Renamed to `GET /resume/list`; `Depends(get_current_user)`; returns caller's resumes only. |
| `GET /resume/{resume_id}` | `_get_owned_resume(...)` helper; `404` on owner mismatch. |
| `DELETE /resume/{resume_id}` | Same helper; `404` on owner mismatch. |
| `POST /jobs/save?user_id=` | `user_id` removed; derived from JWT. |
| `GET /jobs/saved/{user_id}` | Renamed to `GET /jobs/saved`; optional `?status=` filter. |
| `PATCH /jobs/saved/{job_id}/status` | `_get_owned_saved_job(...)` helper; `404` on owner mismatch. |
| `DELETE /jobs/saved/{job_id}` | Same helper; `404` on owner mismatch. |
| `POST /match/score` | `Depends(get_current_user)`; `resume_id` ownership verified. |
| `POST /match/advice` | Same. |
| `POST /interview/questions` | Same. |
| `POST /interview/evaluate` | Now `Depends(get_current_user)` (was unauthenticated — anonymous Gemini abuse). |
| `POST /agent/run` | Now `Depends(get_current_user)`. |

A regression test, `test_save_job_other_user_isolated` in
`backend/tests/test_jobs.py`, inserts a `SavedJob` owned by another user and
asserts the caller cannot list, mutate, or delete it.

---

## 2. Unauthenticated user creation + enumeration — ✅ RESOLVED

- `POST /api/v1/users/` is now `Depends(get_current_user)` (so a user can still
  be pre-created for tests, but anonymous callers can no longer enumerate).
- `GET /api/v1/users/{user_id}` has been **removed**. The replacement is
  `GET /api/v1/users/me` (self-only, auth-required).
- The frontend now calls `getCurrentUser()` (→ `/users/me`) instead of
  `getUser(userId)`.

---

## 3. Default `SECRET_KEY` allows JWT forgery — ✅ RESOLVED

`backend/config.py` now defines a set of insecure placeholder values
(`_INSECURE_SECRET_KEYS`) and exposes `Settings.assert_production_safe()`.
The application lifespan (`backend/main.py`) calls this on startup; if
`DEBUG` is `False` and `SECRET_KEY` is a placeholder, the process **refuses
to boot**. Generate a strong key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Set the result in the Railway service as `SECRET_KEY` (and in `.env` for local
development).

---

## 4. CORS allows all origins, ignores config — ✅ RESOLVED

`backend/config.py::Settings.parse_cors_origins()` accepts either a JSON list
or a comma-separated string from `CORS_ORIGINS` and returns a parsed list.
`backend/main.py` no longer hardcodes `allow_origins=["*"]` — it uses the
parsed list. `assert_production_safe()` also rejects `*` or empty origins
when `DEBUG=False`.

In production, set `CORS_ORIGINS` to the exact Vercel frontend origin, e.g.
`CORS_ORIGINS=https://career-platform.vercel.app`.

---

## 5. Frontend never validates the stored token — ✅ RESOLVED

`frontend/src/context/UserContext.jsx` now calls `getCurrentUser()` on mount
when a token is present in localStorage. On failure the session is cleared and
the user is bounced to the login screen; on success the cached user object is
refreshed from the server. This is wired up to the new `GET /users/me`
endpoint from #2.

---

## 6. Password hashing hardening — 🟢 LOW (cosmetic remaining)

**Resolved:** `passlib` removed; `bcrypt` is used directly, pinned to
`bcrypt>=4.0.1`, and passwords are truncated to 72 bytes before hashing.

**Remaining (cosmetic):** the `password` field in
`backend/schemas/schemas.py` still has no `max_length`, so a password over
72 bytes is silently truncated to 72 rather than rejected. Add
`max_length=72` (or a validator) to reject them explicitly if desired.

---

## 7. Redundant `user_id` on resume upload — ✅ RESOLVED

`frontend/src/api/client.js::uploadResume(file)` no longer takes a `user_id`
arg; the backend already derives the owner from the JWT.

---

## Deployment posture

With items 1–5 and 7 resolved and #6 in a known cosmetic state, the API is
safe to expose publicly **as long as the deploy environment satisfies**:

- `DEBUG=false`
- `SECRET_KEY` is a freshly generated `secrets.token_urlsafe(48)` value
- `CORS_ORIGINS` is the exact Vercel origin (no `*`, no empty)
- `DATABASE_URL` is a managed Postgres (Railway Postgres or equivalent)
- Migrations are applied via `alembic upgrade head` (no
  `Base.metadata.create_all` in the app lifespan — see `backend/main.py`)

See `deploy.md` for the Railway + Vercel step-by-step.
