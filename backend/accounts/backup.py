"""Mirror the accounts database to Cloudflare D1, and pull it back.

    python -m accounts.backup sync              # local SQLite -> D1 (default)
    python -m accounts.backup sync --force      # push even if nothing changed
    python -m accounts.backup status            # local vs remote row counts
    python -m accounts.backup restore [--to PATH] [--force]   # D1 -> SQLite

The live database is the SQLite file on the VPS. D1 is a replica that exists
so a dead server costs at most one timer interval of data. ``sync`` is
idempotent and never leaves the replica empty:

1. take a consistent in-memory snapshot (SQLite online backup API),
2. fingerprint every row; if nothing changed since the last successful sync
   and D1's row counts still match, stop (most 15-minute runs cost one
   small request),
3. make sure D1 has the schema (the same ``CREATE TABLE IF NOT EXISTS`` text
   ``db.py`` uses locally),
4. delete rows D1 has that the snapshot does not (children first),
5. upsert every snapshot row (``INSERT ... ON CONFLICT(pk) DO UPDATE``),
   parents first,
6. record the fingerprint in ``<data dir>/d1-sync.json``.

Values are inlined as SQL literals because D1's HTTP API allows at most 100
bound parameters per statement (fewer than one ``users`` row needs), so
``_literal`` is the one function that has to be exactly right. Statements stay
well under D1's 100 KB cap and several are packed into each request.

D1 keeps 30 days of point-in-time history ("Time Travel"). That also covers
an application bug deleting rows: the deletion reaches the replica within 15
minutes, but ``wrangler d1 time-travel restore`` can wind D1 back before you
pull it down with ``restore``.

Installed as ``panchanga-backup.timer`` (every 15 minutes) by
``infra/setup-vps.sh``; the job loads ``backend/.env`` + ``.env.local`` the
same way the API does.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv

from . import d1
from .db import BACKEND_DIR, MIGRATIONS, SCHEMA, db_path, now_iso

# Parents before children: upserts run in this order, deletes in reverse.
TABLES = ("users", "charts", "password_resets", "billing_events")
PRIMARY_KEY = {
    "users": "id",
    "charts": "id",
    "password_resets": "token_hash",
    "billing_events": "id",
}
MAX_STATEMENT_BYTES = 60_000  # D1 caps a single statement at 100 KB
MAX_REQUEST_BYTES = 700_000  # keep each HTTP body comfortably small
DELETE_CHUNK = 400
RESTORE_PAGE = 500
STATE_FILE = "d1-sync.json"


def _load_env() -> None:
    load_dotenv(BACKEND_DIR / ".env")
    load_dotenv(BACKEND_DIR / ".env.local", override=True)


# ── sync state ───────────────────────────────────────────────────────────


def state_path() -> Path:
    return db_path().parent / STATE_FILE


def _read_state() -> dict[str, Any]:
    try:
        return json.loads(state_path().read_text())
    except (OSError, ValueError):
        return {}


def _write_state(state: dict[str, Any]) -> None:
    path = state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2))
    os.replace(tmp, path)


# ── local snapshot ───────────────────────────────────────────────────────


def snapshot() -> sqlite3.Connection:
    """Consistent in-memory copy of the live database (online backup API), so
    uvicorn can keep writing while we read."""
    src_path = db_path()
    if not src_path.exists():
        raise FileNotFoundError(f"database not found: {src_path}")
    src = sqlite3.connect(src_path, timeout=30)
    mem = sqlite3.connect(":memory:")
    try:
        src.backup(mem)
    finally:
        src.close()
    return mem


def _columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})")]


def _table_rows(conn: sqlite3.Connection, table: str) -> list[tuple]:
    pk = PRIMARY_KEY[table]
    return [tuple(r) for r in conn.execute(f"SELECT * FROM {table} ORDER BY {pk}")]


def _counts(conn: sqlite3.Connection) -> dict[str, int]:
    return {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in TABLES}


def fingerprint(conn: sqlite3.Connection) -> str:
    digest = hashlib.sha256()
    for table in TABLES:
        digest.update(table.encode())
        digest.update(",".join(_columns(conn, table)).encode())
        for row in _table_rows(conn, table):
            digest.update(repr(row).encode())
    return digest.hexdigest()


# ── SQL generation ───────────────────────────────────────────────────────


def _literal(value: Any) -> str:
    """Render a Python value as a SQLite literal. Only the storage classes
    SQLite itself produces can arrive here, because the source is a SQLite
    snapshot."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if value != value or value in (float("inf"), float("-inf")):
            return "NULL"  # no literal form; the schema never stores these
        return repr(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        return "X'" + bytes(value).hex() + "'"
    text = str(value)
    if "\x00" in text:
        raise ValueError("NUL byte in text value cannot be sent as a SQL literal")
    return "'" + text.replace("'", "''") + "'"


def _upsert_statements(table: str, columns: list[str], rows: list[tuple]) -> list[str]:
    pk = PRIMARY_KEY[table]
    col_list = ", ".join(columns)
    updates = ", ".join(f"{c}=excluded.{c}" for c in columns if c != pk)
    conflict = (
        f"ON CONFLICT({pk}) DO UPDATE SET {updates}"
        if updates
        else f"ON CONFLICT({pk}) DO NOTHING"
    )
    head = f"INSERT INTO {table} ({col_list}) VALUES "
    statements: list[str] = []
    batch: list[str] = []
    size = 0
    for row in rows:
        tup = "(" + ", ".join(_literal(v) for v in row) + ")"
        if batch and size + len(tup) > MAX_STATEMENT_BYTES:
            statements.append(head + ", ".join(batch) + " " + conflict + ";")
            batch, size = [], 0
        batch.append(tup)
        size += len(tup) + 2
    if batch:
        statements.append(head + ", ".join(batch) + " " + conflict + ";")
    return statements


def _delete_statements(table: str, ids: list[Any]) -> list[str]:
    pk = PRIMARY_KEY[table]
    out = []
    for i in range(0, len(ids), DELETE_CHUNK):
        chunk = ", ".join(_literal(v) for v in ids[i : i + DELETE_CHUNK])
        out.append(f"DELETE FROM {table} WHERE {pk} IN ({chunk});")
    return out


def _send(statements: list[str]) -> int:
    """Pack statements into as few requests as the body limit allows.
    Returns the number of requests made."""
    sent = 0
    buf: list[str] = []
    size = 0
    for stmt in statements:
        if buf and size + len(stmt) > MAX_REQUEST_BYTES:
            d1.query("\n".join(buf))
            sent += 1
            buf, size = [], 0
        buf.append(stmt)
        size += len(stmt) + 1
    if buf:
        d1.query("\n".join(buf))
        sent += 1
    return sent


# ── remote side ──────────────────────────────────────────────────────────


def ensure_remote_schema() -> None:
    d1.query(SCHEMA)
    for version in sorted(MIGRATIONS):
        for stmt in MIGRATIONS[version]:
            try:
                d1.query(stmt)
            except d1.D1Error as exc:
                if "duplicate column" not in str(exc).lower():
                    raise


def _remote_counts() -> Optional[dict[str, int]]:
    """Row counts on D1, or None when the schema is not there yet."""
    selects = ", ".join(f"(SELECT COUNT(*) FROM {t}) AS {t}" for t in TABLES)
    try:
        result = d1.rows(f"SELECT {selects};")
    except d1.D1Error:
        return None
    if not result:
        return None
    return {t: int(result[0][t]) for t in TABLES}


def _summary(counts: dict[str, int]) -> str:
    return ", ".join(f"{t}={n}" for t, n in counts.items())


# ── commands ─────────────────────────────────────────────────────────────


def run_sync(force: bool = False) -> str:
    if not d1.is_configured():
        return (
            "D1 not configured (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, "
            "D1_DATABASE_ID); nothing to do"
        )
    if not db_path().exists():
        return f"no database at {db_path()} yet; nothing to sync"

    snap = snapshot()
    try:
        fp = fingerprint(snap)
        local_counts = _counts(snap)
        state = _read_state()
        if (
            not force
            and state.get("fingerprint") == fp
            and _remote_counts() == local_counts
        ):
            return f"unchanged since {state.get('synced_at')}; nothing to push"

        ensure_remote_schema()
        data = {t: (_columns(snap, t), _table_rows(snap, t)) for t in TABLES}

        deleted = 0
        for table in reversed(TABLES):
            pk = PRIMARY_KEY[table]
            cols, rows = data[table]
            idx = cols.index(pk)
            local_ids = {row[idx] for row in rows}
            remote_ids = {r[pk] for r in d1.rows(f"SELECT {pk} FROM {table};")}
            stale = sorted(remote_ids - local_ids)
            if stale:
                _send(_delete_statements(table, stale))
                deleted += len(stale)

        for table in TABLES:
            cols, rows = data[table]
            if rows:
                _send(_upsert_statements(table, cols, rows))

        _write_state({"fingerprint": fp, "synced_at": now_iso(), "rows": local_counts})
        return f"synced to D1: {_summary(local_counts)}; removed {deleted} stale row(s)"
    finally:
        snap.close()


def run_restore(to: Path, force: bool = False) -> str:
    if not d1.is_configured():
        raise RuntimeError("D1 not configured; nothing to restore from")
    if to.exists() and not force:
        raise FileExistsError(f"{to} exists; pass --force to overwrite it")
    to.parent.mkdir(parents=True, exist_ok=True)
    tmp = to.with_name(to.name + ".restoring")
    tmp.unlink(missing_ok=True)

    counts: dict[str, int] = {}
    conn = sqlite3.connect(tmp)
    try:
        conn.executescript(SCHEMA)
        for version in sorted(MIGRATIONS):
            for stmt in MIGRATIONS[version]:
                conn.execute(stmt)
        conn.execute(f"PRAGMA user_version={max(MIGRATIONS) if MIGRATIONS else 1}")
        for table in TABLES:
            cols = _columns(conn, table)
            pk = PRIMARY_KEY[table]
            col_list = ", ".join(cols)
            placeholders = ", ".join("?" for _ in cols)
            offset = 0
            while True:
                page = d1.rows(
                    f"SELECT {col_list} FROM {table} ORDER BY {pk} "
                    f"LIMIT {RESTORE_PAGE} OFFSET {offset};"
                )
                if not page:
                    break
                conn.executemany(
                    f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})",
                    [tuple(r.get(c) for c in cols) for r in page],
                )
                offset += len(page)
                if len(page) < RESTORE_PAGE:
                    break
            counts[table] = offset
        conn.commit()
    finally:
        conn.close()

    # A previous database at `to` may have WAL side files; they must not be
    # applied to the restored file.
    for suffix in ("-wal", "-shm"):
        Path(str(to) + suffix).unlink(missing_ok=True)
    os.replace(tmp, to)
    return f"restored D1 to {to}: {_summary(counts)}"


