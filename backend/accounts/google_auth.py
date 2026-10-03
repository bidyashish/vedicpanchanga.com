"""Verify Google Identity Services ID tokens.

The browser renders Google's button (``accounts.google.com/gsi/client``) and
receives a signed ID token (JWT). We verify it server-side with
``google-auth``, which checks the RS256 signature against Google's published
certificates (cached), the audience (our ``GOOGLE_CLIENT_ID``), expiry and
issuer. Only verified emails are accepted so an attacker cannot claim an
address they do not control.

Module named ``google_auth`` on purpose: ``google.py`` would shadow the
``google`` namespace package the library lives in.
"""

from __future__ import annotations

import os
from typing import Any, Optional

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def client_id() -> Optional[str]:
    cid = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    return cid or None


def enabled() -> bool:
    return client_id() is not None


def verify_credential(credential: str) -> dict[str, Any]:
    """Return the token claims (``sub``, ``email``, ``name``, ``picture``).

    Raises ``ValueError`` on any verification failure.
    """
    cid = client_id()
    if not cid:
        raise ValueError("GOOGLE_CLIENT_ID not configured")
    info = id_token.verify_oauth2_token(credential, google_requests.Request(), cid)
    if info.get("iss") not in _ISSUERS:
        raise ValueError("wrong issuer")
    if not info.get("email") or not info.get("email_verified"):
        raise ValueError("email not verified")
    return info
