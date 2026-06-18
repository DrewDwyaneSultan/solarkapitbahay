"""Database connection layer — SQLite (local) or PostgreSQL (Supabase / DATABASE_URL)."""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

try:
    from dotenv import load_dotenv

    _root = Path(__file__).resolve().parent.parent
    load_dotenv(_root / ".env")
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

_DEFAULT = Path(__file__).parent / "solarkapitbahay.db"
DB_PATH = Path(
    os.getenv("DATABASE_PATH", str(_DEFAULT if not os.getenv("VERCEL") else "/tmp/solarkapitbahay.db"))
)
_PLACEHOLDER_MARKERS = (
    "YOUR_PASSWORD",
    "YOUR_PROJECT_REF",
    "[YOUR-PASSWORD]",
    "xxxxx",
    "your_password",
)


def _resolve_database_url() -> str | None:
    raw = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not raw:
        return None
    if any(marker in raw for marker in _PLACEHOLDER_MARKERS):
        return None
    return raw


DATABASE_URL = _resolve_database_url()


def use_postgres() -> bool:
    return bool(DATABASE_URL)


def db_label() -> str:
    return "postgresql" if use_postgres() else "sqlite"


class _PgConn:
    """Thin wrapper so database.py can use the same patterns for Postgres."""

    def __init__(self, conn: Any) -> None:
        self._conn = conn
        self._cur = conn.cursor()
        self._last_id: int | None = None

    def execute(self, sql: str, params: tuple | list = ()) -> _PgConn:
        self._cur.execute(sql.replace("?", "%s"), params)
        if self._cur.description and "RETURNING" in sql.upper():
            row = self._cur.fetchone()
            if row:
                self._last_id = row[0]
        return self

    def executemany(self, sql: str, params_list: list[tuple]) -> None:
        self._cur.executemany(sql.replace("?", "%s"), params_list)

    def fetchone(self) -> dict | None:
        row = self._cur.fetchone()
        if row is None:
            return None
        cols = [d[0] for d in self._cur.description]
        return dict(zip(cols, row))

    def fetchall(self) -> list[dict]:
        rows = self._cur.fetchall()
        if not rows:
            return []
        cols = [d[0] for d in self._cur.description]
        return [dict(zip(cols, r)) for r in rows]

    @property
    def lastrowid(self) -> int | None:
        return self._last_id


class _SqliteConn:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def execute(self, sql: str, params: tuple | list = ()) -> sqlite3.Cursor:
        return self._conn.execute(sql, params)

    def executemany(self, sql: str, params_list: list[tuple]) -> None:
        self._conn.executemany(sql, params_list)

    def fetchone(self) -> sqlite3.Row | None:
        raise RuntimeError("Use cursor from execute() for SQLite fetchone")

    def fetchall(self) -> list:
        raise RuntimeError("Use cursor from execute() for SQLite fetchall")

    @property
    def lastrowid(self) -> int | None:
        raise RuntimeError("Use cursor.lastrowid for SQLite")


@contextmanager
def db_connection() -> Iterator[Any]:
    if use_postgres():
        import psycopg2

        connect_kwargs: dict[str, Any] = {}
        if DATABASE_URL and "sslmode=" not in DATABASE_URL:
            connect_kwargs["sslmode"] = "require"

        conn = psycopg2.connect(DATABASE_URL, **connect_kwargs)
        wrapper = _PgConn(conn)
        try:
            yield wrapper
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def _row_to_dict(row: Any) -> dict:
    if row is None:
        return {}
    if isinstance(row, sqlite3.Row):
        return dict(row)
    return dict(row)


def fetchone(conn: Any, sql: str, params: tuple = ()) -> dict | None:
    if use_postgres():
        conn.execute(sql, params)
        return conn.fetchone()
    row = conn.execute(sql, params).fetchone()
    return _row_to_dict(row) if row else None


def fetchall(conn: Any, sql: str, params: tuple = ()) -> list[dict]:
    if use_postgres():
        conn.execute(sql, params)
        return conn.fetchall()
    return [_row_to_dict(r) for r in conn.execute(sql, params).fetchall()]


def insert_returning_id(conn: Any, sql: str, params: tuple) -> int:
    if use_postgres():
        if "RETURNING" not in sql.upper():
            sql = sql.rstrip().rstrip(";") + " RETURNING id"
        conn.execute(sql, params)
        if conn.lastrowid is None:
            raise RuntimeError("INSERT did not return an id")
        return int(conn.lastrowid)
    cur = conn.execute(sql, params)
    return int(cur.lastrowid)
