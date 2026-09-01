# Deploy — Railway (backend) + Vercel (frontend)

Step-by-step checklist for the production deploy. All three config files
(`railway.toml`, `vercel.json`, `frontend/.env.production`) are already
consistent and point at the same Railway backend — you only need to provide
secret values and trigger a deploy.

## 0. Prerequisites (one-time)

Generate a strong `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Save the output. You'll paste it into both Railway (backend) and your local
`.env` (if you want to test prod config locally).

## 1. Railway — backend

1. Create a new project → **Deploy from GitHub repo** → pick this repo.
2. Add a **Postgres** plugin (any plan, even free, works for low traffic).
   Railway will set `DATABASE_URL` automatically.
3. Optional: add a **Redis** plugin. Railway will set `REDIS_URL`. The code
   degrades gracefully if it's missing, but Redis gives a 1-hour cache on job
   search results.
4. In the service's **Variables** tab, set:

   | Var | Value |
   |-----|-------|
   | `SECRET_KEY` | The string from step 0. |
   | `DEBUG` | `false` |
   | `CORS_ORIGINS` | The Vercel frontend origin, e.g. `https://career-platform.vercel.app` (no `*`, no trailing slash). You'll know this after step 2. |
   | `GEMINI_API_KEY` | Your Google AI Studio key. |
   | `GEMINI_MODEL` | `gemini-2.5-flash` (or another model name you want). |
   | `ADZUNA_APP_ID` | *(optional)* |
   | `ADZUNA_APP_KEY` | *(optional)* |

   `DATABASE_URL` and `REDIS_URL` are auto-injected by the plugins — don't
   override them.

5. Set the **start command** (if not already in `railway.toml`) — it should be
   the existing `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`. The
   healthcheck is `/health` and the Dockerfile is `backend/Dockerfile`.
6. **Apply the Alembic migration** against the production database once,
   before the first deploy serves real traffic. Locally, with the Railway
   `DATABASE_URL` exported:

   ```bash
   DATABASE_URL=postgresql://user:pass@host:port/db alembic -c backend/alembic.ini upgrade head
   ```

   The app's lifespan **does not** create tables — Alembic is the only path.

7. **Deploy.** The service gets a URL like
   `https://career-platform.up.railway.app`. Note this for step 2.

   Smoke-test:

   ```bash
   curl https://career-platform.up.railway.app/health
   # → {"status":"ok",...}
   ```

8. Railway services don't sleep like the Render free tier — the backend
   stays awake at all times.

## 2. Vercel — frontend

1. New project → **Import** the same GitHub repo.
2. **Project settings**:
   - **Root Directory** = `frontend`
   - **Build Command** = `npm run build` (default, or pinned in `vercel.json`)
   - **Output Directory** = `dist` (default, or pinned in `vercel.json`)
   - **Framework Preset** = `Other` (so Vercel doesn't try to detect one)
3. **Environment variables** (project settings → Environment Variables):

   | Var | Value |
   |-----|-------|
   | `VITE_API_URL` | The Railway URL from step 1, **no trailing slash**, e.g. `https://career-platform.up.railway.app` |

4. **Deploy.** Vercel will give you a URL like
   `https://career-platform.vercel.app`. Note this.
5. Go back to **Railway** and update `CORS_ORIGINS` to the exact Vercel
   origin (no trailing slash, no `*`). Redeploy the backend.

## 3. Final smoke test

1. Open the Vercel URL in a browser.
2. **Register** a new account on the login page. You should get a JWT and be
   redirected to the dashboard.
3. **Upload a PDF resume** on the Resume Analysis page. It should parse and
   show an ATS score.
4. **Search for a job** on the Job Search page. Mock data should appear (real
   Adzuna data if you set the keys).
5. **Save a job** — it should appear on the Saved Jobs page.
6. **Generate mock interview questions** — if `GEMINI_API_KEY` is set, you'll
   get Gemini output; otherwise canned fallback.
7. Check the Railway logs — they should show normal request logs and no
   5xx errors.

## 4. Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| Backend boot fails with "SECRET_KEY is a placeholder" | `SECRET_KEY` is still a default value, or `DEBUG` is `True` (the guard only runs when `DEBUG=false`). |
| Browser shows "Network Error" on every API call | `VITE_API_URL` is wrong (check the trailing slash, the protocol, the host). |
| CORS error in browser console: "No 'Access-Control-Allow-Origin' header" | `CORS_ORIGINS` doesn't exactly match the Vercel origin (note `https://`, no trailing slash). |
| `relation "users" does not exist` on first request | You forgot step 1.6 — run `alembic upgrade head` against the production DB. |
| `pydantic.ValidationError` on `CORS_ORIGINS` | It's being parsed as a string, not JSON. Use either `["https://a.com","https://b.com"]` (JSON) or `https://a.com,https://b.com` (comma-separated) — both work. |
| Job search always returns the same canned list | `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` not set, **or** the request hit the mock fallback because the real API failed. Check Railway logs. |
