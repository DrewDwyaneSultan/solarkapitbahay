# Backend (unfinished — Sprint 8)

Uploaded for repo completeness and **local testing**. The Vercel deployment uses the **frontend only**.

## Current status

| Feature | Status |
|---------|--------|
| Greedy simulation | Working locally |
| SQLite run history | Working locally |
| LP / Hybrid algorithms | Not implemented |
| TOPSIS ranking | Not implemented |
| Real auth / MQTT | Not implemented |

## Run locally (full stack)

**Terminal 1 — frontend:**
```powershell
npm run dev
```

**Terminal 2 — backend:**
```powershell
npm run dev:backend
```

Open `http://localhost:5173` → Operator login → **Simulation** → Run Simulation.

## Vercel note

- Connect this repo to Vercel; it will build `npm run build` → `dist/`.
- UI pages (Dashboard, Energy Transfer, Alerts, etc.) work on Vercel.
- **Simulation API** needs this backend running somewhere else (e.g. Render) plus `VITE_API_URL` in Vercel settings.

Demo login: `operator@solarkapitbahay.com` / `admin123`
