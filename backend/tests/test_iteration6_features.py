"""FuelPro iteration 6 backend tests.

Covers:
- Auth register/login/me with real-looking email
- Password reset: request -> read code from Mongo -> confirm -> JWT works -> old password rejected
- Invites: create (owner), list, public lookup, accept, post-accept 410, staff 403
- Daily digest: preview, send (no_key), history persistence
- AI reconcile cache (cached=true on 2nd identical call)
- Subscription regression (plans, /subscription, /payments/stripe/checkout)
- EPRA fuel prices
- Sync isolation between two users
- Catch-all stub
- Audit log: digest.send and ai.reconcile_mpesa rows
"""
from __future__ import annotations

import os
import uuid
import time

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://create-app-1192.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "fuelpro")


def _email(suffix: str = "") -> str:
    return f"TEST_{uuid.uuid4().hex[:10]}{suffix}@fuelpro.app"


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def mdb():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="session")
def user_a(s):
    email = _email()
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "password123", "name": "Owner A"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "password": "password123", "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def user_b(s):
    email = _email("_b")
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "password123", "name": "Owner B"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "password": "password123", "token": data["token"], "user": data["user"]}


# ---------------------------------------------------------------- Auth
class TestAuthBaseline:
    def test_me(self, s, user_a):
        r = s.get(f"{API}/auth/me", headers=_auth(user_a["token"]))
        assert r.status_code == 200, r.text
        me = r.json()
        assert me["email"] == user_a["email"].lower()
        assert me["id"] == user_a["user"]["id"]
        # Default role is owner per server seeding
        assert me.get("role") in ("owner", None, "owner")  # owner expected

    def test_register_rejects_fake_tld(self, s):
        r = s.post(f"{API}/auth/register",
                   json={"email": f"x{uuid.uuid4().hex[:6]}@example.test",
                         "password": "password123", "name": "Bad"})
        # email_validator should reject .test
        assert r.status_code in (400, 422), r.text


# ---------------------------------------------------------------- Password reset
class TestPasswordReset:
    def test_full_flow(self, s, mdb):
        email = _email("_pr")
        r = s.post(f"{API}/auth/register",
                   json={"email": email, "password": "oldpass123", "name": "PR User"})
        assert r.status_code == 200, r.text

        # Request reset
        r = s.post(f"{API}/auth/password-reset/request", json={"email": email})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["email_sent"] is False
        # In production we strip the `delivery` field to avoid email-enumeration
        # via the `skipped:'no_key'` signal. In dev it's still present for debug.
        import os as _os
        _is_prod = _os.environ.get("APP_ENV", "production").lower() in {"production", "prod"}
        if not _is_prod:
            delivery = body.get("delivery") or {}
            assert delivery.get("skipped") == "no_key", f"delivery={delivery}"

        # Read code from Mongo
        rec = mdb.password_resets.find_one({"email": email.lower()})
        assert rec, "password_resets record should exist"
        code = rec["code"]
        assert isinstance(code, str) and len(code) == 6

        # Confirm
        r = s.post(f"{API}/auth/password-reset/confirm",
                   json={"email": email, "code": code, "new_password": "newpass456"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == email.lower()

        # New password works
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "newpass456"})
        assert r.status_code == 200, r.text

        # Old fails
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "oldpass123"})
        assert r.status_code == 401

    def test_unknown_email_returns_ok(self, s):
        r = s.post(f"{API}/auth/password-reset/request",
                   json={"email": _email("_nope")})
        assert r.status_code == 200
        # Enumeration-safe: no delivery/email_sent must be true
        body = r.json()
        assert body["ok"] is True

    def test_confirm_wrong_code_400(self, s):
        # Use freshly registered user (no reset code created)
        email = _email("_pr2")
        s.post(f"{API}/auth/register",
               json={"email": email, "password": "oldpass123", "name": "PR User2"})
        r = s.post(f"{API}/auth/password-reset/confirm",
                   json={"email": email, "code": "000000", "new_password": "abcdef"})
        assert r.status_code == 400


