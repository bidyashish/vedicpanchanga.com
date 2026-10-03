"""User rows: creation, lookup, password hashing, premium status, reset tokens.

Passwords use stdlib ``hashlib.scrypt`` (no C-extension dependency to build on
the VPS). Parameters follow the OWASP 2023 guidance for scrypt
(N=2^14, r=8, p=5, about 16 MiB and ~0.2 s per hash) and are stored inside the
hash string so they can be raised later without invalidating existing rows.

The "plan" is derived, never stored: a user is premium while ``premium_until``
(set from Stripe's subscription period end) lies in the future. That makes a
lapsed subscription expire on its own even if a webhook is missed.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from .db import connect, new_id, now_iso

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LEN = 8
MAX_PASSWORD_LEN = 128

# Saved-chart caps per plan. Small enough to deter abuse of free accounts,
# large enough that nobody legitimately hits the premium one.
FREE_CHART_LIMIT = 10
PREMIUM_CHART_LIMIT = 200

RESET_TOKEN_TTL = timedelta(hours=1)

_SCRYPT_N_LOG2 = 14
_SCRYPT_R = 8
_SCRYPT_P = 5
_SCRYPT_MAXMEM = 64 * 1024 * 1024


class EmailExists(Exception):
    pass


def normalize_email(email: str) -> str:
    return email.strip().lower()


def valid_email(email: str) -> bool:
    return bool(email) and len(email) <= 254 and EMAIL_RE.match(email) is not None


# ── password hashing ─────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=1 << _SCRYPT_N_LOG2,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        maxmem=_SCRYPT_MAXMEM,
        dklen=32,
    )
    b64 = lambda b: base64.b64encode(b).decode("ascii")  # noqa: E731
    return f"scrypt${_SCRYPT_N_LOG2}${_SCRYPT_R}${_SCRYPT_P}${b64(salt)}${b64(digest)}"


def check_password(password: str, stored: Optional[str]) -> bool:
    if not stored:
        return False
    try:
        algo, n_log2, r, p, salt_b64, digest_b64 = stored.split("$")
        if algo != "scrypt":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=1 << int(n_log2),
            r=int(r),
            p=int(p),
            maxmem=_SCRYPT_MAXMEM,
            dklen=len(expected),
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


# ── rows ─────────────────────────────────────────────────────────────────


def _row_to_dict(row: Optional[sqlite3.Row]) -> Optional[dict[str, Any]]:
    return dict(row) if row is not None else None


def get_user_by_id(user_id: str) -> Optional[dict[str, Any]]:
    with connect() as conn:
        return _row_to_dict(
            conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        )


def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    with connect() as conn:
        return _row_to_dict(
            conn.execute(
                "SELECT * FROM users WHERE email = ?", (normalize_email(email),)
            ).fetchone()
        )


def get_user_by_google_sub(sub: str) -> Optional[dict[str, Any]]:
    with connect() as conn:
        return _row_to_dict(
            conn.execute("SELECT * FROM users WHERE google_sub = ?", (sub,)).fetchone()
        )


def get_user_by_stripe_customer(customer_id: str) -> Optional[dict[str, Any]]:
    with connect() as conn:
        return _row_to_dict(
            conn.execute(
                "SELECT * FROM users WHERE stripe_customer_id = ?", (customer_id,)
            ).fetchone()
        )


def create_user(
    email: str,
    *,
    name: Optional[str] = None,
    picture: Optional[str] = None,
    password: Optional[str] = None,
    google_sub: Optional[str] = None,
) -> dict[str, Any]:
    user_id = new_id()
    now = now_iso()
    try:
        with connect() as conn:
            conn.execute(
                """INSERT INTO users
                   (id, email, name, picture, password_hash, google_sub,
                    created_at, last_login_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id,
                    normalize_email(email),
                    (name or "").strip()[:80] or None,
                    picture,
                    hash_password(password) if password else None,
                    google_sub,
                    now,
                    now,
                ),
            )
    except sqlite3.IntegrityError as exc:
        raise EmailExists(str(exc)) from exc
    return get_user_by_id(user_id)  # type: ignore[return-value]


