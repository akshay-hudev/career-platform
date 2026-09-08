# Deploy for Free — Render + Neon + Vercel

This is the recommended free deployment layout:

- **Backend:** Render Web Service
- **Database:** Neon PostgreSQL
- **Frontend:** Vercel
- **Redis:** Optional. The backend works without it; Upstash can be added later.

Render's free backend sleeps after inactivity, so the first request after a quiet
period can take about a minute. This setup is appropriate for a portfolio,
demonstration, or low-traffic project—not a production service with uptime
requirements.

## 0. Generate a secret key

Run:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Save the output securely. Do not commit it to Git or paste it into a public file.

## 1. Create the PostgreSQL database on Neon

1. Create an account at <https://neon.com/>.
2. Create a new project and choose the region closest to your Render backend.
3. Open **Connect** and copy the **pooled** connection string.
4. Keep the connection string private. It looks similar to:

   ```text
   postgresql://user:password@host-pooler.region.aws.neon.tech/database?sslmode=require
   ```

The backend automatically converts `postgresql://` to SQLAlchemy's
`postgresql+psycopg://` format, so use the Neon URL exactly as supplied.

## 2. Deploy the FastAPI backend on Render

1. Open <https://dashboard.render.com/>.
2. Select **New → Web Service**.
3. Connect the GitHub repository containing this project.
   Alternatively, choose **Blueprint** and use the checked-in `render.yaml`;
   Render will prompt for the environment variables marked `sync: false`.
4. Configure the service:

   | Setting | Value |
   |---|---|
   | Language / Runtime | `Docker` |
   | Branch | `main` |
   | Region | Closest available region to the Neon database |
   | Dockerfile Path | `backend/Dockerfile` |
   | Docker Build Context Directory | `.` |
   | Instance Type | `Free` |
   | Health Check Path | `/health` |

5. The Docker image already starts with the following command. If you override
   it in Render, use the same value:

   ```bash
   alembic -c backend/alembic.ini upgrade head && uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```

   Alembic runs before the API starts. A failed migration prevents the release
   from starting with an incompatible database schema.

6. Add these environment variables in Render:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | The pooled Neon connection string |
   | `SECRET_KEY` | The generated value from step 0 |
   | `DEBUG` | `false` |
   | `CORS_ORIGINS` | Your expected Vercel origin, such as `https://career-flow.vercel.app` |
   | `GEMINI_API_KEY` | Your Google AI Studio key; optional for fallback responses |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |
   | `ADZUNA_APP_ID` | Optional; mock job data is used without it |
   | `ADZUNA_APP_KEY` | Optional; mock job data is used without it |

   Do not add `REDIS_URL` yet. Caching gracefully disables itself when Redis is
   unavailable.

7. Deploy the service and copy its public URL, for example:

   ```text
   https://career-flow-api.onrender.com
   ```

8. Verify the backend:

   ```bash
   curl https://career-flow-api.onrender.com/health
   ```

   Expected response:

   ```json
   {"status":"healthy"}
   ```

If the Render service fails during startup, inspect its logs. The most common
causes are an incorrect Neon URL, an insecure `SECRET_KEY`, or wildcard CORS
while `DEBUG=false`.

## 3. Deploy the React frontend on Vercel

1. Open <https://vercel.com/new> and import the same GitHub repository.
2. Configure the project:

   | Setting | Value |
   |---|---|
   | Root Directory | `frontend` |
   | Framework Preset | `Other` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

   `frontend/vercel.json` already contains the SPA rewrite required for React
   Router routes such as `/dashboard` and `/jobs`.

3. Add this Vercel environment variable for Production and Preview:

   ```text
   VITE_API_URL=https://career-flow-api.onrender.com
   ```

   Replace the example with the real Render URL and do not add a trailing slash.

4. Deploy and copy the final Vercel origin, for example:

   ```text
   https://career-flow.vercel.app
   ```

5. Return to Render and set `CORS_ORIGINS` to that exact origin:

   ```text
   https://career-flow.vercel.app
   ```

6. Redeploy the Render service after changing CORS.

For multiple allowed frontends, use a comma-separated value:

```text
https://career-flow.vercel.app,https://www.example.com
```

## 4. Final smoke test

1. Open the Vercel URL and register a new account.
2. Upload a PDF resume and confirm that an ATS score appears.
3. Search for jobs. Mock results should appear without Adzuna credentials.
4. Save a job and confirm that it appears under Saved Jobs.
5. Generate mock-interview questions.
6. Refresh a nested URL such as `/dashboard` and confirm it does not return 404.
7. Review Render logs and confirm there are no HTTP 500 responses.

## Optional: add free Redis with Upstash

Redis only caches job-search results, so it is not necessary for the first
deployment. To enable it later:

1. Create a free Redis database at <https://console.upstash.com/>.
2. Copy its TLS Redis connection URL—the one beginning with `rediss://`.
3. Add it to Render as `REDIS_URL`.
4. Redeploy the backend.

Do not use an Upstash REST URL for `REDIS_URL`; the Python Redis client needs the
Redis protocol connection string.

## Updating the application

Push changes to the connected `main` branch. Render and Vercel will both deploy
automatically. Render runs Alembic before starting each new backend release.

If a database migration is needed, create and test it locally before pushing:

```bash
alembic -c backend/alembic.ini revision --autogenerate -m "describe change"
alembic -c backend/alembic.ini upgrade head
```

Commit the generated migration file with the associated model changes.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| First request takes roughly a minute | Normal Render free-tier cold start after inactivity. |
| Render reports an unhealthy deploy | Confirm `/health`, the Dockerfile path, and startup logs. |
| `relation "users" does not exist` | Alembic did not run; verify the Render Docker command and `DATABASE_URL`. |
| Database connection or SSL error | Use Neon's pooled URL exactly as supplied, including `sslmode=require`. |
| Backend refuses to start with a secret-key error | Set a strong `SECRET_KEY` and keep `DEBUG=false`. |
| Backend refuses to start with a CORS error | `CORS_ORIGINS` cannot be empty or `*` when `DEBUG=false`. |
| Browser reports a CORS error | Make `CORS_ORIGINS` exactly match the Vercel origin, including `https://` and excluding a trailing slash. |
| Browser reports Network Error | Verify `VITE_API_URL`, then redeploy Vercel because Vite embeds it during the build. |
| Refreshing `/dashboard` returns 404 | Confirm Vercel uses `frontend` as its root so it loads `frontend/vercel.json`. |
| Job search returns mock listings | Add valid Adzuna credentials, or keep the intentional mock fallback. |
| AI features return fallback content | Add a valid `GEMINI_API_KEY` to Render. |
