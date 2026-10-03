"""Session cookie: a short HS256 JWT (PyJWT) in an httpOnly cookie.

Why a cookie and not a bearer token: the frontend is same-origin in
production (Nginx proxies ``/api``), so a ``SameSite=Lax`` httpOnly cookie
is sent automatically, is invisible to page JavaScript (no XSS token theft)
and is not attached to cross-site POSTs (CSRF). In development the Vite dev
server on ``localhost:3121`` and the API on ``localhost:8001`` are the same
*site* (ports do not count), so the same cookie works with
``credentials: "include"``. The ``Secure`` flag follows the request scheme
(``X-Forwarded-Proto`` from Nginx) so plain-HTTP localhost keeps working in
Safari, which refuses Secure cookies over http.

``SESSION_SECRET`` must be identical across the two uvicorn workers and
stable across restarts, hence an env var rather than a generated value.
Without it ``accounts_enabled()`` is False and every account route answers
503 ``accounts_disabled``.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from fastapi import HTTPException, Request, Response

from .users import get_user_by_id

COOKIE_NAME = "vp_session"
SESSION_TTL = timedelta(days=30)
_ALGO = "HS256"

logger = logging.getLogger(__name__)


def session_secret() -> Optional[str]:
    secret = os.environ.get("SESSION_SECRET", "").strip()
    return secret or None


def accounts_enabled() -> bool:
    return session_secret() is not None


def require_accounts_enabled() -> None:
    if not accounts_enabled():
        raise HTTPException(status_code=503, detail="accounts_disabled")


def _is_https(request: Request) -> bool:
    forwarded = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    return (forwarded or request.url.scheme).lower() == "https"


def issue_session(response: Response, request: Request, user_id: str) -> None:
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": user_id, "iat": now, "exp": now + SESSION_TTL},
        session_secret(),
        algorithm=_ALGO,
    )
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=_is_https(request),
        path="/",
    )


def clear_session(response: Response, request: Request) -> None:
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=_is_https(request),
    )


def user_id_from_request(request: Request) -> Optional[str]:
    token = request.cookies.get(COOKIE_NAME)
    secret = session_secret()
    if not token or not secret:
        return None
    try:
        claims = jwt.decode(token, secret, algorithms=[_ALGO])
    except jwt.PyJWTError:
        return None
    sub = claims.get("sub")
    return sub if isinstance(sub, str) and sub else None


def current_user(request: Request) -> Optional[dict[str, Any]]:
    """FastAPI dependency: the signed-in user's row, or None."""
    user_id = user_id_from_request(request)
    if not user_id:
        return None
    return get_user_by_id(user_id)


def require_user(request: Request) -> dict[str, Any]:
    """FastAPI dependency: 401 unless a valid session cookie names a user."""
    require_accounts_enabled()
    user = current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="not_signed_in")
    return user