def touch_login(user_id: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE users SET last_login_at = ? WHERE id = ?", (now_iso(), user_id)
        )


def link_google(
    user_id: str, sub: str, *, name: Optional[str], picture: Optional[str]
) -> None:
    """Attach a Google identity to an existing email account. Only fills in
    name / picture when the row has none, so a user's chosen name wins."""
    with connect() as conn:
        conn.execute(
            """UPDATE users
               SET google_sub = ?,
                   name = COALESCE(name, ?),
                   picture = COALESCE(picture, ?),
                   last_login_at = ?
               WHERE id = ?""",
            (sub, (name or "").strip()[:80] or None, picture, now_iso(), user_id),
        )


def set_password(user_id: str, password: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(password), user_id),
        )


def delete_user(user_id: str) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


def update_billing(
    user_id: str,
    *,
    stripe_customer_id: Optional[str] = None,
    stripe_subscription_id: Optional[str] = None,
    subscription_status: Optional[str] = None,
    premium_until: Optional[str] = None,
    cancel_at_period_end: Optional[bool] = None,
) -> None:
    """Partial update - only the keyword arguments actually passed change."""
    sets: list[str] = []
    args: list[Any] = []
    for col, val in (
        ("stripe_customer_id", stripe_customer_id),
        ("stripe_subscription_id", stripe_subscription_id),
        ("subscription_status", subscription_status),
        ("premium_until", premium_until),
    ):
        if val is not None:
            sets.append(f"{col} = ?")
            args.append(val)
    if cancel_at_period_end is not None:
        sets.append("cancel_at_period_end = ?")
        args.append(1 if cancel_at_period_end else 0)
    if not sets:
        return
    args.append(user_id)
    with connect() as conn:
        conn.execute(f"UPDATE users SET {', '.join(sets)} WHERE id = ?", args)


# ── derived state ────────────────────────────────────────────────────────


def is_premium(user: dict[str, Any]) -> bool:
    until = user.get("premium_until")
    if not until:
        return False
    try:
        return datetime.fromisoformat(until) > datetime.now(timezone.utc)
    except ValueError:
        return False


def chart_limit(user: dict[str, Any]) -> int:
    return PREMIUM_CHART_LIMIT if is_premium(user) else FREE_CHART_LIMIT


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    """Shape returned to the browser. Never includes hashes or Stripe ids."""
    premium = is_premium(user)
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name"),
        "picture": user.get("picture"),
        "provider": "google" if user.get("google_sub") else "email",
        "has_password": bool(user.get("password_hash")),
        "created_at": user["created_at"],
        "plan": "premium" if premium else "free",
        "is_premium": premium,
        "premium_until": user.get("premium_until"),
        "subscription_status": user.get("subscription_status"),
        "cancel_at_period_end": bool(user.get("cancel_at_period_end")),
        "has_billing": bool(user.get("stripe_customer_id")),
        "chart_limit": chart_limit(user),
    }


# ── password reset tokens ────────────────────────────────────────────────


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def create_reset_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + RESET_TOKEN_TTL).isoformat(
        timespec="seconds"
    )
    with connect() as conn:
        # One live token per user keeps the table tiny and invalidates older mails.
        conn.execute("DELETE FROM password_resets WHERE user_id = ?", (user_id,))
        conn.execute(
            "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (_token_hash(token), user_id, expires),
        )
    return token


def consume_reset_token(token: str) -> Optional[str]:
    """Return the user id for a valid, unexpired token and delete it."""
    if not token or len(token) > 128:
        return None
    h = _token_hash(token)
    with connect() as conn:
        row = conn.execute(
            "SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?",
            (h,),
        ).fetchone()
        if row is None:
            return None
        conn.execute("DELETE FROM password_resets WHERE token_hash = ?", (h,))
        if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
            return None
        return row["user_id"]
