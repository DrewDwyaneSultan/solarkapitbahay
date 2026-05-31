"""SQLite persistence for simulation runs."""

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

_DEFAULT = Path(__file__).parent / "solarkapitbahay.db"
# Serverless hosts (Vercel) only allow writes under /tmp.
DB_PATH = Path(os.getenv("DATABASE_PATH", str(_DEFAULT if not os.getenv("VERCEL") else "/tmp/solarkapitbahay.db")))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS simulation_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                algorithm TEXT NOT NULL,
                households INTEGER NOT NULL,
                battery_capacity_kwh REAL NOT NULL,
                execution_ms REAL NOT NULL,
                params_json TEXT NOT NULL,
                results_json TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_run(
    algorithm: str,
    households: int,
    battery_capacity_kwh: float,
    execution_ms: float,
    params: dict,
    results: dict,
) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO simulation_runs
            (created_at, algorithm, households, battery_capacity_kwh, execution_ms, params_json, results_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                algorithm,
                households,
                battery_capacity_kwh,
                execution_ms,
                json.dumps(params),
                json.dumps(results),
            ),
        )
        conn.commit()
        return int(cur.lastrowid)


def list_runs(limit: int = 20) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, created_at, algorithm, households, battery_capacity_kwh, execution_ms
            FROM simulation_runs
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_run(run_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM simulation_runs WHERE id = ?",
            (run_id,),
        ).fetchone()
    if not row:
        return None
    data = dict(row)
    data["params"] = json.loads(data.pop("params_json"))
    data["results"] = json.loads(data.pop("results_json"))
    return data