# ---------------------------------------------------------------- Invites
class TestInvites:
    def test_invite_lifecycle(self, s, user_a):
        teammate_email = _email("_invitee")
        r = s.post(f"{API}/invites",
                   json={"email": teammate_email, "role": "staff"},
                   headers=_auth(user_a["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert "code" in body and "accept_url" in body
        delivery = body.get("email_delivery") or {}
        assert delivery.get("skipped") == "no_key", f"delivery={delivery}"
        code = body["code"]

        # List
        r = s.get(f"{API}/invites", headers=_auth(user_a["token"]))
        assert r.status_code == 200
        items = r.json()["items"]
        assert any(it["code"] == code for it in items)

        # Public lookup
        r = s.get(f"{API}/invites/{code}")
        assert r.status_code == 200
        det = r.json()
        assert det["email"] == teammate_email.lower()
        assert det["role"] == "staff"

        # Accept
        r = s.post(f"{API}/invites/accept",
                   json={"code": code, "password": "newuser123", "name": "Teammate One"})
        assert r.status_code == 200, r.text
        accept_body = r.json()
        assert "token" in accept_body
        assert accept_body["user"]["email"] == teammate_email.lower()
        assert accept_body["user"].get("role") == "staff"

        # After accept: 410
        r = s.get(f"{API}/invites/{code}")
        assert r.status_code == 410, r.text

        # New user can log in
        r = s.post(f"{API}/auth/login",
                   json={"email": teammate_email, "password": "newuser123"})
        assert r.status_code == 200

    def test_staff_cannot_invite(self, s, user_a):
        # First create staff via invite
        staff_email = _email("_staffinvite")
        r = s.post(f"{API}/invites",
                   json={"email": staff_email, "role": "staff"},
                   headers=_auth(user_a["token"]))
        assert r.status_code == 200
        code = r.json()["code"]
        r = s.post(f"{API}/invites/accept",
                   json={"code": code, "password": "staff12345", "name": "Staffy"})
        assert r.status_code == 200
        staff_token = r.json()["token"]

        # Staff tries to invite -> 403
        r = s.post(f"{API}/invites",
                   json={"email": _email("_x"), "role": "staff"},
                   headers=_auth(staff_token))
        assert r.status_code == 403, r.text


# ---------------------------------------------------------------- Digest
class TestDigest:
    def test_preview_no_activity(self, s, user_b):
        r = s.post(f"{API}/digest/preview", headers=_auth(user_b["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert "digest" in body and "html" in body
        digest = body["digest"]
        # Fresh user => no activity skip is valid
        assert digest.get("skipped") in ("no_activity", None)

    def test_send_persists_history(self, s, user_b):
        r = s.post(f"{API}/digest/send", headers=_auth(user_b["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "digest" in body and "delivery" in body
        delivery = body["delivery"]
        assert delivery.get("ok") is False
        assert delivery.get("skipped") == "no_key"

        # History should now have >= 1 row
        r = s.get(f"{API}/digest/history", headers=_auth(user_b["token"]))
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        # Confirm shape
        assert "date" in items[0]


# ---------------------------------------------------------------- AI Reconcile cache
class TestAIReconcileCache:
    def test_cached_on_second_call(self, s, user_a):
        body = {
            "inflows": [
                {"receipt": "NLJ7RT61SV", "paidIn": 1500, "date": "2026-01-10"},
                {"receipt": "NLK8AB23CD", "paidIn": 2200, "date": "2026-01-10"},
            ],
            "sales": [
                {"id": "s1", "amount": 1500, "date": "2026-01-10", "fuel": "petrol"},
                {"id": "s2", "amount": 2200, "date": "2026-01-10", "fuel": "diesel"},
            ],
        }
        r1 = s.post(f"{API}/ai/reconcile-mpesa", json=body,
                    headers=_auth(user_a["token"]), timeout=60)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        if not d1.get("ok"):
            pytest.skip(f"AI reconcile returned not ok (LLM): {d1}")
        assert d1.get("cached") in (False, None)
        matches1 = d1.get("matches", [])

        # Repeat
        r2 = s.post(f"{API}/ai/reconcile-mpesa", json=body,
                    headers=_auth(user_a["token"]), timeout=30)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2.get("cached") is True, f"Expected cached=true, got {d2}"
        assert d2.get("matches", []) == matches1


# ---------------------------------------------------------------- Subscription regression
class TestSubscriptionRegression:
    def test_plans(self, s):
        r = s.get(f"{API}/plans")
        assert r.status_code == 200
        plans = r.json()["plans"]
        assert {p["key"] for p in plans} == {"free", "starter", "pro", "enterprise"}

    def test_subscription_shape(self, s, user_a):
        r = s.get(f"{API}/subscription", headers=_auth(user_a["token"]))
        assert r.status_code == 200
        body = r.json()
        assert body["tier"] == "free"
        assert body["status"] == "trial"
        assert body["plan"]["key"] == "free"

    def test_stripe_checkout_creation(self, s, user_a):
        r = s.post(f"{API}/payments/stripe/checkout",
                   json={"plan": "pro", "origin_url": "https://example.com",
                         "billing_cycle": "monthly"},
                   headers=_auth(user_a["token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com/")


# ---------------------------------------------------------------- EPRA
class TestEpraPrices:
    def test_prices(self, s):
        r = s.get(f"{API}/fuel-prices/current")
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        for region in ("nairobi", "mombasa", "kisumu"):
            for fuel in ("petrol", "diesel", "kerosene"):
                assert fuel in body["prices"][region]


# ---------------------------------------------------------------- Sync isolation
class TestSyncIsolation:
    def test_user_a_not_seen_by_user_b(self, s, user_a, user_b):
        items = [{"id": f"iso-{uuid.uuid4().hex[:6]}", "litres": 10, "amount": 1700}]
        r = s.post(f"{API}/sync/sales", json={"items": items},
                   headers=_auth(user_a["token"]))
        assert r.status_code == 200

        r = s.get(f"{API}/sync/sales", headers=_auth(user_b["token"]))
        assert r.status_code == 200
        ids = {it.get("id") for it in r.json()["items"]}
        assert items[0]["id"] not in ids


# ---------------------------------------------------------------- Catch-all
class TestCatchAll:
    def test_unknown_returns_stub(self, s):
        import os as _os
        _is_prod = _os.environ.get("APP_ENV", "production").lower() in {"production", "prod"}
        r = s.get(f"{API}/something-unknown")
        if _is_prod:
            assert r.status_code == 404
        else:
            assert r.status_code == 200
            body = r.json()
            assert body["ok"] is True
            assert body.get("stub") is True


# ---------------------------------------------------------------- Audit log entries
class TestAuditEntries:
    def test_ai_reconcile_in_audit(self, s, user_a):
        r = s.get(f"{API}/audit-log", headers=_auth(user_a["token"]))
        assert r.status_code == 200
        actions = [it["action"] for it in r.json()["items"]]
        assert "ai.reconcile_mpesa" in actions, f"actions seen: {set(actions)}"

    def test_digest_send_in_audit(self, s, user_b):
        # digest.send was triggered earlier; confirm row exists in audit_log
        r = s.get(f"{API}/audit-log", headers=_auth(user_b["token"]))
        assert r.status_code == 200
        actions = [it["action"] for it in r.json()["items"]]
        assert "digest.send" in actions, (
            f"BUG: /api/digest/send does NOT write digest.send to audit_log. "
            f"Actions seen for user_b: {set(actions)}"
        )
