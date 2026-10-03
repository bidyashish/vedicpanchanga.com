"""Cloudflare R2 object storage via the S3-compatible API (boto3).

Used by ``backup.py`` to keep off-box copies of the SQLite database. R2 was
chosen over storing charts there directly because the per-request S3 round
trip (and eventual-consistency handling) buys nothing over a WAL SQLite file
on the same disk for a few thousand tiny rows; it does buy durability when
used as a backup target.

Configuration: ``R2_ACCOUNT_ID``, ``R2_ACCESS_KEY_ID``,
``R2_SECRET_ACCESS_KEY``, ``R2_BUCKET`` (and optional ``R2_PREFIX``, default
``backups/``). Unset = ``is_configured()`` False.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional


def _env(name: str) -> Optional[str]:
    return os.environ.get(name, "").strip() or None


def is_configured() -> bool:
    return all(
        _env(v)
        for v in (
            "R2_ACCOUNT_ID",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
            "R2_BUCKET",
        )
    )


def bucket() -> str:
    return _env("R2_BUCKET") or ""


def prefix() -> str:
    p = _env("R2_PREFIX") or "backups/"
    return p if p.endswith("/") else p + "/"


def client() -> Any:
    """Return a boto3 S3 client pointed at the account's R2 endpoint."""
    import boto3  # imported lazily: only the backup job needs it
    from botocore.config import Config

    account = _env("R2_ACCOUNT_ID")
    if not is_configured():
        raise RuntimeError("R2 not configured")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_env("R2_SECRET_ACCESS_KEY"),
        region_name="auto",
        config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
    )


def upload_file(path: Path, key: str) -> None:
    client().upload_file(str(path), bucket(), key)


def download_file(key: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    client().download_file(bucket(), key, str(path))


def list_keys(key_prefix: Optional[str] = None) -> list[dict[str, Any]]:
    """Objects under the prefix as ``{"key", "size", "last_modified"}``,
    oldest first."""
    out: list[dict[str, Any]] = []
    paginator = client().get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket(), Prefix=key_prefix or prefix()):
        for obj in page.get("Contents", []):
            out.append(
                {
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                }
            )
    out.sort(key=lambda o: o["last_modified"])
    return out


def delete_keys(keys: list[str]) -> None:
    if not keys:
        return
    client().delete_objects(
        Bucket=bucket(), Delete={"Objects": [{"Key": k} for k in keys], "Quiet": True}
    )
