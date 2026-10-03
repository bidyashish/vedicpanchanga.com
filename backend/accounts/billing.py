"""``/api/billing/*`` - Stripe subscription that removes ads ("Premium").

Flow
----
1. ``POST /billing/checkout`` with ``{"plan": "monthly" | "yearly"}`` creates a
   Stripe Checkout Session (mode=subscription) for the signed-in user and
   returns its URL. The Stripe customer is created on first use and stored
   on the user row so later sessions reuse it.
2. Stripe redirects back to ``PUBLIC_URL/account?checkout=success|cancel``.
3. Stripe calls ``POST /billing/webhook``. We verify the signature with
   ``STRIPE_WEBHOOK_SECRET`` and update the user's ``premium_until`` /
   ``subscription_status`` from the subscription object. This is the *only*
   place entitlement is written, so a user cannot grant themselves premium by
   hitting the success URL.
4. ``POST /billing/portal`` returns a Stripe Customer Portal URL for
   cancelling, changing plan or updating the card.

Configuration (all in ``backend/.env.local``): ``STRIPE_SECRET_KEY``,
``STRIPE_WEBHOOK_SECRET``, ``STRIPE_PRICE_MONTHLY``, ``STRIPE_PRICE_YEARLY``.
Without ``STRIPE_SECRET_KEY`` the endpoints answer 503 ``billing_disabled``
and ``/auth/config`` reports ``billing: false``.

The webhook path is in ``auth.EXEMPT_PATHS`` because Stripe sends neither an
Origin header nor our API key; its own signature is the authentication.

Stripe API version note: from ``2025-03-31.basil`` on,
``current_period_end`` moved from the subscription to its items. We read
either location so the code works regardless of the account's pinned
version.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from . import users
from .db import connect, now_iso
from .mailer import public_url
from .sessions import require_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["accounts"])

WEBHOOK_PATH = "/api/billing/webhook"

# Statuses that keep the user entitled until the period end.
_ACTIVE_STATUSES = {"active", "trialing", "past_due"}


def _secret_key() -> Optional[str]:
    return os.environ.get("STRIPE_SECRET_KEY", "").strip() or None


def _webhook_secret() -> Optional[str]:
    return os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip() or None


def _price_ids() -> dict[str, str]:
    out: dict[str, str] = {}
    for plan, var in (
        ("monthly", "STRIPE_PRICE_MONTHLY"),
        ("yearly", "STRIPE_PRICE_YEARLY"),
    ):
        pid = os.environ.get(var, "").strip()
        if pid:
            out[plan] = pid
    return out


def is_configured() -> bool:
    return _secret_key() is not None and bool(_price_ids())


def public_plans() -> list[dict[str, Any]]:
    """Plans the UI may offer. Prices are not fetched here (that would call
    Stripe on every config read); the frontend shows the plan interval and
    Stripe Checkout shows the exact amount."""
    if not is_configured():
        return []
    return [{"id": plan} for plan in ("monthly", "yearly") if plan in _price_ids()]


def _client() -> "stripe.StripeClient":
    key = _secret_key()
    if not key:
        raise HTTPException(status_code=503, detail="billing_disabled")
    return stripe.StripeClient(key)


def _as_dict(obj: Any) -> dict[str, Any]:
    """Stripe objects behave like dicts but tests pass plain dicts."""
    if isinstance(obj, dict):
        return obj
    try:
        return obj.to_dict_recursive()  # type: ignore[no-any-return]
    except AttributeError:
        return dict(obj)


def _period_end_iso(sub: dict[str, Any]) -> Optional[str]:
    end = sub.get("current_period_end")
    if end is None:
        items = (sub.get("items") or {}).get("data") or []
        if items:
            end = items[0].get("current_period_end")
    if end is None:
        return None
    return datetime.fromtimestamp(int(end), tz=timezone.utc).isoformat(
        timespec="seconds"
    )


def _customer_id(value: Any) -> Optional[str]:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get("id")
    return getattr(value, "id", None)


# ── public endpoints ─────────────────────────────────────────────────────


class CheckoutBody(BaseModel):
    plan: str = "monthly"


@router.post("/checkout")
def billing_checkout(
    body: CheckoutBody, user: dict[str, Any] = Depends(require_user)
) -> dict[str, Any]:
    if not is_configured():
        raise HTTPException(status_code=503, detail="billing_disabled")
    prices = _price_ids()
    price = prices.get(body.plan)
    if not price:
        raise HTTPException(status_code=400, detail="unknown_plan")
    if users.is_premium(user) and user.get("subscription_status") in _ACTIVE_STATUSES:
        raise HTTPException(status_code=409, detail="already_premium")

    client = _client()
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        customer = client.customers.create(
            params={"email": user["email"], "metadata": {"user_id": user["id"]}}
        )
        customer_id = customer.id
        users.update_billing(user["id"], stripe_customer_id=customer_id)

    base = public_url()
    session = client.checkout.sessions.create(
        params={
            "mode": "subscription",
            "customer": customer_id,
            "line_items": [{"price": price, "quantity": 1}],
            "success_url": f"{base}/account?checkout=success",
            "cancel_url": f"{base}/account?checkout=cancel",
            "allow_promotion_codes": True,
            "client_reference_id": user["id"],
            "subscription_data": {"metadata": {"user_id": user["id"]}},
        }
    )
    return {"url": session.url}


@router.post("/portal")
def billing_portal(user: dict[str, Any] = Depends(require_user)) -> dict[str, Any]:
    if not is_configured():
        raise HTTPException(status_code=503, detail="billing_disabled")
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=404, detail="no_billing_account")
    session = _client().billing_portal.sessions.create(
        params={"customer": customer_id, "return_url": f"{public_url()}/account"}
    )
    return {"url": session.url}


# ── webhook ──────────────────────────────────────────────────────────────


def apply_subscription(sub: dict[str, Any]) -> Optional[str]:
    """Update the owning user from a subscription object. Returns the user id
    or None when no user matches (e.g. customer created outside this app)."""
    customer_id = _customer_id(sub.get("customer"))
    user = users.get_user_by_stripe_customer(customer_id) if customer_id else None
    if user is None:
        meta_uid = (sub.get("metadata") or {}).get("user_id")
        user = users.get_user_by_id(meta_uid) if meta_uid else None
        if user is not None and customer_id and not user.get("stripe_customer_id"):
            users.update_billing(user["id"], stripe_customer_id=customer_id)
    if user is None:
        logger.warning("Stripe subscription %s has no matching user", sub.get("id"))
        return None

    status = str(sub.get("status") or "")
    period_end = _period_end_iso(sub)
    if status in _ACTIVE_STATUSES and period_end:
        premium_until = period_end
    else:
        # canceled / unpaid / incomplete_expired: entitlement ends now.
        premium_until = now_iso()
    users.update_billing(
        user["id"],
        stripe_subscription_id=str(sub.get("id") or ""),
        subscription_status=status,
        premium_until=premium_until,
        cancel_at_period_end=bool(sub.get("cancel_at_period_end")),
    )
    return user["id"]


def _record_event(event_id: str, event_type: str) -> bool:
    """Insert the event id; False when already processed (Stripe retries)."""
    with connect() as conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO billing_events (id, type, received_at) VALUES (?, ?, ?)",
            (event_id, event_type, now_iso()),
        )
        return cur.rowcount == 1


def handle_event(event: dict[str, Any]) -> None:
    etype = str(event.get("type") or "")
    obj = _as_dict((event.get("data") or {}).get("object") or {})
    if etype.startswith("customer.subscription."):
        apply_subscription(obj)
    elif etype == "checkout.session.completed" and obj.get("mode") == "subscription":
        sub_id = obj.get("subscription")
        if isinstance(sub_id, str) and sub_id:
            sub = _client().subscriptions.retrieve(sub_id)
            apply_subscription(_as_dict(sub))
    # invoice.* and everything else: nothing to do; subscription events carry
    # the state we need.


@router.post("/webhook")
async def billing_webhook(request: Request) -> dict[str, Any]:
    secret = _webhook_secret()
    if not secret:
        raise HTTPException(status_code=503, detail="billing_disabled")
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, signature, secret)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="invalid_signature")
    event_dict = _as_dict(event)
    event_id = str(event_dict.get("id") or "")
    if event_id and not _record_event(event_id, str(event_dict.get("type") or "")):
        return {"received": True, "duplicate": True}
    try:
        handle_event(event_dict)
    except HTTPException:
        raise
    except Exception as exc:  # let Stripe retry on our bugs / outages
        logger.exception("webhook %s failed: %s", event_id, exc)
        with connect() as conn:
            conn.execute("DELETE FROM billing_events WHERE id = ?", (event_id,))
        raise HTTPException(status_code=500, detail="webhook_failed")
    return {"received": True}


# ── account deletion hook ────────────────────────────────────────────────


def cancel_subscription_for_deleted_user(user: dict[str, Any]) -> None:
    """Best effort: stop billing someone who deleted their account."""
    sub_id = user.get("stripe_subscription_id")
    if not sub_id or not _secret_key():
        return
    if user.get("subscription_status") not in _ACTIVE_STATUSES:
        return
    try:
        _client().subscriptions.cancel(sub_id)
    except Exception as exc:  # pragma: no cover - network / Stripe-side
        logger.error(
            "could not cancel subscription %s on account delete: %s", sub_id, exc
        )
