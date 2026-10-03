"""Minimal SMTP sender for transactional mail (password reset).

stdlib ``smtplib`` only. STARTTLS on the configured port (587 by default) or
implicit TLS when ``SMTP_PORT=465``. Unconfigured (no ``SMTP_HOST``) means
``is_configured()`` is False and callers answer 503 instead of pretending to
send.
"""

from __future__ import annotations

import os
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

DEFAULT_PUBLIC_URL = "https://vedicpanchanga.com"


def public_url() -> str:
    return (os.environ.get("PUBLIC_URL", "").strip() or DEFAULT_PUBLIC_URL).rstrip("/")


def is_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST", "").strip())


def _from_address() -> str:
    return os.environ.get("SMTP_FROM", "").strip() or "no-reply@vedicpanchanga.com"


def send_mail(to: str, subject: str, text: str) -> None:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        raise RuntimeError("SMTP not configured")
    port = int(os.environ.get("SMTP_PORT", "587") or 587)
    user: Optional[str] = os.environ.get("SMTP_USER") or None
    password: Optional[str] = os.environ.get("SMTP_PASSWORD") or None

    msg = EmailMessage()
    msg["From"] = _from_address()
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as smtp:
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)
        return
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls(context=context)
        if user and password:
            smtp.login(user, password)
        smtp.send_message(msg)


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
