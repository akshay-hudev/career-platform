# CareerAI — AI-Powered Job Search Platform

A full-stack career assistant: upload a PDF resume, search jobs (Adzuna), rank
resume-to-job matches with TF-IDF cosine similarity, and get Google Gemini–powered
career advice and mock-interview coaching — all behind JWT user authentication.

FastAPI backend + React 18 (Vite) frontend, PostgreSQL, and Redis.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS (react-router v6, axios, react-query) |
| Backend | FastAPI + Python 3.11 (Uvicorn) |
| Auth | JWT (python-jose, HS256) + bcrypt password hashing |
| Database | PostgreSQL 16 + SQLAlchemy ORM (psycopg v3) + Alembic |
| Cache | Redis 7 (job-search results, 1 hr TTL; degrades gracefully if down) |
| Resume parsing | pdfplumber + regex/keyword heuristics, fixed-rubric ATS score |
| Matching | scikit-learn TF-IDF + NumPy cosine similarity |
| AI | Google Gemini via `google-generativeai` (configurable `GEMINI_MODEL`, default 2.5 Flash) |
| Agent | LangGraph pipeline (parse → search → rank → advice) |
| Job data | Adzuna API over httpx (mock fallback when keys are absent) |
| Deployment | Docker (Compose runs Postgres + Redis + backend); Railway (backend) + Vercel (frontend) in prod |

> **Note:** resume parsing and matching are **not** ML/NLP embeddings — there is no
> spaCy and no sentence-transformers in this project. Parsing is `pdfplumber` text
> extraction plus regex/keyword heuristics against a hardcoded ~50-term skill list;
> matching is classic TF-IDF cosine similarity.

## Architecture

```
React SPA (Vite :5173)                            Vercel static
   │  /api/v1/*   (VITE_API_URL → Railway backend in prod; Vite proxy in dev)
   ▼
FastAPI (:8000)        — JWT auth on protected routes
   ├── /auth        register · login · me
   ├── /users       create (auth) · me
   ├── /resume      upload (pdfplumber parse + ATS score) · list · get · delete
   ├── /jobs        search (Adzuna + Redis cache, mock fallback) · save · saved · status · delete
   ├── /match       score (TF-IDF cosine + skill gaps) · advice (Gemini)
   ├── /interview   questions · evaluate   (Gemini, stateless)
   └── /agent       run   (LangGraph: parse → search → rank → advice)
   │
   ├── PostgreSQL   (users, resumes, saved_jobs, job_searches)
   └── Redis        (job-search cache, 1 hr TTL)

External services: Adzuna API (job listings) · Google Gemini (advice, interview, summaries)
```

## Features

- **Authentication (JWT)** — register/login with bcrypt-hashed passwords; 7-day
  HS256 tokens. Frontend has a combined login/register page, `UserContext`,
  `ProtectedRoute` gating, and an axios interceptor that auto-logs-out on `401`.
- **Resume upload & parsing** — PDF text extraction with pdfplumber, then
  regex/keyword heuristics for skills, education, companies, and years of
  experience, plus a fixed-rubric ATS score. List / get / delete stored resumes.
- **Job search** — real Adzuna REST calls over httpx (India by default), cached in
  Redis (1 hr TTL). Falls back to built-in mock jobs when Adzuna keys are missing
  or a request fails.
- **Resume ↔ job matching** — scikit-learn TF-IDF vectors + NumPy cosine
  similarity (scaled 0–100), plus keyword-based matched-skills and skill-gap
  analysis against a hardcoded tech-skill list.
- **AI career advice (Gemini)** — improvement suggestions, a cover-letter draft,
  and interview tips per resume/job pair, plus a 3-sentence resume summary.
- **Mock interview (Gemini)** — generates tailored questions
  (technical / behavioral / situational / hr) and evaluates answers (score,
  strengths, improvements, a sample better answer, and a verdict). Stateless — not
  persisted to the database.
- **Saved-jobs board** — track applications across 5 statuses
  (`saved`, `applied`, `interviewing`, `rejected`, `offered`): save, list (filter
  by status), update status, delete.
