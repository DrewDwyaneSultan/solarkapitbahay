"""
FastAPI backend for SolarKapitBahay.

Production algorithm: Greedy (Colab/TOPSIS winner). LP and Hybrid planned later.
"""

import os
import time
from typing import Literal

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from algorithms.greedy import simulate_greedy
from clustering import get_household_cluster, run_clustering
from config import SIM_DAYS_DEFAULT
from database import (
    db_status,
    get_active_dataset,
    get_household,
    get_run,
    household_count,
    init_db,
    list_households,
    list_runs,
    save_run,
    seed_database,
)

# On Vercel Services, routePrefix "/api" is stripped before the request hits FastAPI.
# Locally (and on Render), routes keep the "/api" prefix to match the Vite proxy.
API_PREFIX = "" if os.getenv("VERCEL") else "/api"

app = FastAPI(title="SolarKapitBahay API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


class SimulationRequest(BaseModel):
    households: int = Field(ge=5, le=100, default=50)
    battery_capacity_kwh: float = Field(ge=5, le=200, default=100)
    simulation_days: int = Field(ge=7, le=90, default=SIM_DAYS_DEFAULT)
    seed: int = Field(default=42, ge=0)
    algorithm: Literal["greedy"] = "greedy"


@app.on_event("startup")
def on_startup() -> None:
    app.state.db_ready = False
    app.state.db_error = None
    try:
        init_db()
        seed_database()
        app.state.db_ready = True
    except Exception as exc:
        app.state.db_error = str(exc)


@router.get("/health")
def health() -> dict:
    payload = {"status": "ok", "service": "solarkapitbahay-api", **db_status()}
    if getattr(app.state, "db_error", None):
        payload["startup_error"] = app.state.db_error
        payload["status"] = "degraded"
    return payload


@router.post("/seed")
def seed_if_empty() -> dict:
    """One-time seed when DB is connected but households table is empty."""
    if household_count() > 0:
        return {"seeded": False, "reason": "already_seeded", "households": household_count()}
    try:
        init_db()
        result = seed_database(force=False)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/simulation/run")
def run_simulation(body: SimulationRequest) -> dict:
    started = time.perf_counter()

    if body.algorithm != "greedy":
        raise HTTPException(
            status_code=501,
            detail="Only greedy is implemented. LP and hybrid are planned for a future comparison run.",
        )

    results = simulate_greedy(
        num_households=body.households,
        battery_capacity_kwh=body.battery_capacity_kwh,
        days=body.simulation_days,
        seed=body.seed,
    )
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


@router.get("/simulation/runs")
def simulation_runs(limit: int = 20) -> dict:
    return {"runs": list_runs(limit=limit)}


@router.get("/simulation/runs/{run_id}")
def simulation_run_detail(run_id: int) -> dict:
    row = get_run(run_id)
    if not row:
        raise HTTPException(status_code=404, detail="Run not found.")
    return row


@router.get("/clustering")
def clustering_overview() -> dict:
    """K-means on merged CSV — charge/discharge indicators for all households."""
    return run_clustering()


@router.get("/clustering/{household_id}")
def clustering_household(household_id: str) -> dict:
    row = get_household_cluster(household_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Household {household_id} not found in dataset.")
    return row


@router.get("/households")
def households_list() -> dict:
    """All households from the seeded database."""
    return {"households": list_households(), "count": household_count()}


@router.get("/households/{household_id}")
def household_detail(household_id: str) -> dict:
    row = get_household(household_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Household {household_id} not found.")
    return row


@router.get("/dataset")
def dataset_overview() -> dict:
    """Active imported dataset metadata."""
    row = get_active_dataset()
    if not row:
        raise HTTPException(status_code=404, detail="No dataset seeded. Run: python seed_db.py")
    return dict(row)


app.include_router(router, prefix=API_PREFIX)
