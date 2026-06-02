# Restore Point — UI-Only Shell (before Sprint 8 backend)

**Saved:** 2026-05-29  
**Purpose:** Roll back to the UI-only state if the Sprint 8 backend work doesn’t work out.

## What worked at this restore point

- Login (operator + household registration UI)
- Operator dashboard: Dashboard, Simulation, Households, Alerts, Settings (mostly placeholders)
- Household member area: Dashboard, Battery Sharing, Settings (placeholders)
- **No real backend** — Run Simulation used a fake delay only
- **No database** — all data from `src/constants/mockSimulation.js`

## How to revert Sprint 8 backend changes

1. **Delete the backend folder:**
   ```
   Remove-Item -Recurse -Force backend
   ```

2. **Revert these frontend files** (if they were changed for the API):
   - `src/hooks/useSimulationParams.js`
   - `src/pages/SimulationPage.jsx`
   - `vite.config.js`
   - `package.json` (only if dev scripts were added)

3. **Remove backend artifacts:**
   ```
   Remove-Item -Force backend\solarkapitbahay.db -ErrorAction SilentlyContinue
   ```

4. **Restart frontend only:**
   ```
   npm run dev
   ```

## Git note (no push required)

Your UI work was never committed. To discard **all** local changes and match remote `main`:

```
git restore .
git clean -fd
```

⚠️ That removes untracked files too (`src/pages/`, `src/components/`, etc.). Only use if you want a full reset.

## Sprint 8 backend additions (added after this point)

- `backend/` — FastAPI app, Greedy algorithm, SQLite
- `RESTORE_POINT.md` — this file
- `src/services/simulationApi.js` — API client
- API proxy in `vite.config.js`
- Updated: `src/hooks/useSimulationParams.js`, `src/pages/SimulationPage.jsx`, `package.json`, `.gitignore`

## How to run (after Sprint 8 backend)

**Terminal 1 — backend:**
```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend:**
```powershell
npm run dev
```

Then sign in as operator → Simulation → Run Simulation (Greedy selected).
