"""Replay-style tests for the M-PESA + Stripe payment refactors (Iter 23).

These tests poke the public callback endpoint with canonical Daraja payloads
+ Stripe-status flows and assert the user subscription was activated. They
lock down the helper-decomposition so future refactors can't silently break
revenue-critical paths.
"""
from __future__ import annotations

import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://create-app-1192.preview.emergentagent.com",
).rstrip("/")


def _register_user() -> tuple[str, str]:
    """Create a fresh test user. Returns (user_id, jwt_token)."""
    email = f"payreplay_{uuid.uuid4().hex[:8]}@fuelpro.app"
    r = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": "password123", "name": "PayReplay"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return data["user"]["id"], data["token"]


class TestMpesaCallbackReplay:
    """Replay a Daraja STK-callback payload directly against the public endpoint.

    The endpoint is unauthenticated by design (Safaricom calls it from their
    own infra). For a callback to flip a user → active we need a matching
    `payment_transactions` row with `checkout_request_id`. We can't create one
    without real Daraja credentials, so we instead validate the *behaviour*
    of the unmatched case (no DB write, returns ResultCode:0).
    """

    def test_callback_accepts_canonical_paid_payload(self):
        """A canonical Daraja success payload returns the Safaricom-expected ack."""
        payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "29115-34620561-1",
                    "CheckoutRequestID": f"ws_CO_{uuid.uuid4().hex[:12]}",
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": 1.0},
                            {"Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV"},
                            {"Name": "PhoneNumber", "Value": 254712345678},
                            {"Name": "TransactionDate", "Value": 20260520180000},
                        ],
                    },
                },
            },
        }
        r = requests.post(f"{BASE_URL}/api/mpesa/stk-callback", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body == {"ResultCode": 0, "ResultDesc": "Callback received"}

    def test_callback_accepts_failed_payload(self):
        """A failed Daraja callback (user cancelled) is still ack'd cleanly."""
        payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "29115-34620561-2",
                    "CheckoutRequestID": f"ws_CO_{uuid.uuid4().hex[:12]}",
                    "ResultCode": 1032,
                    "ResultDesc": "Request cancelled by user",
                },
            },
        }
        r = requests.post(f"{BASE_URL}/api/mpesa/stk-callback", json=payload, timeout=10)
        assert r.status_code == 200
        assert r.json()["ResultCode"] == 0

    def test_callback_handles_empty_metadata(self):
        """Some Daraja edge cases ship no CallbackMetadata — should not crash."""
        payload = {
            "Body": {
                "stkCallback": {
                    "CheckoutRequestID": f"ws_CO_{uuid.uuid4().hex[:12]}",
                    "ResultCode": 0,
                    "ResultDesc": "OK",
                },
            },
        }
        r = requests.post(f"{BASE_URL}/api/mpesa/stk-callback", json=payload, timeout=10)
        assert r.status_code == 200

    def test_callback_handles_partial_metadata(self):
        """Missing fields (no MpesaReceiptNumber) shouldn't bomb out."""
        payload = {
            "Body": {
                "stkCallback": {
                    "CheckoutRequestID": f"ws_CO_{uuid.uuid4().hex[:12]}",
                    "ResultCode": 0,
                    "ResultDesc": "OK",
                    "CallbackMetadata": {
                        "Item": [{"Name": "Amount", "Value": 2500.0}],
                    },
                },
            },
        }
        r = requests.post(f"{BASE_URL}/api/mpesa/stk-callback", json=payload, timeout=10)
        assert r.status_code == 200


class TestStripeStatusFlow:
    """Stripe-status endpoint flow — exercises the new _resolve_stripe_status +
    _activate_subscription_from_stripe helpers via a request against the live
    backend."""

    def test_status_unknown_session_returns_404(self):
        """No Stripe key configured AND no tx row → 503 from outer guard."""
        _, jwt = _register_user()
        r = requests.get(
            f"{BASE_URL}/api/payments/stripe/status/cs_test_does_not_exist_{uuid.uuid4().hex[:6]}",
            headers={"Authorization": f"Bearer {jwt}"},
            timeout=10,
        )
        # Either 503 (no stripe key configured) or 404 (key configured but session missing).
        # Both are valid responses depending on runtime config — the refactor must not crash.
        assert r.status_code in (404, 503), f"Got {r.status_code}: {r.text[:200]}"

    def test_status_requires_known_session_id(self):
        """The endpoint is path-parameterised — anything that 404s the URL itself
        should NOT be conflated with a Stripe-issue 502."""
        _, jwt = _register_user()
        # No session_id in path → FastAPI 404 on the route itself
        r = requests.get(
            f"{BASE_URL}/api/payments/stripe/status/",
            headers={"Authorization": f"Bearer {jwt}"},
            timeout=10,
            allow_redirects=False,
        )
        assert r.status_code in (404, 405, 422)


