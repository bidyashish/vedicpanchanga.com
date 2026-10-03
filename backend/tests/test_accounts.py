"""In-process tests for backend/accounts/: sign-up / sign-in, Google linking,
session cookie, saved charts, password reset, Stripe webhook entitlement and
the feature flag. Uses a throw-away SQLite file per test module and
monkeypatched env vars (all account settings are read per request).
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

import accounts.billing as billing
import accounts.google_auth as google_auth
import accounts.mailer as mailer
import accounts.ratelimit as ratelimit
from accounts import db, users
from server import app

SECRET = "test-session-secret-not-for-prod"
PASSWORD = "correct horse battery"


@pytest.fixture(scope="module")
def db_file(tmp_path_factory):
    return tmp_path_factory.mktemp("accounts") / "app.db"


@pytest.fixture(autouse=True)
def accounts_env(monkeypatch, db_file):
    monkeypatch.setenv("SESSION_SECRET", SECRET)
    monkeypatch.setenv("DATABASE_PATH", str(db_file))
    monkeypatch.delenv("API_KEYS", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("SMTP_HOST", raising=False)
    db.reset_schema_cache()
    ratelimit.reset()


@pytest.fixture
def client():
    # Fresh client per test so cookies never leak between tests.
    return TestClient(app)


def _signup(client, email="a@example.com", password=PASSWORD, name="Asha"):
    return client.post(
        "/api/auth/signup", json={"email": email, "password": password, "name": name}
    )


CHART = {
    "name": "Test Native",
    "birth_date": "1990-05-15",
    "birth_time": "14:30",
    "latitude": 28.6139,
    "longitude": 77.209,
    "timezone": "Asia/Kolkata",
    "place_name": "New Delhi",
    "ayanamsa": "lahiri",
}


# ── feature flag ─────────────────────────────────────────────────────────


def test_config_reports_disabled_without_secret(client, monkeypatch):
    monkeypatch.delenv("SESSION_SECRET", raising=False)
    cfg = client.get("/api/auth/config").json()
    assert cfg["enabled"] is False
    assert cfg["google_client_id"] is None
    assert client.get("/api/auth/me").json() == {"user": None}
    r = _signup(client, "flag@example.com")
    assert r.status_code == 503
    assert r.json()["detail"] == "accounts_disabled"


def test_config_enabled_shape(client, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "abc.apps.googleusercontent.com")
    cfg = client.get("/api/auth/config").json()
    assert cfg["enabled"] is True
    assert cfg["google_client_id"] == "abc.apps.googleusercontent.com"
    assert cfg["email_password"] is True
    assert cfg["password_reset"] is False
    assert cfg["billing"] is False
    assert cfg["plans"] == []
    assert cfg["free_chart_limit"] == users.FREE_CHART_LIMIT


# ── email + password ─────────────────────────────────────────────────────


def test_signup_sets_cookie_and_me_returns_user(client):
    r = _signup(client, "signup@example.com")
    assert r.status_code == 200, r.text
    body = r.json()["user"]
    assert body["email"] == "signup@example.com"
    assert body["name"] == "Asha"
    assert body["plan"] == "free"
    assert body["is_premium"] is False
    assert body["provider"] == "email"
    assert "password_hash" not in body and "stripe_customer_id" not in body
    assert "vp_session" in client.cookies

    me = client.get("/api/auth/me").json()["user"]
    assert me["id"] == body["id"]


def test_cookie_not_secure_over_plain_http_but_secure_behind_https_proxy(client):
    r = _signup(client, "cookie@example.com")
    set_cookie = r.headers["set-cookie"].lower()
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie
    assert "secure" not in set_cookie

    c2 = TestClient(app)
    r2 = c2.post(
        "/api/auth/login",
        json={"email": "cookie@example.com", "password": PASSWORD},
        headers={"X-Forwarded-Proto": "https"},
    )
    assert r2.status_code == 200
    assert "secure" in r2.headers["set-cookie"].lower()


def test_signup_validation(client):
    assert _signup(client, "not-an-email").json()["detail"] == "invalid_email"
    r = _signup(client, "short@example.com", password="short")
    assert r.status_code == 400
    assert r.json()["detail"] == "password_too_short"


def test_duplicate_email_is_409_case_insensitive(client):
    assert _signup(client, "dupe@example.com").status_code == 200
    r = _signup(TestClient(app), "DUPE@Example.com")
    assert r.status_code == 409
    assert r.json()["detail"] == "email_exists"


def test_login_wrong_password_and_unknown_email_look_identical(client):
    _signup(client, "login@example.com")
    bad = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": "nope-nope"}
    )
    unknown = client.post(
        "/api/auth/login", json={"email": "ghost@example.com", "password": PASSWORD}
    )
    assert bad.status_code == unknown.status_code == 401
    assert bad.json() == unknown.json() == {"detail": "invalid_credentials"}


def test_login_success_and_logout(client):
    _signup(client, "inout@example.com")
    fresh = TestClient(app)
    r = fresh.post(
        "/api/auth/login", json={"email": "InOut@example.com", "password": PASSWORD}
    )
    assert r.status_code == 200
    assert fresh.get("/api/auth/me").json()["user"]["email"] == "inout@example.com"
    fresh.post("/api/auth/logout")
    assert fresh.get("/api/auth/me").json() == {"user": None}


def test_tampered_cookie_is_ignored(client):
    _signup(client, "tamper@example.com")
    client.cookies.set("vp_session", client.cookies["vp_session"][:-3] + "xyz")
    assert client.get("/api/auth/me").json() == {"user": None}
    assert client.get("/api/charts").status_code == 401


def test_password_hash_roundtrip_and_tamper_resistance():
    h = users.hash_password("s3cret-pass")
    assert h.startswith("scrypt$14$8$5$")
    assert users.check_password("s3cret-pass", h)
    assert not users.check_password("S3cret-pass", h)
    assert not users.check_password("s3cret-pass", None)
    assert not users.check_password("s3cret-pass", "garbage")


def test_change_password(client):
    _signup(client, "chg@example.com")
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "wrong", "new_password": "another-good-one"},
    )
    assert r.status_code == 401
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "another-good-one"},
    )
    assert r.status_code == 200
    fresh = TestClient(app)
    assert (
        fresh.post(
            "/api/auth/login",
            json={"email": "chg@example.com", "password": "another-good-one"},
        ).status_code
        == 200
    )


def test_delete_account_removes_charts_and_session(client):
    _signup(client, "del@example.com")
    assert client.post("/api/charts", json=CHART).status_code == 201
    r = client.delete("/api/auth/account")
    assert r.status_code == 200
    assert client.get("/api/auth/me").json() == {"user": None}
    assert users.get_user_by_email("del@example.com") is None
    with db.connect() as conn:
        assert conn.execute("SELECT COUNT(*) FROM charts").fetchone()[0] == 0


def test_login_rate_limited(client):
    for _ in range(10):
        client.post(
            "/api/auth/login", json={"email": "rl@example.com", "password": "x" * 9}
        )
    r = client.post(
        "/api/auth/login", json={"email": "rl@example.com", "password": "x" * 9}
    )
    assert r.status_code == 429
    assert r.json()["detail"] == "rate_limited"


# ── Google ───────────────────────────────────────────────────────────────


def _fake_google(monkeypatch, sub="g-123", email="goog@example.com", verified=True):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "abc.apps.googleusercontent.com")

    def fake_verify(token, request, audience):
        assert audience == "abc.apps.googleusercontent.com"
        if token == "bad":
            raise ValueError("Token expired")
        return {
            "iss": "https://accounts.google.com",
            "sub": sub,
            "email": email,
            "email_verified": verified,
            "name": "Goog User",
            "picture": "https://example.com/p.png",
        }

    monkeypatch.setattr(google_auth.id_token, "verify_oauth2_token", fake_verify)


def test_google_disabled_without_client_id(client):
    r = client.post("/api/auth/google", json={"credential": "x"})
    assert r.status_code == 503
    assert r.json()["detail"] == "google_disabled"


def test_google_creates_then_reuses_user(client, monkeypatch):
    _fake_google(monkeypatch)
    r = client.post("/api/auth/google", json={"credential": "good"})
    assert r.status_code == 200, r.text
    user = r.json()["user"]
    assert user["provider"] == "google"
    assert user["has_password"] is False
    assert user["picture"] == "https://example.com/p.png"

    again = TestClient(app).post("/api/auth/google", json={"credential": "good"})
    assert again.json()["user"]["id"] == user["id"]


def test_google_rejects_bad_token_and_unverified_email(client, monkeypatch):
    _fake_google(monkeypatch)
    r = client.post("/api/auth/google", json={"credential": "bad"})
    assert r.status_code == 401
    assert r.json()["detail"] == "google_token_invalid"

    _fake_google(monkeypatch, sub="g-unv", email="unv@example.com", verified=False)
    r = client.post("/api/auth/google", json={"credential": "good"})
    assert r.status_code == 401


def test_google_links_to_existing_email_account(client, monkeypatch):
    _signup(client, "link@example.com", name="Chosen Name")
    uid = client.get("/api/auth/me").json()["user"]["id"]
    _fake_google(monkeypatch, sub="g-link", email="Link@example.com")
    r = TestClient(app).post("/api/auth/google", json={"credential": "good"})
    assert r.status_code == 200
    linked = r.json()["user"]
    assert linked["id"] == uid
    assert linked["name"] == "Chosen Name"  # user's own name wins
    assert linked["has_password"] is True  # password login still works
    assert linked["provider"] == "google"


# ── saved charts ─────────────────────────────────────────────────────────


def test_charts_require_login(client):
    assert client.get("/api/charts").status_code == 401
    assert client.post("/api/charts", json=CHART).status_code == 401


def test_charts_crud_scoped_to_owner(client):
    _signup(client, "owner@example.com")
    r = client.post("/api/charts", json=CHART)
    assert r.status_code == 201, r.text
    chart = r.json()["chart"]
    assert chart["name"] == "Test Native"
    assert chart["birth_time"] == "14:30"
    cid = chart["id"]

    listed = client.get("/api/charts").json()
    assert [c["id"] for c in listed["charts"]] == [cid]
    assert listed["limit"] == users.FREE_CHART_LIMIT

    r = client.put(f"/api/charts/{cid}", json={"name": "Renamed", "notes": "hi"})
    assert r.status_code == 200
    assert r.json()["chart"]["name"] == "Renamed"
    assert r.json()["chart"]["notes"] == "hi"
    assert r.json()["chart"]["birth_date"] == "1990-05-15"

    other = TestClient(app)
    _signup(other, "other@example.com")
    assert other.get("/api/charts").json()["charts"] == []
    assert other.put(f"/api/charts/{cid}", json={"name": "x"}).status_code == 404
    assert other.delete(f"/api/charts/{cid}").status_code == 404

    assert client.delete(f"/api/charts/{cid}").status_code == 200
    assert client.delete(f"/api/charts/{cid}").status_code == 404
    assert client.get("/api/charts").json()["charts"] == []


def test_charts_validation(client):
    _signup(client, "valid@example.com")
    bad = dict(CHART, birth_date="15/05/1990")
    assert client.post("/api/charts", json=bad).status_code == 422
    bad = dict(CHART, latitude=95)
    assert client.post("/api/charts", json=bad).status_code == 422
    ok = dict(CHART, birth_time="14:30:00")
    r = client.post("/api/charts", json=ok)
    assert r.status_code == 201 and r.json()["chart"]["birth_time"] == "14:30"


def test_chart_limit_free_vs_premium(client, monkeypatch):
    monkeypatch.setattr(users, "FREE_CHART_LIMIT", 2)
    monkeypatch.setattr(users, "PREMIUM_CHART_LIMIT", 3)
    _signup(client, "limit@example.com")
    assert client.post("/api/charts", json=CHART).status_code == 201
    assert client.post("/api/charts", json=CHART).status_code == 201
    r = client.post("/api/charts", json=CHART)
    assert r.status_code == 409
    assert r.json()["detail"] == "chart_limit_reached"

    uid = client.get("/api/auth/me").json()["user"]["id"]
    future = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(
        timespec="seconds"
    )
    users.update_billing(uid, premium_until=future, subscription_status="active")
    me = client.get("/api/auth/me").json()["user"]
    assert me["is_premium"] is True and me["chart_limit"] == 3
    assert client.post("/api/charts", json=CHART).status_code == 201
    assert client.post("/api/charts", json=CHART).status_code == 409


# ── password reset ───────────────────────────────────────────────────────


def test_forgot_password_503_without_smtp(client):
    r = client.post("/api/auth/forgot-password", json={"email": "x@example.com"})
    assert r.status_code == 503
    assert r.json()["detail"] == "reset_disabled"


def test_password_reset_flow(client, monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        mailer, "send_password_reset", lambda to, tok: sent.append((to, tok))
    )

    _signup(client, "reset@example.com")
    # unknown address: still 200, nothing sent
    r = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 200 and sent == []
    r = client.post("/api/auth/forgot-password", json={"email": "Reset@example.com"})
    assert r.status_code == 200 and len(sent) == 1
    to, token = sent[0]
    assert to == "reset@example.com"

    fresh = TestClient(app)
    r = fresh.post(
        "/api/auth/reset-password",
        json={"token": "wrong", "password": "brand-new-pass"},
    )
    assert r.status_code == 400 and r.json()["detail"] == "reset_token_invalid"
    r = fresh.post(
        "/api/auth/reset-password", json={"token": token, "password": "brand-new-pass"}
    )
    assert r.status_code == 200
    assert fresh.get("/api/auth/me").json()["user"]["email"] == "reset@example.com"
    # token is single use
    r = TestClient(app).post(
        "/api/auth/reset-password", json={"token": token, "password": "brand-new-pass"}
    )
    assert r.status_code == 400
    # old password no longer works, new one does
    assert (
        TestClient(app)
        .post(
            "/api/auth/login", json={"email": "reset@example.com", "password": PASSWORD}
        )
        .status_code
        == 401
    )
    assert (
        TestClient(app)
        .post(
            "/api/auth/login",
            json={"email": "reset@example.com", "password": "brand-new-pass"},
        )
        .status_code
        == 200
    )


def test_expired_reset_token_rejected(client):
    _signup(client, "expired@example.com")
    uid = client.get("/api/auth/me").json()["user"]["id"]
    token = users.create_reset_token(uid)
    with db.connect() as conn:
        conn.execute(
            "UPDATE password_resets SET expires_at = ?",
            ((datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),),
        )
    assert users.consume_reset_token(token) is None


# ── billing ──────────────────────────────────────────────────────────────


def test_billing_disabled_without_stripe(client):
    _signup(client, "bill0@example.com")
    r = client.post("/api/billing/checkout", json={"plan": "monthly"})
    assert r.status_code == 503 and r.json()["detail"] == "billing_disabled"
    r = client.post("/api/billing/webhook", content=b"{}")
    assert r.status_code == 503


def _stripe_env(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_x")
    monkeypatch.setenv("STRIPE_PRICE_MONTHLY", "price_m")
    monkeypatch.setenv("STRIPE_PRICE_YEARLY", "price_y")


def _fake_event(monkeypatch, event):
    def construct_event(payload, sig, secret):
        assert secret == "whsec_x"
        if sig != "good":
            raise ValueError("bad signature")
        return event

    monkeypatch.setattr(
        billing.stripe.Webhook, "construct_event", staticmethod(construct_event)
    )


def test_config_lists_plans_when_stripe_configured(client, monkeypatch):
    _stripe_env(monkeypatch)
    cfg = client.get("/api/auth/config").json()
    assert cfg["billing"] is True
    assert [p["id"] for p in cfg["plans"]] == ["monthly", "yearly"]


def test_webhook_rejects_bad_signature_and_is_exempt_from_api_key(client, monkeypatch):
    _stripe_env(monkeypatch)
    monkeypatch.setenv("API_KEYS", "some-key")
    _fake_event(monkeypatch, {"id": "evt_bad", "type": "ping", "data": {"object": {}}})
    r = client.post(
        "/api/billing/webhook", content=b"{}", headers={"Stripe-Signature": "nope"}
    )
    # 400 (signature) rather than 401 (api key) proves the exemption works.
    assert r.status_code == 400 and r.json()["detail"] == "invalid_signature"


def test_webhook_subscription_lifecycle(client, monkeypatch):
    _stripe_env(monkeypatch)
    _signup(client, "sub@example.com")
    uid = client.get("/api/auth/me").json()["user"]["id"]
    users.update_billing(uid, stripe_customer_id="cus_123")

    period_end = int((datetime.now(timezone.utc) + timedelta(days=31)).timestamp())
    created = {
        "id": "evt_1",
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "id": "sub_1",
                "customer": "cus_123",
                "status": "active",
                "cancel_at_period_end": False,
                # new-style API: period end lives on the item
                "items": {"data": [{"current_period_end": period_end}]},
            }
        },
    }
    _fake_event(monkeypatch, created)
    r = client.post(
        "/api/billing/webhook", content=b"{}", headers={"Stripe-Signature": "good"}
    )
    assert r.status_code == 200 and r.json() == {"received": True}
    me = client.get("/api/auth/me").json()["user"]
    assert me["is_premium"] is True
    assert me["plan"] == "premium"
    assert me["subscription_status"] == "active"
    assert me["has_billing"] is True

    # Stripe retry of the same event id is a no-op
    r = client.post(
        "/api/billing/webhook", content=b"{}", headers={"Stripe-Signature": "good"}
    )
    assert r.json() == {"received": True, "duplicate": True}

    deleted = {
        "id": "evt_2",
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_1",
                "customer": "cus_123",
                "status": "canceled",
                "cancel_at_period_end": False,
                "current_period_end": period_end,
            }
        },
    }
    _fake_event(monkeypatch, deleted)
    r = client.post(
        "/api/billing/webhook", content=b"{}", headers={"Stripe-Signature": "good"}
    )
    assert r.status_code == 200
    me = client.get("/api/auth/me").json()["user"]
    assert me["is_premium"] is False
    assert me["plan"] == "free"
    assert me["subscription_status"] == "canceled"


def test_webhook_matches_user_by_metadata_when_customer_unknown(client, monkeypatch):
    _stripe_env(monkeypatch)
    _signup(client, "meta@example.com")
    uid = client.get("/api/auth/me").json()["user"]["id"]
    period_end = int((datetime.now(timezone.utc) + timedelta(days=365)).timestamp())
    event = {
        "id": "evt_meta",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_meta",
                "customer": "cus_meta",
                "status": "trialing",
                "cancel_at_period_end": True,
                "current_period_end": period_end,
                "metadata": {"user_id": uid},
            }
        },
    }
    _fake_event(monkeypatch, event)
    r = client.post(
        "/api/billing/webhook", content=b"{}", headers={"Stripe-Signature": "good"}
    )
    assert r.status_code == 200
    me = client.get("/api/auth/me").json()["user"]
    assert me["is_premium"] is True
    assert me["cancel_at_period_end"] is True
    assert users.get_user_by_stripe_customer("cus_meta")["id"] == uid


def test_checkout_rejects_unknown_plan(client, monkeypatch):
    _stripe_env(monkeypatch)
    _signup(client, "plan@example.com")
    r = client.post("/api/billing/checkout", json={"plan": "lifetime"})
    assert r.status_code == 400 and r.json()["detail"] == "unknown_plan"


def test_portal_without_customer_is_404(client, monkeypatch):
    _stripe_env(monkeypatch)
    _signup(client, "portal@example.com")
    r = client.post("/api/billing/portal")
    assert r.status_code == 404 and r.json()["detail"] == "no_billing_account"


# ── backup ───────────────────────────────────────────────────────────────


def test_backup_writes_local_snapshot_without_r2(client, tmp_path, monkeypatch):
    from accounts import backup

    _signup(client, "backup@example.com")
    for var in (
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET",
    ):
        monkeypatch.delenv(var, raising=False)
    msg = backup.run_backup(keep=2)
    assert "local snapshot" in msg
    backups = list((db.db_path().parent / "backups").glob("app-*.db.gz"))
    assert len(backups) == 1
    # a second run prunes down to `keep`
    backup.run_backup(keep=1)
    backup.run_backup(keep=1)
    backups = list((db.db_path().parent / "backups").glob("app-*.db.gz"))
    assert len(backups) == 1
    assert os.path.getsize(backups[0]) > 0
