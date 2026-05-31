"""
FastAPI backend for SolarKapitBahay — Sprint 8 functional increment.

NOTE (unfinished / testing upload):
  - Greedy algorithm + SQLite only; LP, Hybrid, TOPSIS, auth, and MQTT not implemented.
  - Intended for LOCAL dev with `npm run dev` + `npm run dev:backend`.
  - Vercel deploys the React UI only; this backend is NOT wired to Vercel yet.
  - Simulation on a live Vercel URL will not work until backend is hosted separately
    and VITE_API_URL is set in Vercel environment variables.
"""

import time
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from algorithms.greedy import simulate_greedy
from data_generator import generate_households
from database import get_run, init_db, list_runs, save_run

app = FastAPI(title="SolarKapitBahay API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulationRequest(BaseModel):
    households: int = Field(ge=5, le=100, default=50)
    battery_capacity_kwh: float = Field(ge=5, le=100, default=25)
    algorithm: Literal["greedy"] = "greedy"


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "solarkapitbahay-api"}


@app.post("/api/simulation/run")
def run_simulation(body: SimulationRequest) -> dict:
    started = time.perf_counter()

    if body.algorithm != "greedy":
        raise HTTPException(status_code=501, detail="Only greedy is implemented in this increment.")

    hh_data = generate_households(body.households)
    results = simulate_greedy(hh_data, body.battery_capacity_kwh)
    execution_ms = round((time.perf_counter() - started) * 1000, 2)

    run_id = save_run(
        algorithm=body.algorithm,
        households=body.households,
        battery_capacity_kwh=body.battery_capacity_kwh,
        execution_ms=execution_ms,
        params=body.model_dump(),
        results={**results, "execution_ms": execution_ms, "algorithm": body.algorithm},
    )

    return {
        "run_id": run_id,
        "execution_ms": execution_ms,
        "algorithm": body.algorithm,
        **results,
    }


@app.get("/api/simulation/runs")
def simulation_runs(limit: int = 20) -> dict:
    return {"runs": list_runs(limit=limit)}


@app.get("/api/simulation/runs/{run_id}")
def simulation_run_detail(run_id: int) -> dict:
    row = get_run(run_id)
    if not row:
        raise HTTPException(status_code=404, detail="Run not found.")
    return row
