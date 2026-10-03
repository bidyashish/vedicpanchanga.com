"""User accounts, saved charts and ad-free subscriptions.

This subpackage is the only stateful part of the backend. Everything else in
``backend/`` is a pure calculation that persists nothing; here we keep a small
SQLite database (``db.py``) with three concerns layered on top:

* **Accounts** - ``users.py`` (rows, scrypt password hashing, premium status),
  ``sessions.py`` (signed httpOnly session cookie + FastAPI dependencies),
  ``google_auth.py`` (Google Identity Services ID-token verification),
  ``mailer.py`` (password-reset mail through the Resend HTTP API) and
  ``routes_auth.py`` (``/api/auth/*``).
* **Saved charts** - ``routes_charts.py`` (``/api/charts``), birth details only.
  The chart itself is recomputed on open so saved entries always reflect the
  current calculation code.
* **Billing** - ``billing.py`` (``/api/billing/*``): Stripe Checkout for a
  recurring "Premium" subscription whose only entitlement today is no ads plus
  a higher saved-chart cap. Stripe webhooks are the source of truth for the
  premium flag.
* **Durability** - ``d1.py`` (Cloudflare D1 HTTP client) and ``backup.py``
  (mirror the SQLite file into a D1 database every 15 minutes from a systemd
  timer installed by ``infra/setup-vps.sh``; ``restore`` pulls it back). The
  application never reads D1; it is the off-box copy that survives the VPS.

Everything is opt-in through environment variables read at request time, in the
same spirit as ``auth.py``'s ``API_KEYS``:

======================  ======================================================
``SESSION_SECRET``      Required for any account feature. Unset = accounts off;
                        ``GET /api/auth/config`` reports ``enabled: false`` and
                        the frontend hides every sign-in affordance.
``GOOGLE_CLIENT_ID``    OAuth 2.0 Web client ID. Unset = no Google button.
``RESEND_API_KEY``      + optional ``MAIL_FROM``. Password-reset mail via
                        Resend. Unset = reset endpoint returns 503.
``STRIPE_SECRET_KEY``   + ``STRIPE_WEBHOOK_SECRET`` + ``STRIPE_PRICE_MONTHLY``
                        / ``STRIPE_PRICE_YEARLY``. Unset = no upgrade UI.
``CLOUDFLARE_ACCOUNT_ID`` + ``CLOUDFLARE_API_TOKEN`` + ``D1_DATABASE_ID``
                        Replica target. Unset = ``backup.py`` is a no-op.
``DATABASE_PATH``       SQLite file, default ``backend/data/app.db``.
``PUBLIC_URL``          Origin used in emails / Stripe redirects
                        (default ``https://vedicpanchanga.com``).
======================  ======================================================

Secrets belong in ``backend/.env.local`` (gitignored, never rewritten by the
deploy script). See ``backend/.env.example`` for the full list with comments.
"""

from .billing import router as billing_router
from .routes_auth import router as auth_router
from .routes_charts import router as charts_router

__all__ = ["auth_router", "charts_router", "billing_router"]
