"""Database persistence — SQLite locally, PostgreSQL (Supabase) when DATABASE_URL is set."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from db_backend import (
    DATABASE_URL,
    DB_PATH,
    db_connection,
    db_label,
    fetchall,
    fetchone,
    insert_returning_id,
    use_postgres,
)

# Live-hardware mapping (HH-01 / HH-02 have ESP32 circuits today)
CIRCUIT_MAP = {
    "HH-01": {"circuit_key": "houseA", "circuit_name": "House A", "has_solar": True},
    "HH-02": {"circuit_key": "houseB", "circuit_name": "House B", "has_solar": False},
}

# Bundled fallback when supabase/schema.sql is not in the serverless bundle (e.g. Vercel).
POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS barangays (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_email TEXT,
    mqtt_broker_host TEXT,
    mqtt_broker_port INTEGER DEFAULT 1883,
    battery_low_threshold_pct INTEGER DEFAULT 20,
    auto_device_discovery SMALLINT DEFAULT 1,
    email_notifications SMALLINT DEFAULT 1,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    timezone TEXT DEFAULT 'Asia/Manila',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    barangay_id INTEGER NOT NULL REFERENCES barangays(id) ON DELETE CASCADE,
    head_name TEXT NOT NULL,
    purok TEXT,
    address TEXT,
    has_solar SMALLINT DEFAULT 0,
    has_battery SMALLINT DEFAULT 0,
    battery_capacity_kwh DOUBLE PRECISION,
    battery_model TEXT,
    income_tier TEXT CHECK (income_tier IN ('low','mid','high')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','inactive')),
    circuit_key TEXT,
    circuit_name TEXT,
    registered_at TIMESTAMPTZ,
    approved_by_user_id INTEGER
);
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    dataset_id TEXT NOT NULL UNIQUE,
    source_file TEXT,
    household_count INTEGER,
    hourly_rows INTEGER,
    location TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active SMALLINT DEFAULT 1
);
CREATE TABLE IF NOT EXISTS hourly_energy_records (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
    load_kwh DOUBLE PRECISION,
    solar_kwh DOUBLE PRECISION,
    net_load_kwh DOUBLE PRECISION,
    battery_soc_pct DOUBLE PRECISION,
    grid_import_kwh DOUBLE PRECISION,
    grid_export_kwh DOUBLE PRECISION,
    tou_period TEXT,
    tou_rate_php DOUBLE PRECISION,
    UNIQUE (dataset_id, household_id, hour)
);
CREATE TABLE IF NOT EXISTS community_batteries (
    id SERIAL PRIMARY KEY,
    barangay_id INTEGER NOT NULL UNIQUE REFERENCES barangays(id) ON DELETE CASCADE,
    capacity_kwh DOUBLE PRECISION NOT NULL,
    efficiency DOUBLE PRECISION DEFAULT 0.90,
    min_soc_pct DOUBLE PRECISION DEFAULT 20,
    max_soc_pct DOUBLE PRECISION DEFAULT 95,
    max_charge_kw DOUBLE PRECISION DEFAULT 5.0,
    max_discharge_kw DOUBLE PRECISION DEFAULT 5.0,
    battery_type TEXT DEFAULT 'LiFePO4'
);
CREATE TABLE IF NOT EXISTS simulation_runs (
    id SERIAL PRIMARY KEY,
    barangay_id INTEGER REFERENCES barangays(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    algorithm TEXT NOT NULL,
    households INTEGER NOT NULL,
    battery_capacity_kwh DOUBLE PRECISION NOT NULL,
    execution_ms DOUBLE PRECISION NOT NULL,
    params_json JSONB NOT NULL,
    results_json JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('operator','household')),
    display_name TEXT NOT NULL,
    household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
    address TEXT,
    has_solar SMALLINT DEFAULT 0,
    has_battery SMALLINT DEFAULT 0,
    battery_model TEXT,
    battery_capacity_kwh DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_hourly_energy_household ON hourly_energy_records(household_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_created ON simulation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
"""

SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS barangays (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    name                    TEXT NOT NULL,
    contact_email           TEXT,
    mqtt_broker_host        TEXT,
    mqtt_broker_port        INTEGER DEFAULT 1883,
    battery_low_threshold_pct INTEGER DEFAULT 20,
    auto_device_discovery   INTEGER DEFAULT 1,
    email_notifications     INTEGER DEFAULT 1,
    location_lat            REAL,
    location_lon            REAL,
    timezone                TEXT DEFAULT 'Asia/Manila',
    created_at              TEXT NOT NULL,
    updated_at              TEXT
);

