"""``/api/auth/*`` - sign-up, sign-in, Google, session, password reset, delete.

Error contract: every failure is an ``HTTPException`` whose ``detail`` is a
short snake_case code (``invalid_credentials``, ``email_exists`` ...). The
frontend maps those to localized strings (``auth_error_<code>`` keys) so the
backend never has to know the user's language.

    GET    /auth/config            feature flags for the UI (always 200)
    GET    /auth/me                current user or ``{"user": null}``
    POST   /auth/signup            email + password + optional name
    POST   /auth/login             email + password
    POST   /auth/google            Google ID token (``credential``)
    POST   /auth/logout
    POST   /auth/forgot-password   always 200 to avoid account enumeration
    POST   /auth/reset-password    token + new password
    POST   /auth/change-password   current (if any) + new password
    DELETE /auth/account           deletes the user and their charts
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from . import billing, google_auth, mailer, ratelimit, users
from .sessions import (
    accounts_enabled,
    clear_session,
    current_user,
    issue_session,
    require_accounts_enabled,
    require_user,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["accounts"])

# (limit, window seconds) per client IP
_LOGIN_LIMIT = (10, 300)
_SIGNUP_LIMIT = (5, 3600)
_RESET_LIMIT = (3, 3600)  # forgot-password mails per IP
_RESET_SUBMIT_LIMIT = (10, 3600)  # token submissions per IP


class SignupBody(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=users.MAX_PASSWORD_LEN)
    name: Optional[str] = Field(default=None, max_length=80)


class LoginBody(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=users.MAX_PASSWORD_LEN)


class GoogleBody(BaseModel):
    credential: str = Field(max_length=4096)


class ForgotBody(BaseModel):
    email: str = Field(max_length=254)


class ResetBody(BaseModel):
    token: str = Field(max_length=128)
    password: str = Field(max_length=users.MAX_PASSWORD_LEN)


class ChangePasswordBody(BaseModel):
    current_password: Optional[str] = Field(
        default=None, max_length=users.MAX_PASSWORD_LEN
    )
    new_password: str = Field(max_length=users.MAX_PASSWORD_LEN)


def _validate_password(password: str) -> None:
    if len(password) < users.MIN_PASSWORD_LEN:
        raise HTTPException(status_code=400, detail="password_too_short")


def _validate_email(email: str) -> str:
    email = users.normalize_email(email)
    if not users.valid_email(email):
        raise HTTPException(status_code=400, detail="invalid_email")
    return email


def _signed_in(
    response: Response, request: Request, user: dict[str, Any]
) -> dict[str, Any]:
    issue_session(response, request, user["id"])
    return {"user": users.public_user(user)}


# ── config / me ──────────────────────────────────────────────────────────


@router.get("/config")
def auth_config() -> dict[str, Any]:
    """Feature flags the SPA reads once on boot. Safe to expose: the Google
    client id is public by design and the rest are booleans."""
    enabled = accounts_enabled()
    return {
        "enabled": enabled,
        "google_client_id": google_auth.client_id() if enabled else None,
        "email_password": enabled,
        "password_reset": enabled and mailer.is_configured(),
        "billing": enabled and billing.is_configured(),
        "plans": billing.public_plans() if enabled else [],
        "free_chart_limit": users.FREE_CHART_LIMIT,
        "premium_chart_limit": users.PREMIUM_CHART_LIMIT,
    }


@router.get("/me")
def auth_me(user: Optional[dict[str, Any]] = Depends(current_user)) -> dict[str, Any]:
    if not accounts_enabled() or user is None:
        return {"user": None}
    return {"user": users.public_user(user)}


# ── email + password ─────────────────────────────────────────────────────


@router.post("/signup")
def auth_signup(
    body: SignupBody, request: Request, response: Response
) -> dict[str, Any]:
    require_accounts_enabled()
    ratelimit.check(request, "signup", *_SIGNUP_LIMIT)
    email = _validate_email(body.email)
    _validate_password(body.password)
    try:
        user = users.create_user(email, name=body.name, password=body.password)
    except users.EmailExists:
        raise HTTPException(status_code=409, detail="email_exists")
    return _signed_in(response, request, user)


@router.post("/login")
def auth_login(body: LoginBody, request: Request, response: Response) -> dict[str, Any]:
    require_accounts_enabled()
    ratelimit.check(request, "login", *_LOGIN_LIMIT)
    email = users.normalize_email(body.email)
    user = users.get_user_by_email(email) if users.valid_email(email) else None
    if user is None or not users.check_password(
        body.password, user.get("password_hash")
    ):
        # Same code whether the email is unknown, Google-only or wrong password.
        raise HTTPException(status_code=401, detail="invalid_credentials")
    users.touch_login(user["id"])
    return _signed_in(response, request, user)


# ── Google ───────────────────────────────────────────────────────────────


@router.post("/google")
def auth_google(
    body: GoogleBody, request: Request, response: Response
) -> dict[str, Any]:
    require_accounts_enabled()
    if not google_auth.enabled():
        raise HTTPException(status_code=503, detail="google_disabled")
    ratelimit.check(request, "login", *_LOGIN_LIMIT)
    try:
        info = google_auth.verify_credential(body.credential)
    except ValueError as exc:
        logger.info("Google token rejected: %s", exc)
        raise HTTPException(status_code=401, detail="google_token_invalid")

    sub = str(info["sub"])
    email = users.normalize_email(str(info["email"]))
    name = info.get("name")
    picture = info.get("picture")

    user = users.get_user_by_google_sub(sub)
    if user is None:
        # Same verified email already registered with a password: link rather
        # than creating a duplicate, so either method signs into one account.
        user = users.get_user_by_email(email)
        if user is not None:
            users.link_google(user["id"], sub, name=name, picture=picture)
            user = users.get_user_by_id(user["id"])
        else:
            try:
                user = users.create_user(
                    email, name=name, picture=picture, google_sub=sub
                )
            except users.EmailExists:
                raise HTTPException(status_code=409, detail="email_exists")
    else:
        users.touch_login(user["id"])
    assert user is not None
    return _signed_in(response, request, user)


# ── session ──────────────────────────────────────────────────────────────


@router.post("/logout")
def auth_logout(request: Request, response: Response) -> dict[str, Any]:
    clear_session(response, request)
    return {"user": None}


# ── password reset ───────────────────────────────────────────────────────


@router.post("/forgot-password")
def auth_forgot_password(body: ForgotBody, request: Request) -> dict[str, Any]:
    require_accounts_enabled()
    if not mailer.is_configured():
        raise HTTPException(status_code=503, detail="reset_disabled")
    ratelimit.check(request, "reset", *_RESET_LIMIT)
    email = users.normalize_email(body.email)
    user = users.get_user_by_email(email) if users.valid_email(email) else None
    if user is not None:
        token = users.create_reset_token(user["id"])
        try:
            mailer.send_password_reset(user["email"], token)
        except Exception as exc:  # SMTP down: log, still answer 200
            logger.error("password reset mail failed for %s: %s", user["id"], exc)
    return {"ok": True}


@router.post("/reset-password")
def auth_reset_password(
    body: ResetBody, request: Request, response: Response
) -> dict[str, Any]:
    require_accounts_enabled()
    ratelimit.check(request, "reset_submit", *_RESET_SUBMIT_LIMIT)
    _validate_password(body.password)
    user_id = users.consume_reset_token(body.token)
    if user_id is None:
        raise HTTPException(status_code=400, detail="reset_token_invalid")
    users.set_password(user_id, body.password)
    user = users.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="reset_token_invalid")
    return _signed_in(response, request, user)


@router.post("/change-password")
def auth_change_password(
    body: ChangePasswordBody, user: dict[str, Any] = Depends(require_user)
) -> dict[str, Any]:
    _validate_password(body.new_password)
    if user.get("password_hash"):
        if not users.check_password(body.current_password or "", user["password_hash"]):
            raise HTTPException(status_code=401, detail="invalid_credentials")
    users.set_password(user["id"], body.new_password)
    refreshed = users.get_user_by_id(user["id"])
    return {"user": users.public_user(refreshed or user)}


# ── delete ───────────────────────────────────────────────────────────────


@router.delete("/account")
def auth_delete_account(
    request: Request, response: Response, user: dict[str, Any] = Depends(require_user)
) -> dict[str, Any]:
    billing.cancel_subscription_for_deleted_user(user)
    users.delete_user(user["id"])
    clear_session(response, request)
    return {"user": None}