- **One-shot agent** — `POST /api/v1/agent/run` runs the whole LangGraph pipeline
  from an uploaded PDF: parse → search → rank → advice.
- **Dashboard** — application pipeline and resume overview.

## Quick Start

### 1. Clone and configure
```bash
git clone <your-repo>
cd Capabl
cp .env.example .env
# Edit .env — at minimum set GEMINI_API_KEY for real AI output (see Configuration)
```

### 2. Start infrastructure (Postgres + Redis)
```bash
docker-compose up postgres redis -d
```

### 3. Run the backend
```bash
# Run from the PROJECT ROOT — the app imports `backend.*`, so it must not be run from inside backend/
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```
API is now at http://localhost:8000 (docs at http://localhost:8000/docs).

### 4. Run the frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

> **Docker note:** `docker-compose.yml` defines **Postgres, Redis, and the backend**
> — there is **no** frontend service. `docker-compose up --build` runs the API on
> :8000; you still start the frontend with `npm run dev`.

## Configuration

Backend settings are read from `.env` (see `.env.example`). Env vars and defaults:

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | *(empty)* | **Required for real AI output** (advice, interview, summaries). Without it, those endpoints return canned fallback content instead of failing. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name. |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | *(empty)* | Optional. Without them, job search serves realistic **mock** Indian job data. |
| `SECRET_KEY` | `change-this-in-production` | Signs JWTs. **Must be overridden in production** — generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. The app refuses to boot when `DEBUG=false` and this is a placeholder. |
| `DATABASE_URL` | `postgresql+psycopg://postgres:password@localhost:5432/careerdb` | Postgres URL (psycopg v3). A bare `postgres://` / `postgresql://` is auto-rewritten to `postgresql+psycopg://`. |
| `REDIS_URL` | `redis://localhost:6379/0` | Job-search cache. If Redis is unreachable, caching no-ops (no crash). |
| `DEBUG` | `True` | Debug flag. **Must be `false` in production** (enables the secret-key/CORS safety checks). |
| `CORS_ORIGINS` | `["*"]` | Allowed origins. Accepts a JSON list (`["https://a.com","https://b.com"]`) or a comma-separated string (`https://a.com,https://b.com`). In production set this to the exact Vercel frontend origin — no `*`, no empty list. |
| `VITE_API_URL` *(frontend)* | *(empty in dev)* | Production API base; used as `${VITE_API_URL}/api/v1`. In dev it's empty and the Vite proxy forwards `/api` → `:8000`. **In prod set this to the Railway backend URL, e.g. `https://career-platform.up.railway.app` (no trailing slash).** |

### API keys

| Service | Required | Free tier | Link |
|---------|----------|-----------|------|
| Gemini | For real AI output | Yes (generous) | https://aistudio.google.com/app/apikey |
| Adzuna | No (mock fallback) | Yes (500 calls/day) | https://developer.adzuna.com/ |

## API Endpoints

All under prefix `/api/v1`. Routes marked 🔒 require a JWT (`Authorization: Bearer <token>`).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | Create account, returns JWT + user |
| POST | `/auth/login` | Authenticate, returns JWT + user |
| GET | `/auth/me` 🔒 | Current authenticated user |
| POST | `/users/` 🔒 | Idempotent, passwordless user create (returns existing on duplicate email) — auth required |
| GET | `/users/me` 🔒 | Self — returns the authenticated user's profile |
| POST | `/resume/upload` 🔒 | Upload & parse a PDF, compute ATS score (owner derived from JWT) |
| GET | `/resume/list` 🔒 | List the caller's resumes |
| GET | `/resume/{resume_id}` 🔒 | Get one of the caller's resumes (404 if not owner) |
| DELETE | `/resume/{resume_id}` 🔒 | Delete one of the caller's resumes (404 if not owner) |
| POST | `/jobs/search` | Adzuna search (optional semantic rank via `?resume_id`) |
| POST | `/jobs/save` 🔒 | Save a job to the caller's board |
| GET | `/jobs/saved` 🔒 | List the caller's saved jobs (optional `?status`) |
| PATCH | `/jobs/saved/{job_id}/status` 🔒 | Update application status (404 if not owner) |
| DELETE | `/jobs/saved/{job_id}` 🔒 | Remove a saved job (404 if not owner) |
| POST | `/match/score` 🔒 | Score the caller's resume against job descriptions (cosine + skill gaps) |
| POST | `/match/advice` 🔒 | Full Gemini advice (skill gaps, cover letter, interview tips) |
| POST | `/interview/questions` 🔒 | Generate interview questions by type |
| POST | `/interview/evaluate` 🔒 | Evaluate a mock-interview answer |
| POST | `/agent/run` 🔒 | One-shot LangGraph pipeline from an uploaded PDF |
| GET | `/` , `/health` | Liveness checks (inline in `main.py`, no prefix) |

