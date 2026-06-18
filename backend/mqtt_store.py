"""Persist MQTT live state to PostgreSQL/SQLite for Vercel serverless."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from db_backend import db_connection, fetchone, use_postgres


def ensure_mqtt_cache_table(conn) -> None:
    if use_postgres():
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mqtt_live_cache (
                cache_key TEXT PRIMARY KEY,
                state_json JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    else:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mqtt_live_cache (
                cache_key TEXT PRIMARY KEY,
                state_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )


def save_mqtt_state(state: dict[str, Any]) -> None:
    payload = json.dumps(state)
    now = datetime.now(timezone.utc).isoformat()
    with db_connection() as conn:
        ensure_mqtt_cache_table(conn)
        if use_postgres():
            conn.execute(
                """
                INSERT INTO mqtt_live_cache (cache_key, state_json, updated_at)
                VALUES ('default', ?::jsonb, ?)
                ON CONFLICT (cache_key) DO UPDATE
                SET state_json = EXCLUDED.state_json, updated_at = EXCLUDED.updated_at
                """,
                (payload, now),
            )
        else:
            conn.execute(
                """
                INSERT INTO mqtt_live_cache (cache_key, state_json, updated_at)
                VALUES ('default', ?, ?)
                ON CONFLICT (cache_key) DO UPDATE
                SET state_json = excluded.state_json, updated_at = excluded.updated_at
                """,
                (payload, now),
            )


def load_mqtt_state() -> dict[str, Any] | None:
    try:
        with db_connection() as conn:
            ensure_mqtt_cache_table(conn)
            row = fetchone(
                conn,
                "SELECT state_json, updated_at FROM mqtt_live_cache WHERE cache_key = 'default'",
            )
        if not row:
            return None
        raw = row["state_json"]
        if isinstance(raw, str):
            data = json.loads(raw)
        else:
            data = dict(raw)
        data["_cached_at"] = row.get("updated_at")
        return data
    except Exception:
        return None
