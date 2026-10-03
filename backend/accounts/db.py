"""SQLite connection + schema for the accounts subpackage.

One file, WAL journal, created lazily on first use. ``DATABASE_PATH`` is read
on every ``connect()`` (not at import) so tests can point each run at a
``tmp_path`` with ``monkeypatch.setenv`` - the same per-request pattern
``auth.py`` uses for ``API_KEYS``.

WAL mode matters because production runs two uvicorn workers: readers never
block the writer and the writer never blocks readers, and ``busy_timeout``
covers the rare write/write collision. All timestamps are ISO-8601 UTC strings
so they sort lexically and need no SQLite date functions.

Schema changes: append ``ALTER TABLE`` statements to ``MIGRATIONS`` keyed by
the next version number. ``_ensure_schema`` applies anything above the stored
``PRAGMA user_version`` exactly once.
"""

from __future__ import annotations

import os
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "app.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id                   TEXT PRIMARY KEY,
    email                TEXT NOT NULL UNIQUE,
    name                 TEXT,
    picture              TEXT,
    password_hash        TEXT,
    google_sub           TEXT UNIQUE,
    created_at           TEXT NOT NULL,
    last_login_at        TEXT,
    premium_until        TEXT,
    stripe_customer_id   TEXT UNIQUE,
    stripe_subscription_id TEXT,
    subscription_status  TEXT,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS charts (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT '',
    sex         TEXT,
    birth_date  TEXT NOT NULL,
    birth_time  TEXT NOT NULL,
    latitude    REAL NOT NULL,
    longitude   REAL NOT NULL,
    timezone    TEXT,
    place_name  TEXT NOT NULL DEFAULT '',
    ayanamsa    TEXT NOT NULL DEFAULT 'lahiri',
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS charts_user_updated ON charts(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS password_resets (
    token_hash  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_events (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    received_at TEXT NOT NULL
);
"""

# version -> list of statements. Version 1 is the base SCHEMA above.
MIGRATIONS: dict[int, list[str]] = {}

_initialized: set[str] = set()
_init_lock = threading.Lock()


def db_path() -> Path:
    raw = os.environ.get("DATABASE_PATH", "").strip()
    return Path(raw) if raw else DEFAULT_DB_PATH


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id() -> str:
    return uuid.uuid4().hex


def _ensure_schema(path: Path) -> None:
    key = str(path)
    if key in _initialized:
        return
    with _init_lock:
        if key in _initialized:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(path, timeout=10)
        try:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript(SCHEMA)
            version = conn.execute("PRAGMA user_version").fetchone()[0]
            for target in sorted(v for v in MIGRATIONS if v > version):
                for stmt in MIGRATIONS[target]:
                    conn.execute(stmt)
                conn.execute(f"PRAGMA user_version={target}")
            if not MIGRATIONS and version == 0:
                conn.execute("PRAGMA user_version=1")
            conn.commit()
        finally:
            conn.close()
        _initialized.add(key)


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Open a connection with row access by column name. Commits on clean exit,
    rolls back if the block raises."""
    path = db_path()
    _ensure_schema(path)
    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=10000")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def reset_schema_cache() -> None:
    """Forget which paths have been initialised. Tests call this after
    switching ``DATABASE_PATH``; production never needs it."""
    with _init_lock:
        _initialized.clear()