## Data Model

Four tables (SQLAlchemy ORM, `backend/models/models.py`):

- **users** — `id`, `email` (unique), `name`, `hashed_password` (nullable — allows
  passwordless rows from `POST /users/`), `created_at`.
- **resumes** — `user_id`, `filename`, `raw_text`, `parsed_data` (JSON),
  `embedding_json` (JSON TF-IDF vector), `ats_score`, `uploaded_at`.
- **saved_jobs** — denormalized job data + `match_score`, `status`
  (`JobStatus` enum: `saved` / `applied` / `interviewing` / `rejected` /
  `offered`), `notes`, `applied_at`.
- **job_searches** — search-history log (`query`, `location`, `results_count`).

> There is **no** `interviews` table — the mock-interview feature is stateless
> (LLM-only) and its results are not stored.

## Project Structure

```
Capabl/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, router wiring, / and /health
│   ├── config.py               # Settings (pydantic-settings)
│   ├── database.py             # SQLAlchemy engine (psycopg v3; normalizes DATABASE_URL)
│   ├── dependencies.py         # get_db, get_current_user (JWT)
│   ├── models/models.py        # ORM: users, resumes, saved_jobs, job_searches
│   ├── schemas/schemas.py      # Pydantic request/response schemas
    │   ├── routers/
    │   │   ├── auth.py             # register, login, me
    │   │   ├── users.py            # create, me
    │   │   ├── resume.py           # upload, list, get, delete
│   │   ├── jobs.py             # search, save, saved, status, delete
│   │   ├── match.py            # score, advice
│   │   ├── interview.py        # questions, evaluate
│   │   └── agent.py            # run (LangGraph pipeline)
│   ├── services/
│   │   ├── auth_service.py     # bcrypt hashing + JWT create/verify
│   │   ├── resume_parser.py    # pdfplumber + regex/keyword heuristics + ATS score
│   │   ├── semantic_matcher.py # scikit-learn TF-IDF + NumPy cosine similarity
│   │   ├── job_search.py       # Adzuna (httpx) + Redis cache + mock fallback
│   │   ├── llm_service.py      # Gemini: advice, resume summary
│   │   ├── interview_service.py# Gemini: questions, answer evaluation
│   │   └── career_agent.py     # LangGraph StateGraph
    │   ├── alembic/versions/001_initial.py   # single-head migration (all 4 tables)
    │   └── tests/                  # 56 tests across 8 files + conftest.py
└── frontend/
    └── src/
        ├── App.jsx             # routes + ProtectedRoute
        ├── context/UserContext.jsx
        ├── api/client.js       # axios client, JWT interceptor, 401 auto-logout
        ├── pages/              # Dashboard, JobSearch, ResumeAnalysis, SavedJobs, MockInterview, LoginPage
        └── components/         # Navbar, JobCard, MatchScoreBar, ResumeUpload, CareerAdviceModal
```

## Running Tests

```bash
# From the project root
pytest backend/tests/ -v
```

56 tests across 8 files: unit tests for the resume parser and TF-IDF matcher, a
mocked-service test of the LangGraph agent, and FastAPI `TestClient` tests for the
auth, users, resume-match, jobs, and interview endpoints. Tests run on SQLite and
create tables via `Base.metadata.create_all` (not Alembic); `conftest.py` overrides
`get_current_user`, so endpoint tests run as a fixed test user. The jobs test
suite includes `test_save_job_other_user_isolated`, which inserts a `SavedJob`
owned by another user and asserts the caller cannot list, mutate, or delete it.

