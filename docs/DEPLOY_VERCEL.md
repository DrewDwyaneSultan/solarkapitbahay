# Deploy on Vercel Only (no Render)

One URL for frontend + backend. Database on **Supabase** (required — Vercel cannot persist SQLite).

```
https://your-app.vercel.app/          → React UI
https://your-app.vercel.app/api/health → FastAPI backend
```

---

## Prerequisites

1. Code pushed to GitHub (`DrewDwyaneSultan/solarkapitbahay`)
2. **Supabase** project with database password saved
3. **Commit the dataset** so seeding works in the cloud:
   ```powershell
   git add "data/csvmerged2 (1).txt" data/README.md supabase/
   git commit -m "Include dataset for cloud seed"
   git push origin main
   ```

---

## Step 1 — Supabase connection string

Supabase dashboard → open your project → **Connect** (top button)

Copy **Direct connection** URI (port `5432`):

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

You need this for Step 3. Without it, the API runs but data resets on every deploy.

---

## Step 2 — Import repo on Vercel

1. [vercel.com](https://vercel.com) → sign in with GitHub
2. **Add New…** → **Project**
3. Import **`solarkapitbahay`**
4. **Important:** Framework Preset → **Services** (not Vite)

   Vercel reads [`vercel.json`](../vercel.json) which defines:
   - Frontend (Vite) at `/`
   - Backend (FastAPI) at `/api`

5. Do **not** set `VITE_API_URL` — same domain, API is at `/api`

---

## Step 3 — Environment variable on Vercel

Before deploying, add:

| Key | Value | Applies to |
|-----|-------|------------|
| `DATABASE_URL` | Your Supabase URI | All / Production |

**Settings → Environment Variables → Add**

Then click **Deploy**.

---

## Step 4 — Verify

| URL | Expected |
|-----|----------|
| `https://YOUR-APP.vercel.app/` | Login page |
| `https://YOUR-APP.vercel.app/api/health` | `"database": "postgresql"`, `"households": 15` |
| `https://YOUR-APP.vercel.app/api/households` | 15 households |

Demo login: `operator@solarkapitbahay.com` / `admin123`

---

## If deploy fails

| Problem | Fix |
|---------|-----|
| No **Services** preset | Your Vercel account may need Services access — try updating Vercel CLI or contact Vercel; fallback: frontend-only on Vercel + free [Railway](https://railway.app) or [Fly.io](https://fly.io) for API |
| Build fails on FastAPI | Check deploy logs; ensure `backend/requirements.txt` and `backend/pyproject.toml` are committed |
| `households: 0` | `DATABASE_URL` missing or wrong; check Supabase password (URL-encode special chars) |
| Seed error | Ensure `data/csvmerged2 (1).txt` is committed and pushed to GitHub |
| API 404 | Framework must be **Services**, not plain Vite |

---

## Auto-deploy

Every `git push origin main` redeploys both frontend and backend on Vercel.

---

## Why Supabase is still required on Vercel

Vercel serverless has no persistent disk. SQLite in `/tmp` is wiped between invocations. **Supabase = your permanent database**; Vercel = your app host.