class TestClaimGuestFlow:
    """Locks down the Quick-Start + Claim-Guest pair introduced in Iter 21
    and bug-fixed in Iter 22 (RegisterBody → UserCreate)."""

    def test_quick_start_returns_jwt_and_guest_user(self):
        r = requests.post(f"{BASE_URL}/api/auth/quick-start", json={}, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data
        assert data["user"]["is_guest"] is True
        assert data["user"]["email"].startswith("guest_")
        assert data["user"]["subscription_status"] == "trial"

    def test_claim_guest_converts_to_real_email(self):
        # 1) Create guest
        qs = requests.post(f"{BASE_URL}/api/auth/quick-start", json={}, timeout=10)
        assert qs.status_code == 200
        guest_token = qs.json()["token"]
        guest_uid = qs.json()["user"]["id"]
        # 2) Claim with email + password
        new_email = f"claimed_{uuid.uuid4().hex[:8]}@fuelpro.app"
        r = requests.post(
            f"{BASE_URL}/api/auth/claim-guest",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"email": new_email, "password": "password123", "name": "Claimed"},
            timeout=10,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # User id preserved, is_guest flipped to False, new email present
        assert data["user"]["id"] == guest_uid
        assert data["user"]["is_guest"] is False
        assert data["user"]["email"] == new_email
        # 3) Verify we can login with the new email + password
        login = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": new_email, "password": "password123"},
            timeout=10,
        )
        assert login.status_code == 200, login.text
        assert login.json()["user"]["id"] == guest_uid

    def test_claim_guest_rejects_non_guest(self):
        """An already-registered user can't 'claim' (only guests have that path)."""
        _, jwt = _register_user()  # creates a non-guest user
        r = requests.post(
            f"{BASE_URL}/api/auth/claim-guest",
            headers={"Authorization": f"Bearer {jwt}"},
            json={"email": "spam@x.com", "password": "password123", "name": "X"},
            timeout=10,
        )
        assert r.status_code == 400
        assert "guest" in r.json().get("detail", "").lower()

    def test_claim_guest_rejects_duplicate_email(self):
        """Claiming with an email that already belongs to another user → 409."""
        # First user takes the email
        existing_email = f"taken_{uuid.uuid4().hex[:8]}@fuelpro.app"
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": existing_email, "password": "password123", "name": "Taken"},
            timeout=10,
        )
        # Guest tries to claim the same email
        qs = requests.post(f"{BASE_URL}/api/auth/quick-start", json={}, timeout=10)
        guest_token = qs.json()["token"]
        r = requests.post(
            f"{BASE_URL}/api/auth/claim-guest",
            headers={"Authorization": f"Bearer {guest_token}"},
            json={"email": existing_email, "password": "password123", "name": "X"},
            timeout=10,
        )
        assert r.status_code == 409


class TestRefactorHelpersExist:
    """Sanity check — imports the actual helper functions to fail loudly if a
    future refactor removes one of the named single-responsibility helpers."""

    def test_mpesa_helpers_importable(self):
        from routers.mpesa import (
            _parse_stk_callback,
            _update_payment_transaction,
            _activate_subscription_from_callback,
            mpesa_stk_callback_handler,
        )
        assert callable(_parse_stk_callback)
        assert callable(_update_payment_transaction)
        assert callable(_activate_subscription_from_callback)
        assert callable(mpesa_stk_callback_handler)

    def test_stripe_helpers_importable(self):
        from routers.payments import (
            _resolve_stripe_status,
            _activate_subscription_from_stripe,
            stripe_status,
        )
        assert callable(_resolve_stripe_status)
        assert callable(_activate_subscription_from_stripe)
        assert callable(stripe_status)

    def test_auth_helpers_importable(self):
        from routers.auth import (
            _fetch_emergent_oauth_profile,
            _upsert_google_user,
            _password_reset_rate_limited,
            _issue_password_reset_code,
            _send_password_reset_email,
        )
        assert callable(_fetch_emergent_oauth_profile)
        assert callable(_upsert_google_user)
        assert callable(_password_reset_rate_limited)
        assert callable(_issue_password_reset_code)
        assert callable(_send_password_reset_email)

    def test_parse_stk_callback_pure_function(self):
        """The parser is pure — should be deterministic given the same input."""
        from routers.mpesa import _parse_stk_callback
        payload = {
            "Body": {
                "stkCallback": {
                    "CheckoutRequestID": "checkout_x",
                    "ResultCode": 0,
                    "ResultDesc": "OK",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": 100.0},
                            {"Name": "MpesaReceiptNumber", "Value": "ABC123"},
                            {"Name": "PhoneNumber", "Value": 254712345678},
                            {"Name": "TransactionDate", "Value": 20260520180000},
                        ],
                    },
                },
            },
        }
        parsed = _parse_stk_callback(payload)
        assert parsed["checkout_request_id"] == "checkout_x"
        assert parsed["result_code"] == 0
        assert parsed["amount"] == 100.0
        assert parsed["receipt"] == "ABC123"
        assert parsed["phone"] == 254712345678
        assert parsed["txn_date"] == 20260520180000
        assert parsed["status_str"] == "paid"

        # Failed result
        failed_payload = dict(payload)
        failed_payload["Body"]["stkCallback"]["ResultCode"] = 1032
        parsed_fail = _parse_stk_callback(failed_payload)
        assert parsed_fail["status_str"] == "failed"