## Database Migrations (Alembic)

```bash
cd backend
alembic upgrade head          # apply migrations (creates all tables)
alembic revision --autogenerate -m "describe change"
alembic downgrade -1
```

There is one migration head, `001_initial`, which creates all four tables, the
`jobstatus` enum, and indexes.

## Deployment

**Backend → Railway** (`railway.toml`): Dockerfile build (`backend/Dockerfile`,
`python:3.11-slim`), Uvicorn on `$PORT`, healthcheck `/health`. Railway
services don't sleep like the Render free tier, so the backend stays
awake at all times.

**Frontend → Vercel** (`vercel.json`): set root to `frontend/`, build
`npm run build`, output `dist`. The frontend talks to the Railway backend
**directly** via axios using `VITE_API_URL` — there is no proxy in
production, so the Vercel deployment is a pure static SPA.

### Required production env vars

**Railway service:**

| Var | Value |
|-----|-------|
| `DATABASE_URL` | Provided by the Railway Postgres addon (bare `postgres://` is auto-rewritten to `postgresql+psycopg://` in `database.py`). |
| `REDIS_URL` | Provided by the Railway Redis addon (optional — code degrades gracefully if absent). |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(48))"` — **must not** be a placeholder. |
| `GEMINI_API_KEY` | Required for real AI output (advice, interview, summaries). |
| `GEMINI_MODEL` | `gemini-2.5-flash` (default). |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Optional — without them, job search serves realistic mock Indian data. |
| `CORS_ORIGINS` | Exact Vercel frontend origin, e.g. `https://career-platform.vercel.app` (no `*`, no trailing slash). |
| `DEBUG` | `false` |

Then apply the Alembic migration once against the production database:

```bash
# Locally, with the Railway DATABASE_URL exported:
DATABASE_URL=postgresql://... alembic -c backend/alembic.ini upgrade head
```

The app's lifespan (`backend/main.py`) **no longer** calls
`Base.metadata.create_all` — Alembic is the only path that creates tables.

**Vercel project:**

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| `VITE_API_URL` | The Railway service URL, e.g. `https://career-platform.up.railway.app` (no trailing slash — axios appends `/api/v1`). |

All three config files (`railway.toml`, `vercel.json`, and
`frontend/.env.production`) are now consistent and point at the same
Railway backend.

## Known Issues & Security

The BLOCKER and HIGH/MEDIUM security items (IDOR, default `SECRET_KEY`, CORS,
unauthenticated user enumeration, stale-token UI) have all been resolved. The
API is safe to expose publicly **as long as the production env vars satisfy the
deployment checklist above** (`DEBUG=false`, a freshly generated `SECRET_KEY`,
`CORS_ORIGINS` set to the exact Vercel origin, and a managed Postgres).

- **Security (resolved):** all routes are now `Depends(get_current_user)` and
  derive the owner from the JWT; resource-id routes return `404` (not `403`) on
  ownership mismatch to avoid leaking existence. `backend/config.py::Settings.
  assert_production_safe()` refuses to boot with a placeholder `SECRET_KEY` or
  wildcard/empty CORS when `DEBUG=False`. Frontend now validates the stored
  token on app boot. See [`SECURITY_NOTES.md`](SECURITY_NOTES.md) for the
  per-item before/after.
- **Cosmetic only:** the `password` field in `backend/schemas/schemas.py` has
  no `max_length`, so a password over 72 bytes is silently truncated to 72
  rather than rejected (bcrypt limit). Add `max_length=72` if desired.
- **Matching caveat:** `/match/score` fits the resume and job together (shared
  vocabulary → meaningful score), but job-ranking fits each job's TF-IDF vector
  independently, so those ranking scores compare mismatched vocabularies — treat
  them as rough signals, not calibrated similarities.
- **Maintenance:** `google-generativeai` is deprecated (SDK sunset by Google); plan
  a migration to the `google-genai` SDK. `langchain-core` is declared but the full
  `langchain` package is not.