CREATE TABLE IF NOT EXISTS households (
    id                      TEXT PRIMARY KEY,
    barangay_id             INTEGER NOT NULL REFERENCES barangays(id),
    head_name               TEXT NOT NULL,
    purok                   TEXT,
    address                 TEXT,
    has_solar               INTEGER DEFAULT 0,
    has_battery             INTEGER DEFAULT 0,
    battery_capacity_kwh    REAL,
    battery_model           TEXT,
    income_tier             TEXT CHECK (income_tier IN ('low','mid','high')),
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','pending','inactive')),
    circuit_key             TEXT,
    circuit_name            TEXT,
    registered_at           TEXT,
    approved_by_user_id     INTEGER
);

CREATE TABLE IF NOT EXISTS datasets (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id              TEXT NOT NULL UNIQUE,
    source_file             TEXT,
    household_count         INTEGER,
    hourly_rows             INTEGER,
    location                TEXT,
    imported_at             TEXT NOT NULL,
    is_active               INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS hourly_energy_records (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id              INTEGER NOT NULL REFERENCES datasets(id),
    household_id            TEXT NOT NULL REFERENCES households(id),
    hour                    INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
    load_kwh                REAL,
    solar_kwh               REAL,
    net_load_kwh            REAL,
    battery_soc_pct         REAL,
    grid_import_kwh         REAL,
    grid_export_kwh         REAL,
    tou_period              TEXT,
    tou_rate_php            REAL,
    UNIQUE (dataset_id, household_id, hour)
);

CREATE TABLE IF NOT EXISTS community_batteries (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    barangay_id             INTEGER NOT NULL UNIQUE REFERENCES barangays(id),
    capacity_kwh            REAL NOT NULL,
    efficiency              REAL DEFAULT 0.90,
    min_soc_pct             REAL DEFAULT 20,
    max_soc_pct             REAL DEFAULT 95,
    max_charge_kw           REAL DEFAULT 5.0,
    max_discharge_kw        REAL DEFAULT 5.0,
    battery_type            TEXT DEFAULT 'LiFePO4'
);

CREATE TABLE IF NOT EXISTS simulation_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barangay_id INTEGER REFERENCES barangays(id),
    created_at TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    households INTEGER NOT NULL,
    battery_capacity_kwh REAL NOT NULL,
    execution_ms REAL NOT NULL,
    params_json TEXT NOT NULL,
    results_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id                      TEXT PRIMARY KEY,
    email                   TEXT NOT NULL UNIQUE,
    role                    TEXT NOT NULL CHECK (role IN ('operator','household')),
    display_name            TEXT NOT NULL,
    household_id            TEXT REFERENCES households(id),
    address                 TEXT,
    has_solar               INTEGER DEFAULT 0,
    has_battery             INTEGER DEFAULT 0,
    battery_model           TEXT,
    battery_capacity_kwh    REAL,
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','pending','inactive')),
    created_at              TEXT NOT NULL,
    updated_at              TEXT
);
"""


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection():
    """Backward-compatible helper — prefer db_connection() context manager."""
    import warnings

    warnings.warn("get_connection() is deprecated; use db_connection()", DeprecationWarning, stacklevel=2)
    return db_connection().__enter__()


def init_db() -> None:
    if use_postgres():
        schema_path = Path(__file__).resolve().parent.parent / "supabase" / "schema.sql"
        sql = schema_path.read_text(encoding="utf-8") if schema_path.is_file() else POSTGRES_SCHEMA
        statements = [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
        with db_connection() as conn:
            for stmt in statements:
                conn.execute(stmt)
    else:
        with db_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            _migrate_simulation_runs_sqlite(conn)
            _migrate_user_profiles_sqlite(conn)


def _migrate_simulation_runs_sqlite(conn) -> None:
    cols = {row[1] for row in conn.execute("PRAGMA table_info(simulation_runs)").fetchall()}
    if "barangay_id" not in cols:
        conn.execute("ALTER TABLE simulation_runs ADD COLUMN barangay_id INTEGER REFERENCES barangays(id)")


def _migrate_user_profiles_sqlite(conn) -> None:
    tables = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'"
        ).fetchall()
    }
    if "user_profiles" in tables:
        return
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS user_profiles (
            id                      TEXT PRIMARY KEY,
            email                   TEXT NOT NULL UNIQUE,
            role                    TEXT NOT NULL CHECK (role IN ('operator','household')),
            display_name            TEXT NOT NULL,
            household_id            TEXT REFERENCES households(id),
            address                 TEXT,
            has_solar               INTEGER DEFAULT 0,
            has_battery             INTEGER DEFAULT 0,
            battery_model           TEXT,
            battery_capacity_kwh    REAL,
            status                  TEXT NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','pending','inactive')),
            created_at              TEXT NOT NULL,
            updated_at              TEXT
        );
        """
    )


