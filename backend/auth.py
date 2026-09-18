"""Optional API-key authentication for the /api routes.

Enabled by setting the ``API_KEYS`` env var (comma-separated list of keys).
When it is empty or unset the API stays fully open - exactly the behavior
before this module existed - so local dev and the current production deploy
are unaffected until keys are configured.

When keys are configured, a request passes if any of these hold:

* it carries a valid key in ``Authorization: Bearer <key>`` or ``X-API-Key``,
* its ``Origin`` (or, for same-origin GETs that omit Origin, its ``Referer``)
  matches ``AUTH_EXEMPT_ORIGINS`` - the site's own frontend keeps working
  without a key,
* it targets an exempt liveness path (``/api/``, ``/api/health``) so
  monitoring probes never need credentials.

CORS preflight (``OPTIONS``) never reaches this dependency: CORSMiddleware
answers it before routing, as the CORS spec requires (preflights carry no
credentials).

Honest scope note: the origin exemption trusts browser-controlled headers,
which non-browser clients can spoof. Since the API was fully public before,
this does not weaken anything - keys exist to grant/track third-party access
(mobile apps, other domains), not to harden the first-party path.

Env vars are read per-request (parsing a short string is negligible) so keys
can be tested with monkeypatch and rotated with a plain service restart.
"""

import hmac
import os

from fastapi import HTTPException, Request

# Liveness endpoints stay open even with keys configured.
EXEMPT_PATHS = {"/api", "/api/", "/api/health"}

_DEFAULT_EXEMPT_ORIGINS = (
    "https://vedicpanchanga.com,https://www.vedicpanchanga.com,"
    "http://localhost:3121,http://127.0.0.1:3121"
)


def _csv_env(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def configured_keys() -> list[str]:
    return _csv_env("API_KEYS")


def exempt_origins() -> list[str]:
    return [
        o.rstrip("/").lower()
        for o in _csv_env("AUTH_EXEMPT_ORIGINS", _DEFAULT_EXEMPT_ORIGINS)
    ]


def _extract_key(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    scheme, _, token = auth.partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        return token.strip()
    return request.headers.get("x-api-key", "").strip()


def _is_exempt_origin(request: Request) -> bool:
    allowed = exempt_origins()
    origin = request.headers.get("origin", "").rstrip("/").lower()
    if origin:
        return origin in allowed
    # Same-origin GET/HEAD fetches omit Origin; fall back to Referer.
    referer = request.headers.get("referer", "").lower()
    return any(referer == o or referer.startswith(f"{o}/") for o in allowed if referer)


def require_api_key(request: Request) -> None:
    """FastAPI dependency enforcing the policy described in the module docstring."""
    keys = configured_keys()
    if not keys:
        return
    if request.url.path in EXEMPT_PATHS:
        return
    supplied = _extract_key(request)
    # compare_digest over every key keeps the comparison timing-safe.
    if supplied and any(hmac.compare_digest(supplied, k) for k in keys):
        return
    if _is_exempt_origin(request):
        return
    raise HTTPException(
        status_code=401,
        detail=(
            "Missing or invalid API key. Send it as 'Authorization: Bearer "
            "<key>' or 'X-API-Key: <key>'."
        ),
        headers={"WWW-Authenticate": "Bearer"},
    )