def run_status() -> str:
    lines = []
    path = db_path()
    if path.exists():
        snap = snapshot()
        try:
            lines.append(f"local  {path}: {_summary(_counts(snap))}")
        finally:
            snap.close()
    else:
        lines.append(f"local  {path}: no database yet")
    if d1.is_configured():
        remote = _remote_counts()
        lines.append(
            f"remote D1 {d1.database_id()}: "
            + (_summary(remote) if remote else "no schema yet (never synced)")
        )
    else:
        lines.append("remote D1: not configured")
    state = _read_state()
    lines.append(f"last sync: {state.get('synced_at', 'never')}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    _load_env()
    parser = argparse.ArgumentParser(prog="python -m accounts.backup")
    sub = parser.add_subparsers(dest="cmd")
    s = sub.add_parser("sync", help="push the local database to D1 (default)")
    s.add_argument("--force", action="store_true", help="push even if unchanged")
    sub.add_parser("status", help="local vs remote row counts and last sync time")
    r = sub.add_parser("restore", help="rebuild a local SQLite file from D1")
    r.add_argument(
        "--to", default=str(db_path()), help="target file (default: DATABASE_PATH)"
    )
    r.add_argument("--force", action="store_true", help="overwrite an existing target")
    args = parser.parse_args(argv)

    cmd = args.cmd or "sync"
    try:
        if cmd == "sync":
            print(run_sync(force=getattr(args, "force", False)))
        elif cmd == "status":
            print(run_status())
        elif cmd == "restore":
            print(run_restore(Path(args.to), force=args.force))
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
