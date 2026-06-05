# Deployed Demo Guide (Vercel + Render + Supabase)

Persistent cloud demo for SolarKapitBahay — households, clustering, and simulation runs survive redeploys.

## Architecture

```
Vercel (React UI)  →  Render (FastAPI)  →  Supabase (PostgreSQL)
```

| Service | Role | Free tier |
|---------|------|-----------|
| **Vercel** | Frontend | Yes |
| **Render** | Backend API | Yes (cold starts ~30s) |
| **Supabase** | PostgreSQL database | Yes |

---

## Step 1 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name it `solarkapitbahay` (or similar), set a strong DB password, choose a region close to you
3. Wait for the project to finish provisioning

### Optional: run schema manually

Supabase → **SQL Editor** → New query → paste contents of [`supabase/schema.sql`](../supabase/schema.sql) → **Run**

> The backend also creates tables on startup if they don't exist — manual run is optional.

### Copy connection string

Supabase → **Project Settings** → **Database** → **Connection string** → **URI**

Use the **Direct connection** string (port `5432`):

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

Replace `[YOUR-PASSWORD]` with your database password.

---

## Step 2 — Deploy backend on Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint** → connect the repo
3. Render reads [`render.yaml`](../render.yaml) and creates `solarkapitbahay-api`
4. In Render → your service → **Environment** → add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase URI from Step 1 |

5. **Manual Deploy** (or wait for auto-deploy from Git)
6. Test: open `https://YOUR-SERVICE.onrender.com/api/health`

Expected response:

```json
{
  "status": "ok",
  "service": "solarkapitbahay-api",
  "database": "postgresql",
  "connected": true,
  "households": 15,
  "simulation_runs": 0,
  "using_supabase": true
}
```

First request may take ~30s (Render cold start). The API auto-seeds 15 households on startup.

---

## Step 3 — Deploy frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo
2. Framework: **Vite**
3. **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com` (no trailing slash) |

4. Deploy
5. Open your Vercel URL → login `operator@solarkapitbahay.com` / `admin123`

---

## Step 4 — Verify the demo

| Check | URL / action |
|-------|----------------|
| API health | `GET /api/health` → `database: postgresql`, `households: 15` |
| Households | `GET /api/households` → 15 rows |
| Clustering | `GET /api/clustering` → `dataset_meta.source: database` |
| Simulation | UI → Simulation → Run Simulation → check `GET /api/simulation/runs` |

Run a simulation twice and confirm `simulation_runs` increments — data persists after redeploy.

---

## Local dev with Supabase (optional)

Copy `.env.example` to `backend/.env`:

```powershell
cd backend
pip install -r requirements.txt
$env:DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
python seed_db.py --force
python -m uvicorn main:app --reload --port 8000
```

Without `DATABASE_URL`, the backend uses local SQLite (`backend/solarkapitbahay.db`).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `households: 0` on health | Check `DATABASE_URL` on Render; redeploy; check Render logs for seed errors |
| CORS errors from Vercel | Backend allows `https://*.vercel.app` — use your Vercel URL, not localhost |
| API timeout on first load | Render free tier cold start — wait 30s and retry |
| `connection refused` to Supabase | Use **Direct** URI (5432), not pooler, on Render |
| Simulation works but no history | Confirm health shows `database: postgresql`, not sqlite |

---

## What persists in Supabase

- 15 households + 360 hourly energy records (seeded once)
- Every simulation run (params + results JSON)
- Re-seed from Render shell: `python seed_db.py --force` (wipes Phase 1 tables)

---

## Cost note

All three services have free tiers sufficient for a thesis demo and friend testing. Supabase free tier pauses after 1 week of inactivity — open the Supabase dashboard to wake it up.
