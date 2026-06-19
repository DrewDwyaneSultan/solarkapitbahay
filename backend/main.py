"""
FastAPI backend for SolarKapitBahay.

Production algorithm: Greedy (Colab/TOPSIS winner). LP and Hybrid planned later.
"""

import os
import time
from typing import Literal

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from algorithms.greedy import simulate_greedy
from clustering import get_household_cluster, run_clustering
from live_clustering import run_live_clustering
from config import SIM_DAYS_DEFAULT
from database import (
    approve_registration,
    create_operator_household,
    db_status,
    delete_operator_household,
    get_active_dataset,
    get_barangay_for_operator,
    get_household,
    get_run,
    get_user_profile,
    household_count,
    init_db,
    list_households,
    list_registrations,
    list_runs,
    lookup_barangay_public,
    register_barangay,
    reject_registration,
    reset_barangay_mock_data,
    save_run,
    seed_database,
    update_operator_household,
    upsert_user_profile,
)
from auth import auth_configured, get_auth_user_id, get_token_email
from notifications import (
    email_configured,
    send_registration_approved,
    send_registration_rejected,
)
from mqtt_bridge import (
    get_live_payload,
    get_mqtt_status,
    ingest_mqtt_message,
    publish_manual_transfer,
    start_mqtt_bridge,
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


class ProfileRequest(BaseModel):
    role: Literal["operator", "household"]
    display_name: str = Field(min_length=1, max_length=120)
    address: str | None = None
    household_id: str | None = None
    household_code: str | None = None
    barangay_code: str | None = None
    has_solar: bool = False
    has_battery: bool = False
    battery_model: str | None = None
    battery_capacity_kwh: float | None = None


class BarangayRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    contact_email: str = Field(min_length=3, max_length=200)
    city_municipality: str | None = None
    province: str | None = None
    location_lat: float | None = None
    location_lon: float | None = None


class RegistrationRejectRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class HouseholdCreateRequest(BaseModel):
    head_name: str = Field(min_length=2, max_length=120)
    address: str | None = Field(default=None, max_length=300)
    purok: str | None = Field(default=None, max_length=120)
    has_solar: bool = False
    has_battery: bool = False


class HouseholdUpdateRequest(BaseModel):
    head_name: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = Field(default=None, max_length=300)
    purok: str | None = Field(default=None, max_length=120)
    has_solar: bool | None = None
    has_battery: bool | None = None
    status: Literal["active", "pending", "inactive"] | None = None


class ManualTransferRequest(BaseModel):
    from_house: Literal["A", "B", "House A", "House B"] = "A"
    to_house: Literal["A", "B", "House A", "House B"] = "B"
    watts: int = Field(ge=0, le=500, default=100)


class MqttIngestBody(BaseModel):
    topic: str = Field(min_length=3, max_length=200)
    payload: str = Field(max_length=2000)


def _require_profile(user_id: str = Depends(get_auth_user_id)) -> dict:
    profile = get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile


def _require_operator(profile: dict = Depends(_require_profile)) -> dict:
    if profile.get("role") != "operator":
        raise HTTPException(status_code=403, detail="Operator access required.")
    return profile


def _operator_barangay(profile: dict = Depends(_require_operator)) -> dict:
    bg = get_barangay_for_operator(profile["id"])
    if not bg:
        raise HTTPException(status_code=404, detail="Register your barangay first.")
    return bg


@app.on_event("startup")
def on_startup() -> None:
    app.state.db_ready = False
    app.state.db_error = None
    app.state.seed_error = None
    app.state.mqtt_bridge = start_mqtt_bridge()
    try:
        init_db()
        app.state.db_ready = True
    except Exception as exc:
        app.state.db_error = str(exc)
    try:
        seed_database()
    except Exception as exc:
        app.state.seed_error = str(exc)


@router.get("/health")
def health() -> dict:
    payload = {"status": "ok", "service": "solarkapitbahay-api", **db_status()}
    payload["auth_configured"] = auth_configured()
    payload["mqtt_bridge"] = getattr(app.state, "mqtt_bridge", None)
    payload["mqtt"] = get_mqtt_status()
    if getattr(app.state, "db_error", None):
        payload["startup_error"] = app.state.db_error
        payload["status"] = "degraded"
    if getattr(app.state, "seed_error", None):
        payload["seed_error"] = app.state.seed_error
        if payload["status"] == "ok":
            payload["status"] = "degraded"
    return payload


@router.get("/live")
def live_telemetry() -> dict:
    """Latest MQTT readings from solar/A/* and solar/B/* (ESP32 firmware)."""
    return get_live_payload()


@router.get("/live/status")
def live_mqtt_status() -> dict:
    return get_mqtt_status()


@router.post("/mqtt/ingest")
def mqtt_ingest(
    body: MqttIngestBody,
    x_mqtt_secret: str | None = Header(default=None),
) -> dict:
    """Optional webhook target for cloud MQTT brokers (HiveMQ, EMQX)."""
    expected = os.getenv("MQTT_INGEST_SECRET")
    if expected and x_mqtt_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid ingest secret.")
    ingest_mqtt_message(body.topic.strip(), body.payload)
    return {"ok": True}


@router.get("/auth/status")
def auth_status() -> dict:
    return {"auth_configured": auth_configured()}


@router.get("/auth/me")
def auth_me(user_id: str = Depends(get_auth_user_id)) -> dict:
    profile = get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Complete registration.")
    return profile


@router.post("/auth/profile")
def auth_save_profile(
    body: ProfileRequest,
    user_id: str = Depends(get_auth_user_id),
    email: str = Depends(get_token_email),
) -> dict:
    try:
        return upsert_user_profile(
            user_id,
            email,
            role=body.role,
            display_name=body.display_name.strip(),
            household_id=body.household_id,
            household_code=body.household_code,
            barangay_code=body.barangay_code,
            address=body.address,
            has_solar=body.has_solar,
            has_battery=body.has_battery,
            battery_model=body.battery_model,
            battery_capacity_kwh=body.battery_capacity_kwh,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/barangays/lookup")
def barangay_lookup(code: str) -> dict:
    row = lookup_barangay_public(code)
    if not row:
        raise HTTPException(status_code=404, detail="Barangay code not found.")
    return row


@router.get("/barangays/mine")
def barangay_mine(profile: dict = Depends(_require_profile)) -> dict:
    if profile.get("role") != "operator":
        raise HTTPException(status_code=403, detail="Operators only.")
    bg = get_barangay_for_operator(profile["id"])
    if not bg:
        raise HTTPException(status_code=404, detail="No barangay registered yet.")
    return dict(bg)


@router.post("/barangays/register")
def barangay_register(
    body: BarangayRegisterRequest,
    profile: dict = Depends(_require_operator),
) -> dict:
    try:
        return register_barangay(
            profile["id"],
            name=body.name,
            contact_email=body.contact_email,
            city_municipality=body.city_municipality,
            province=body.province,
            location_lat=body.location_lat,
            location_lon=body.location_lon,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/registrations")
def registrations_list(
    status: str = "pending",
    barangay: dict = Depends(_operator_barangay),
) -> dict:
    rows = list_registrations(int(barangay["id"]), status=status or None)
    return {"registrations": rows, "count": len(rows)}


@router.patch("/registrations/{registration_id}/approve")
def registration_approve(
    registration_id: int,
    profile: dict = Depends(_require_operator),
    barangay: dict = Depends(_operator_barangay),
) -> dict:
    try:
        result = approve_registration(registration_id, profile["id"])
        if int(result.get("barangay_id", 0)) != int(barangay["id"]):
            raise HTTPException(status_code=403, detail="Registration not in your barangay.")
        send_registration_approved(
            to=result["applicant_email"],
            display_name=result["display_name"],
            barangay_name=barangay.get("name", "your barangay"),
            household_id=result.get("household_id", ""),
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/registrations/{registration_id}/reject")
def registration_reject(
    registration_id: int,
    body: RegistrationRejectRequest,
    profile: dict = Depends(_require_operator),
    barangay: dict = Depends(_operator_barangay),
) -> dict:
    try:
        result = reject_registration(registration_id, profile["id"], body.reason)
        if int(result.get("barangay_id", 0)) != int(barangay["id"]):
            raise HTTPException(status_code=403, detail="Registration not in your barangay.")
        send_registration_rejected(
            to=result["applicant_email"],
            display_name=result["display_name"],
            barangay_name=barangay.get("name", "your barangay"),
            reason=body.reason,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/notifications/status")
def notifications_status() -> dict:
    return {"email_configured": email_configured()}


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
def clustering_overview(include_live: bool = False) -> dict:
    """K-means on merged CSV — charge/discharge indicators for all households."""
    data = run_clustering()
    if include_live:
        try:
            live = run_live_clustering()
            data["live_households"] = live["households"]
            data["live_summary"] = live["summary"]
            data["live_mqtt"] = live.get("mqtt")
        except Exception:
            data["live_households"] = []
            data["live_summary"] = {}
            data["live_mqtt"] = None
    return data


@router.get("/clustering/live")
def clustering_live_only() -> dict:
    """Live House A/B clustering from MQTT only."""
    return run_live_clustering()


@router.get("/clustering/{household_id}")
def clustering_household(household_id: str) -> dict:
    row = get_household_cluster(household_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Household {household_id} not found in dataset.")
    return row


@router.get("/households")
def households_list(barangay_code: str | None = None, claimable_only: bool = False) -> dict:
    """Households from the database, optionally filtered by barangay code."""
    barangay_id = None
    if barangay_code:
        from database import get_barangay_by_code

        bg = get_barangay_by_code(barangay_code)
        if not bg:
            raise HTTPException(status_code=404, detail="Barangay code not found.")
        barangay_id = int(bg["id"])
    rows = list_households(barangay_id=barangay_id, claimable_only=claimable_only)
    return {"households": rows, "count": len(rows)}


@router.post("/households")
def household_create(
    body: HouseholdCreateRequest,
    barangay: dict = Depends(_operator_barangay),
) -> dict:
    """Operator: manually register a household in their barangay."""
    row = create_operator_household(
        int(barangay["id"]),
        str(barangay["barangay_code"]),
        body.head_name,
        address=body.address,
        purok=body.purok,
        has_solar=body.has_solar,
        has_battery=body.has_battery,
    )
    return row


@router.post("/households/reset-mock-data")
def households_reset_mock(barangay: dict = Depends(_operator_barangay)) -> dict:
    """Restore the original 15 mock households (removes operator-added homes)."""
    try:
        return reset_barangay_mock_data(int(barangay["id"]), str(barangay["barangay_code"]))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/households/{household_id}")
def household_update(
    household_id: str,
    body: HouseholdUpdateRequest,
    barangay: dict = Depends(_operator_barangay),
) -> dict:
    try:
        return update_operator_household(
            household_id,
            int(barangay["id"]),
            head_name=body.head_name,
            address=body.address,
            purok=body.purok,
            has_solar=body.has_solar,
            has_battery=body.has_battery,
            status=body.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/households/{household_id}")
def household_delete(
    household_id: str,
    barangay: dict = Depends(_operator_barangay),
) -> dict:
    try:
        return delete_operator_household(household_id, int(barangay["id"]))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/live/manual-transfer")
def live_manual_transfer(
    body: ManualTransferRequest,
    _profile: dict = Depends(_require_operator),
) -> dict:
    """Publish a manual transfer command over MQTT (requires firmware subscriber)."""
    return publish_manual_transfer(body.from_house, body.to_house, body.watts)


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