def _clear_seed_tables(conn) -> None:
    if use_postgres():
        conn.execute(
            """
            TRUNCATE hourly_energy_records, simulation_runs, datasets,
                     households, community_batteries, barangays
            RESTART IDENTITY CASCADE
            """
        )
    else:
        conn.execute("DELETE FROM hourly_energy_records")
        conn.execute("DELETE FROM simulation_runs")
        conn.execute("DELETE FROM datasets")
        conn.execute("DELETE FROM households")
        conn.execute("DELETE FROM community_batteries")
        conn.execute("DELETE FROM barangays")


def seed_database(force: bool = False) -> dict[str, Any]:
    """Seed barangay, households, and hourly records from csvmerged2 dataset."""
    from merged_dataset_loader import BATTERY_CAPACITY_KWH, dataset_info, expand_to_household_rows

    init_db()

    with db_connection() as conn:
        existing = fetchone(conn, "SELECT COUNT(*) AS n FROM households")["n"]
        if existing > 0 and not force:
            hourly = fetchone(conn, "SELECT COUNT(*) AS n FROM hourly_energy_records")["n"]
            return {
                "seeded": False,
                "reason": "already_seeded",
                "database": db_label(),
                "households": existing,
                "hourly_records": hourly,
            }

        if force:
            _clear_seed_tables(conn)

        now = _utc_now()
        info = dataset_info()

        barangay_id = insert_returning_id(
            conn,
            """
            INSERT INTO barangays
            (name, contact_email, location_lat, location_lon, timezone, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("Barangay Mabini", "operator@barangay.gov.ph", 7.1907, 125.4553, "Asia/Manila", now),
        )

        conn.execute(
            """
            INSERT INTO community_batteries
            (barangay_id, capacity_kwh, efficiency, min_soc_pct, max_soc_pct, max_charge_kw, max_discharge_kw, battery_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (barangay_id, info["battery_capacity_kwh"], 0.90, 20, 95, 5.0, 5.0, "LiFePO4"),
        )

        dataset_id = insert_returning_id(
            conn,
            """
            INSERT INTO datasets
            (dataset_id, source_file, household_count, hourly_rows, location, imported_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            """,
            (
                info["dataset_id"],
                info["source_file"],
                info["households"],
                info["hourly_rows"],
                info["location"],
                now,
            ),
        )

        expanded = expand_to_household_rows()
        if not expanded:
            raise RuntimeError("No rows loaded from dataset — check data/csvmerged2 (1).txt")

        household_ids = sorted({row["household_id"] for row in expanded})
        for hid in household_ids:
            sample = next(r for r in expanded if r["household_id"] == hid)
            circuit = CIRCUIT_MAP.get(hid, {})
            h_idx = int(hid.split("-")[1]) - 1
            conn.execute(
                """
                INSERT INTO households
                (id, barangay_id, head_name, purok, address, has_solar, has_battery,
                 battery_capacity_kwh, income_tier, status, circuit_key, circuit_name, registered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
                """,
                (
                    hid,
                    barangay_id,
                    sample["head_name"],
                    sample["purok"],
                    f"Circuit {chr(65 + (h_idx % 2))} · {sample['purok']}",
                    int(circuit.get("has_solar", True)),
                    int(sample.get("has_battery", "1") == "1"),
                    BATTERY_CAPACITY_KWH,
                    sample.get("income_tier", "mid"),
                    circuit.get("circuit_key"),
                    circuit.get("circuit_name"),
                    now,
                ),
            )

        hourly_count = 0
        for row in expanded:
            conn.execute(
                """
                INSERT INTO hourly_energy_records
                (dataset_id, household_id, hour, load_kwh, solar_kwh, net_load_kwh,
                 battery_soc_pct, grid_import_kwh, grid_export_kwh, tou_period, tou_rate_php)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    dataset_id,
                    row["household_id"],
                    int(row["hour"]),
                    float(row["load_kwh"]),
                    float(row["solar_kwh"]),
                    float(row["net_load_kwh"]),
                    float(row.get("battery_soc_pct") or 0),
                    float(row["grid_import_kwh"]),
                    float(row["grid_export_kwh"]),
                    row.get("tou_period") or "",
                    float(row["tou_rate_php"]) if row.get("tou_rate_php") else None,
                ),
            )
            hourly_count += 1

        return {
            "seeded": True,
            "database": db_label(),
            "barangay_id": barangay_id,
            "dataset_id": dataset_id,
            "households": len(household_ids),
            "hourly_records": hourly_count,
        }


def db_status() -> dict[str, Any]:
    base: dict[str, Any] = {
        "database": db_label(),
        "using_supabase": use_postgres(),
    }
    try:
        with db_connection() as conn:
            hh = fetchone(conn, "SELECT COUNT(*) AS n FROM households")["n"]
            runs = fetchone(conn, "SELECT COUNT(*) AS n FROM simulation_runs")["n"]
        return {
            **base,
            "connected": True,
            "households": int(hh),
            "simulation_runs": int(runs),
        }
    except Exception as exc:
        return {
            **base,
            "connected": False,
            "households": 0,
            "simulation_runs": 0,
            "error": str(exc),
        }


def get_active_dataset() -> dict | None:
    with db_connection() as conn:
        row = fetchone(
            conn,
            """
            SELECT d.*, b.name AS barangay_name
            FROM datasets d
            JOIN barangays b ON b.id = (SELECT barangay_id FROM households LIMIT 1)
            WHERE d.is_active = 1
            ORDER BY d.id DESC
            LIMIT 1
            """,
        )
    return row


def list_households() -> list[dict]:
    with db_connection() as conn:
        rows = fetchall(
            conn,
            """
            SELECT id, head_name, purok, address, has_solar, has_battery,
                   battery_capacity_kwh, income_tier, status, circuit_key, circuit_name
            FROM households
            ORDER BY id
            """,
        )
    for item in rows:
        item["has_solar"] = bool(item["has_solar"])
        item["has_battery"] = bool(item["has_battery"])
    return rows


def get_household(household_id: str) -> dict | None:
    with db_connection() as conn:
        row = fetchone(
            conn,
            """
            SELECT id, barangay_id, head_name, purok, address, has_solar, has_battery,
                   battery_capacity_kwh, battery_model, income_tier, status,
                   circuit_key, circuit_name, registered_at
            FROM households
            WHERE id = ?
            """,
            (household_id,),
        )
    if not row:
        return None
    row["has_solar"] = bool(row["has_solar"])
    row["has_battery"] = bool(row["has_battery"])
    return row


def load_hourly_rows_from_db() -> list[dict[str, str]]:
    with db_connection() as conn:
        dataset = fetchone(
            conn,
            "SELECT id FROM datasets WHERE is_active = 1 ORDER BY id DESC LIMIT 1",
        )
        if not dataset:
            return []

        rows = fetchall(
            conn,
            """
            SELECT h.household_id, hh.head_name, hh.purok, h.hour,
                   h.load_kwh, h.solar_kwh, h.net_load_kwh, h.battery_soc_pct,
                   h.grid_import_kwh, h.grid_export_kwh, h.tou_period, h.tou_rate_php,
                   hh.has_battery
            FROM hourly_energy_records h
            JOIN households hh ON hh.id = h.household_id
            WHERE h.dataset_id = ?
            ORDER BY h.household_id, h.hour
            """,
            (dataset["id"],),
        )

    return [
        {
            "household_id": r["household_id"],
            "head_name": r["head_name"],
            "purok": r["purok"],
            "hour": str(r["hour"]),
            "load_kwh": str(r["load_kwh"]),
            "solar_kwh": str(r["solar_kwh"]),
            "net_load_kwh": str(r["net_load_kwh"]),
            "battery_soc_pct": str(r["battery_soc_pct"]),
            "grid_import_kwh": str(r["grid_import_kwh"]),
            "grid_export_kwh": str(r["grid_export_kwh"]),
            "tou_period": r["tou_period"] or "",
            "tou_rate_php": str(r["tou_rate_php"]) if r["tou_rate_php"] is not None else "",
            "has_battery": "1" if r["has_battery"] else "0",
        }
        for r in rows
    ]


def household_count() -> int:
    with db_connection() as conn:
        return int(fetchone(conn, "SELECT COUNT(*) AS n FROM households")["n"])


def save_run(
    algorithm: str,
    households: int,
    battery_capacity_kwh: float,
    execution_ms: float,
    params: dict,
    results: dict,
    barangay_id: int | None = None,
) -> int:
    with db_connection() as conn:
        if barangay_id is None:
            row = fetchone(conn, "SELECT id FROM barangays ORDER BY id LIMIT 1")
            barangay_id = int(row["id"]) if row else None

        params_json = json.dumps(params)
        results_json = json.dumps(results)

        return insert_returning_id(
            conn,
            """
            INSERT INTO simulation_runs
            (barangay_id, created_at, algorithm, households, battery_capacity_kwh,
             execution_ms, params_json, results_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                barangay_id,
                _utc_now(),
                algorithm,
                households,
                battery_capacity_kwh,
                execution_ms,
                params_json,
                results_json,
            ),
        )


def list_runs(limit: int = 20) -> list[dict]:
    with db_connection() as conn:
        return fetchall(
            conn,
            """
            SELECT id, created_at, algorithm, households, battery_capacity_kwh, execution_ms
            FROM simulation_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )


def get_run(run_id: int) -> dict | None:
    with db_connection() as conn:
        row = fetchone(conn, "SELECT * FROM simulation_runs WHERE id = ?", (run_id,))
    if not row:
        return None
    data = dict(row)
    params_raw = data.pop("params_json")
    results_raw = data.pop("results_json")
    data["params"] = params_raw if isinstance(params_raw, dict) else json.loads(params_raw)
    data["results"] = results_raw if isinstance(results_raw, dict) else json.loads(results_raw)
    return data


def _profile_row_to_dict(row: Any) -> dict:
    data = dict(row)
    data["has_solar"] = bool(data.get("has_solar"))
    data["has_battery"] = bool(data.get("has_battery"))
    return data


def get_user_profile(auth_user_id: str) -> dict | None:
    with db_connection() as conn:
        row = fetchone(conn, "SELECT * FROM user_profiles WHERE id = ?", (auth_user_id,))
    if not row:
        return None
    profile = _profile_row_to_dict(row)
    if profile.get("household_id"):
        hh = get_household(profile["household_id"])
        if hh:
            profile["circuit_name"] = hh.get("circuit_name")
            profile["house_label"] = hh.get("head_name")
    return profile


def upsert_user_profile(
    auth_user_id: str,
    email: str,
    *,
    role: str,
    display_name: str,
    household_id: str | None = None,
    address: str | None = None,
    has_solar: bool = False,
    has_battery: bool = False,
    battery_model: str | None = None,
    battery_capacity_kwh: float | None = None,
) -> dict:
    if role not in ("operator", "household"):
        raise ValueError("role must be operator or household")
    if household_id and not get_household(household_id):
        raise ValueError(f"Household {household_id} not found")

    status = "active" if role == "operator" or household_id else "pending"
    now = _utc_now()
    existing = get_user_profile(auth_user_id)

    with db_connection() as conn:
        if existing:
            conn.execute(
                """
                UPDATE user_profiles SET
                    email = ?, role = ?, display_name = ?, household_id = ?,
                    address = ?, has_solar = ?, has_battery = ?,
                    battery_model = ?, battery_capacity_kwh = ?,
                    status = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    email.lower(),
                    role,
                    display_name,
                    household_id,
                    address,
                    int(has_solar),
                    int(has_battery),
                    battery_model,
                    battery_capacity_kwh,
                    status,
                    now,
                    auth_user_id,
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO user_profiles (
                    id, email, role, display_name, household_id, address,
                    has_solar, has_battery, battery_model, battery_capacity_kwh,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    auth_user_id,
                    email.lower(),
                    role,
                    display_name,
                    household_id,
                    address,
                    int(has_solar),
                    int(has_battery),
                    battery_model,
                    battery_capacity_kwh,
                    status,
                    now,
                    now,
                ),
            )

    profile = get_user_profile(auth_user_id)
    if not profile:
        raise RuntimeError("Failed to save user profile")
    return profile
