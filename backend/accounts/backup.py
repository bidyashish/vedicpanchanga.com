"""Snapshot the accounts database and copy it to Cloudflare R2.

    python -m accounts.backup backup     # snapshot + upload + prune (default)
    python -m accounts.backup list       # show remote backups
    python -m accounts.backup restore KEY [--to PATH]

``backup`` uses SQLite's online backup API (``Connection.backup``) so the
snapshot is consistent even while uvicorn is writing, gzips it, uploads it
as ``<prefix>app-YYYYMMDDTHHMMSSZ.db.gz`` and keeps only the newest
``BACKUP_KEEP`` (default 30) objects. With R2 unconfigured it still writes a
local snapshot next to the database so the systemd timer is harmless on a
box that has not been given credentials yet.

Installed as ``panchanga-backup.timer`` (daily) by ``infra/setup-vps.sh``;
the service loads ``backend/.env`` + ``backend/.env.local`` the same way the
API does.
"""

from __future__ import annotations

import argparse
import gzip
import os
import shutil
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from . import storage
from .db import BACKEND_DIR, db_path


def _load_env() -> None:
    load_dotenv(BACKEND_DIR / ".env")
    load_dotenv(BACKEND_DIR / ".env.local", override=True)


def snapshot(dest: Path) -> Path:
    """Consistent copy of the live database at ``dest`` (uncompressed)."""
    src = db_path()
    if not src.exists():
        raise FileNotFoundError(f"database not found: {src}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(src, timeout=30) as source, sqlite3.connect(dest) as target:
        source.backup(target)
    return dest


def run_backup(keep: int) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    with tempfile.TemporaryDirectory() as tmp:
        raw = snapshot(Path(tmp) / "app.db")
        gz = Path(tmp) / f"app-{stamp}.db.gz"
        with open(raw, "rb") as fin, gzip.open(gz, "wb", compresslevel=6) as fout:
            shutil.copyfileobj(fin, fout)

        if not storage.is_configured():
            local = db_path().parent / "backups" / gz.name
            local.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(gz, local)
            _prune_local(local.parent, keep)
            return f"R2 not configured; local snapshot written to {local}"

        key = f"{storage.prefix()}{gz.name}"
        storage.upload_file(gz, key)
        objects = storage.list_keys()
        extra = [o["key"] for o in objects[:-keep]] if len(objects) > keep else []
        storage.delete_keys(extra)
        return f"uploaded {key} ({gz.stat().st_size} bytes), pruned {len(extra)}"


def _prune_local(folder: Path, keep: int) -> None:
    files = sorted(folder.glob("app-*.db.gz"))
    for old in files[:-keep] if len(files) > keep else []:
        old.unlink(missing_ok=True)


def run_restore(key: str, to: Path) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        gz = Path(tmp) / "restore.db.gz"
        storage.download_file(key, gz)
        to.parent.mkdir(parents=True, exist_ok=True)
        with gzip.open(gz, "rb") as fin, open(to, "wb") as fout:
            shutil.copyfileobj(fin, fout)
    # sanity check: it must open and contain the users table
    with sqlite3.connect(to) as conn:
        conn.execute("SELECT COUNT(*) FROM users").fetchone()
    return f"restored {key} to {to}"


def main(argv: list[str] | None = None) -> int:
    _load_env()
    parser = argparse.ArgumentParser(prog="python -m accounts.backup")
    sub = parser.add_subparsers(dest="cmd")
    b = sub.add_parser("backup", help="snapshot, upload to R2, prune old copies")
    b.add_argument("--keep", type=int, default=int(os.environ.get("BACKUP_KEEP", "30")))
    sub.add_parser("list", help="list remote backups")
    r = sub.add_parser("restore", help="download a backup to a local path")
    r.add_argument("key")
    r.add_argument("--to", default=str(db_path().with_suffix(".restored.db")))
    args = parser.parse_args(argv)

    cmd = args.cmd or "backup"
    try:
        if cmd == "backup":
            print(run_backup(args.keep if hasattr(args, "keep") else 30))
        elif cmd == "list":
            if not storage.is_configured():
                print("R2 not configured")
                return 1
            for o in storage.list_keys():
                print(f"{o['last_modified']}  {o['size']:>10}  {o['key']}")
        elif cmd == "restore":
            print(run_restore(args.key, Path(args.to)))
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
