"""Tiny in-process sliding-window rate limiter for credential endpoints.

Per-process and per-key (client IP + bucket). Two uvicorn workers therefore
allow roughly double the stated budget, which is fine: the goal is to make
password guessing and sign-up spam expensive, not to be a precise quota.
Cloudflare sits in front for anything heavier.

The client IP is taken from ``CF-Connecting-IP`` / ``X-Forwarded-For``
(Nginx is trusted to set them) and falls back to the socket peer.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def client_ip(request: Request) -> str:
    for header in ("cf-connecting-ip", "x-forwarded-for"):
        value = request.headers.get(header, "")
        if value:
            return value.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check(request: Request, bucket: str, limit: int, window_seconds: int) -> None:
    """Raise 429 ``rate_limited`` when ``limit`` hits in ``window_seconds``
    have already been recorded for this client + bucket."""
    key = f"{bucket}:{client_ip(request)}"
    now = time.monotonic()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window_seconds:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status_code=429, detail="rate_limited")
        q.append(now)
        if len(_hits) > 50_000:  # defensive: never grow without bound
            stale = [k for k, dq in _hits.items() if not dq or now - dq[-1] > 3600]
            for k in stale:
                del _hits[k]


def reset() -> None:
    with _lock:
        _hits.clear()
