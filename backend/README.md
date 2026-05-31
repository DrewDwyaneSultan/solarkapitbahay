# Backend (Sprint 8 — unfinished, for friend testing)

Greedy simulation + SQLite. LP, Hybrid, TOPSIS, auth, and MQTT are **not** implemented yet.

## Deploy options (pick one)

### Option A — Vercel Services (frontend + backend, one URL)

1. Vercel → Project Settings → **Framework Preset** → **Services**
2. Redeploy from GitHub (`main`)
3. Share your Vercel URL — friends use **Simulation → Run Simulation**

Routes on the live site:
- UI: `https://your-app.vercel.app/`
- API: `https://your-app.vercel.app/api/health`

> Requires Vercel **Services** access on your account. If deploy fails, use Option B.

### Option B — Render backend + Vercel frontend (most reliable)

1. [render.com](https://render.com) → **New Blueprint** → connect this repo → deploy `render.yaml`
2. Copy the Render API URL (e.g. `https://solarkapitbahay-api.onrender.com`)
3. Vercel → **Environment Variables** → add:
   ```
   VITE_API_URL = https://solarkapitbahay-api.onrender.com
   ```
4. Redeploy Vercel (Framework Preset can stay **Vite** for this option — use `.vercelignore` with `backend/` if needed)

## Run locally (full stack)

**Terminal 1:**
```powershell
npm run dev
```

**Terminal 2:**
```powershell
npm run dev:backend
```

Open `http://localhost:5173` → operator login → **Simulation**.

Demo login: `operator@solarkapitbahay.com` / `admin123`

## Notes for testers

- First simulation run on Render free tier may take ~30s (cold start)
- Run history on Vercel uses `/tmp` SQLite — history may reset between deployments
- Only **Greedy** algorithm works; other options return “not implemented”
