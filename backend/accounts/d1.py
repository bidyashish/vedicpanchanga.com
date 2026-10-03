"""Cloudflare D1 over its HTTP API (stdlib ``urllib``, no SDK).

Used only by ``backup.py`` to mirror the local SQLite database into a D1
database in the same Cloudflare account, so the data survives losing the VPS.
The live application never reads from D1: every request is served by the local
file, and the replica is at most one ``panchanga-backup.timer`` interval
(15 minutes) behind.

Configuration (``backend/.env.local``):

* ``CLOUDFLARE_ACCOUNT_ID`` - from the dashboard sidebar or ``wrangler whoami``.
* ``CLOUDFLARE_API_TOKEN``  - API token with the "D1 Edit" permission. Same
  variable names wrangler reads, so ``wrangler d1 ...`` works on the box with
  the same values.
* ``D1_DATABASE_ID``        - the ``database_id`` printed by
  ``wrangler d1 create <name>`` (also on the database page in the dashboard).

Unset = ``is_configured()`` is False and the sync job exits quietly.

Limits that shape ``backup.py``: one statement may be at most 100 KB and at
most 100 bound parameters, so values are inlined as literals and rows are
inserted in modest batches; several statements can travel in one request.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Optional

API_BASE = "https://api.cloudflare.com/client/v4"
_RETRY_STATUSES = {429, 500, 502, 503, 504}


class D1Error(RuntimeError):
    """Cloudflare rejected the request or returned success=false."""


def _env(name: str) -> Optional[str]:
    return os.environ.get(name, "").strip() or None


def is_configured() -> bool:
    return all(
        _env(v)
        for v in ("CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "D1_DATABASE_ID")
    )


def database_id() -> str:
    return _env("D1_DATABASE_ID") or ""


def _url() -> str:
    return f"{API_BASE}/accounts/{_env('CLOUDFLARE_ACCOUNT_ID')}/d1/database/{database_id()}/query"


def query(sql: str) -> list[dict[str, Any]]:
    """Run one or more ``;``-terminated statements in a single request.

    Returns D1's per-statement result list, each entry shaped like
    ``{"results": [...rows as dicts...], "success": True, "meta": {...}}``.
    Retries transient failures a couple of times; raises ``D1Error`` otherwise.
    """
    if not is_configured():
        raise D1Error("D1 not configured")
    body = json.dumps({"sql": sql}).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {_env('CLOUDFLARE_API_TOKEN')}",
        "Content-Type": "application/json",
        "User-Agent": "vedicpanchanga-backup",
    }
    last_error: Optional[Exception] = None
    for attempt in range(3):
        req = urllib.request.Request(_url(), data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.loads(resp.read() or b"{}")
            break
        except urllib.error.HTTPError as exc:
            text = exc.read().decode("utf-8", "replace")[:800]
            if exc.code in _RETRY_STATUSES and attempt < 2:
                last_error = exc
                time.sleep(2**attempt)
                continue
            raise D1Error(f"D1 HTTP {exc.code}: {text}") from exc
        except urllib.error.URLError as exc:
            if attempt < 2:
                last_error = exc
                time.sleep(2**attempt)
                continue
            raise D1Error(f"D1 unreachable: {exc}") from exc
    else:  # pragma: no cover - loop always breaks or raises
        raise D1Error(f"D1 request failed: {last_error}")

    if not payload.get("success"):
        raise D1Error(f"D1 error: {payload.get('errors') or payload}")
    return list(payload.get("result") or [])


def rows(sql: str) -> list[dict[str, Any]]:
    """Rows of a single SELECT statement, as dicts keyed by column name."""
    result = query(sql)
    if not result:
        return []
    return list(result[0].get("results") or [])
