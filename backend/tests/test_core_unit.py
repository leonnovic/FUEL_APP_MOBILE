"""Unit tests for core.py — pure helpers, Pydantic models, auth primitives.

These tests import selectively to avoid needing a live MongoDB connection.
"""
from __future__ import annotations

import hashlib
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import pytest

# Ensure backend/ is on sys.path so we can import core helpers
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# We need env vars set before importing core, to avoid KeyError on MONGO_URL etc.
_FAKE_ENV = {
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "fuelpro_test",
    "JWT_SECRET": "test-secret-key-for-unit-tests",
    "JWT_ALG": "HS256",
    "JWT_EXPIRE_HOURS": "1",
    "PASSWORD_PEPPER": "test-pepper",
    "APP_ENV": "development",
}
for k, v in _FAKE_ENV.items():
    os.environ.setdefault(k, v)

from core import (
    ALLOWED_COLLECTIONS,
    ALLOWED_ROLES,
    PLANS,
    UserCreate,
    UserLogin,
    UserOut,
    _hash_pw,
    _make_token,
    _verify_pw,
    new_id,
    normalize_phone,
    now_iso,
    verify_mpesa_webhook,
)


# ---------------------------------------------------------------------------
# normalize_phone
# ---------------------------------------------------------------------------
class TestNormalizePhone:
    def test_kenyan_07_format(self):
        assert normalize_phone("0712345678") == "254712345678"

    def test_kenyan_254_format(self):
        assert normalize_phone("254712345678") == "254712345678"

    def test_kenyan_7_format(self):
        assert normalize_phone("712345678") == "254712345678"

    def test_strips_plus(self):
        assert normalize_phone("+254712345678") == "254712345678"

    def test_strips_spaces_and_dashes(self):
        assert normalize_phone("071-234 5678") == "254712345678"

    def test_international_number_passthrough(self):
        result = normalize_phone("+1234567890123")
        assert result == "1234567890123"

    def test_short_number_passthrough(self):
        result = normalize_phone("12345")
        assert result == "12345"


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
class TestPasswordHashing:
    def test_hash_and_verify(self):
        pw = "SecurePassword123!"
        hashed = _hash_pw(pw)
        assert hashed != pw
        assert _verify_pw(pw, hashed) is True

    def test_wrong_password_fails(self):
        hashed = _hash_pw("correct-password")
        assert _verify_pw("wrong-password", hashed) is False

    def test_hash_is_unique(self):
        h1 = _hash_pw("same-password")
        h2 = _hash_pw("same-password")
        assert h1 != h2  # bcrypt salting

    def test_verify_with_garbage_hash(self):
        assert _verify_pw("anything", "not-a-valid-hash") is False


# ---------------------------------------------------------------------------
# JWT token creation
# ---------------------------------------------------------------------------
class TestMakeToken:
    def test_returns_string(self):
        token = _make_token("user-123")
        assert isinstance(token, str)
        assert len(token) > 20

    def test_token_contains_sub(self):
        from jose import jwt
        token = _make_token("user-abc")
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
        assert payload["sub"] == "user-abc"
        assert "jti" in payload
        assert "exp" in payload
        assert "iat" in payload


# ---------------------------------------------------------------------------
# verify_mpesa_webhook
# ---------------------------------------------------------------------------
class TestVerifyMpesaWebhook:
    def test_no_secret_configured_non_prod(self):
        with patch("core.MPESA_WEBHOOK_SECRET", ""):
            with patch("core.IS_PRODUCTION", False):
                assert verify_mpesa_webhook("body", "sig") is True

    def test_no_secret_configured_prod(self):
        with patch("core.MPESA_WEBHOOK_SECRET", ""):
            with patch("core.IS_PRODUCTION", True):
                assert verify_mpesa_webhook("body", "sig") is False

    def test_valid_signature(self):
        secret = "test-webhook-secret"
        body = '{"key": "value"}'
        expected = hashlib.sha256(f"{body}{secret}".encode()).hexdigest()
        with patch("core.MPESA_WEBHOOK_SECRET", secret):
            assert verify_mpesa_webhook(body, expected) is True

    def test_invalid_signature(self):
        with patch("core.MPESA_WEBHOOK_SECRET", "secret"):
            assert verify_mpesa_webhook("body", "wrong-sig") is False


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
class TestNewId:
    def test_returns_uuid_string(self):
        result = new_id()
        uuid.UUID(result)  # raises if invalid

    def test_unique(self):
        ids = {new_id() for _ in range(100)}
        assert len(ids) == 100


class TestNowIso:
    def test_returns_iso_string(self):
        result = now_iso()
        dt = datetime.fromisoformat(result)
        assert dt.tzinfo is not None


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class TestUserCreate:
    def test_valid(self):
        u = UserCreate(email="test@fuelpro.app", password="pass123", name="Test")
        assert u.email == "test@fuelpro.app"

    def test_short_password_rejected(self):
        with pytest.raises(Exception):
            UserCreate(email="test@fuelpro.app", password="short", name="Test")

    def test_empty_name_rejected(self):
        with pytest.raises(Exception):
            UserCreate(email="test@fuelpro.app", password="password123", name="")


class TestUserLogin:
    def test_valid(self):
        u = UserLogin(email="test@fuelpro.app", password="pw")
        assert u.email == "test@fuelpro.app"


class TestUserOut:
    def test_defaults(self):
        u = UserOut(id="123", email="a@b.com", name="N", created_at="2026-01-01")
        assert u.role == "owner"
        assert u.tier == "free"
        assert u.subscription_status == "trial"
        assert u.is_guest is False


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
class TestConstants:
    def test_plans_keys(self):
        assert set(PLANS.keys()) == {"free", "starter", "pro", "enterprise"}

    def test_plans_have_required_fields(self):
        for key, plan in PLANS.items():
            assert "price_usd" in plan
            assert "price_kes" in plan
            assert "features" in plan
            assert "max_stations" in plan
            assert plan["key"] == key

    def test_allowed_roles(self):
        assert "owner" in ALLOWED_ROLES
        assert "manager" in ALLOWED_ROLES
        assert "staff" in ALLOWED_ROLES
        assert "auditor" in ALLOWED_ROLES

    def test_allowed_collections(self):
        assert "stations" in ALLOWED_COLLECTIONS
        assert "sales" in ALLOWED_COLLECTIONS
        assert "inventory" in ALLOWED_COLLECTIONS
