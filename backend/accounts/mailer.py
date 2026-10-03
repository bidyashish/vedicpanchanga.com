"""Transactional mail (password reset) through Resend.

Uses the official ``resend`` SDK exactly as in
https://resend.com/docs/send-with-python. ``RESEND_API_KEY`` unset means
``is_configured()`` is False and callers answer 503 instead of pretending to
send. ``MAIL_FROM`` is the sender users see and must be an address on a domain
verified in the Resend dashboard; it defaults to
``Vedic Panchanga <no-reply@vedicpanchanga.com>``.
"""

from __future__ import annotations

import os
from typing import Optional

import resend

DEFAULT_PUBLIC_URL = "https://vedicpanchanga.com"
DEFAULT_FROM = "Vedic Panchanga <no-reply@vedicpanchanga.com>"


def public_url() -> str:
    return (os.environ.get("PUBLIC_URL", "").strip() or DEFAULT_PUBLIC_URL).rstrip("/")


def _api_key() -> Optional[str]:
    return os.environ.get("RESEND_API_KEY", "").strip() or None


def is_configured() -> bool:
    return _api_key() is not None


def _from_address() -> str:
    return os.environ.get("MAIL_FROM", "").strip() or DEFAULT_FROM


def send_mail(to: str, subject: str, text: str, html: Optional[str] = None) -> str:
    """Send one message; returns Resend's message id. Raises on failure."""
    key = _api_key()
    if not key:
        raise RuntimeError("RESEND_API_KEY not configured")
    resend.api_key = key  # read per call so a key change needs no restart
    params: resend.Emails.SendParams = {
        "from": _from_address(),
        "to": [to],
        "subject": subject,
        "text": text,
    }
    if html:
        params["html"] = html
    sent = resend.Emails.send(params)
    return str(sent.get("id", ""))


def send_password_reset(to: str, token: str) -> None:
    link = f"{public_url()}/account?reset={token}"
    send_mail(
        to,
        "Reset your Vedic Panchanga password",
        "Someone (hopefully you) asked to reset the password for this email on\n"
        "vedicpanchanga.com. Open the link below within one hour to choose a new\n"
        f"password:\n\n{link}\n\n"
        "If you did not request this, you can ignore this message - your\n"
        "password stays unchanged.\n",
    )
