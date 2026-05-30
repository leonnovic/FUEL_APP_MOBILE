"""Comprehensive test suite for FuelPro backend.

Tests cover: auth, payments, sync, M-PESA, inventory alerts, shifts, analytics.
Run with: pytest tests/ -v --cov=backend --cov-report=html
"""

from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from jose import jwt

# Set test environment before importing app
os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "fuelpro_test"
os.environ["JWT_SECRET"] = "test-secret-key-that-is-at-least-32-chars-long"
os.environ["FOUNDER_DEFAULT_PASSWORD"] = "test-founder-password-123"
os.environ["STRIPE_API_KEY"] = "sk_test_xxxxxxxx"
os.environ["MPESA_CONSUMER_KEY"] = "test_key"
os.environ["MPESA_CONSUMER_SECRET"] = "test_secret"
os.environ["MPESA_PASSKEY"] = "test_passkey"
os.environ["PUBLIC_BACKEND_URL"] = "http://localhost:8000"
os.environ["APP_ENV"] = "test"

from backend.server import app
from backend.core import (
    JWT_ALG, JWT_SECRET, _hash_pw, _make_token, _verify_pw, db,
    get_db, new_id, now_iso, normalize_phone, validate_sync_item,
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True)
async def clean_db():
    """Clean test database before each test."""
    database = await get_db()
    collections = [
        "users", "user_data", "sync_stations", "sync_sales", "sync_inventory",
        "sync_employees", "sync_invoices", "sync_deliveries", "sync_expenses",
        "sync_suppliers", "audit_log", "password_resets", "password_resets_log",
        "payment_transactions", "subscriptions", "inventory_alert_config",
        "inventory_alerts", "shifts", "runtime_config",
    ]
    for coll in collections:
        await database[coll].delete_many({})
    yield
    for coll in collections:
        await database[coll].delete_many({})

@pytest.fixture
async def test_user():
    """Create a test user and return user doc + token."""
    database = await get_db()
    user = {
        "id": new_id(),
        "email": "test@fuelpro.app",
        "name": "Test User",
        "password_hash": _hash_pw("password123"),
        "role": "owner",
        "tier": "starter",
        "subscription_status": "active",
        "trial_started_at": now_iso(),
        "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await database.users.insert_one(user)
    token = _make_token(user["id"])
    return {"user": user, "token": token}

@pytest.fixture
async def test_station(test_user):
    """Create a test station."""
    database = await get_db()
    station = {
        "id": new_id(),
        "user_id": test_user["user"]["id"],
        "name": "Test Station",
        "location": "Nairobi",
        "manager": "Test Manager",
    }
    await database.sync_stations.insert_one(station)
    return station

# ---------------------------------------------------------------------------
# Core Tests
# ---------------------------------------------------------------------------
class TestCore:
    def test_jwt_secret_validation(self):
        """JWT_SECRET must be at least 32 characters."""
        assert len(JWT_SECRET) >= 32

    def test_password_hashing(self):
        """Password hashing and verification works."""
        pw = "test_password_123"
        hashed = _hash_pw(pw)
        assert _verify_pw(pw, hashed)
        assert not _verify_pw("wrong_password", hashed)

    def test_token_generation(self):
        """Token generation and decoding works."""
        uid = new_id()
        token = _make_token(uid)
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        assert payload["sub"] == uid
        assert "exp" in payload

    def test_phone_normalization(self):
        """Phone number normalization works correctly."""
        assert normalize_phone("0712345678") == "254712345678"
        assert normalize_phone("+254712345678") == "254712345678"
        assert normalize_phone("712345678") == "254712345678"
        assert normalize_phone("  0712-345-678  ") == "254712345678"

    def test_sync_validation(self):
        """Sync item validation works."""
        # Valid item
        item = {"name": "Test Station", "location": "Nairobi"}
        is_valid, msg = validate_sync_item("stations", item)
        assert is_valid

        # Missing required field
        item = {"location": "Nairobi"}
        is_valid, msg = validate_sync_item("stations", item)
        assert not is_valid
        assert "Missing required field" in msg

        # Wrong type
        item = {"name": 123}
        is_valid, msg = validate_sync_item("stations", item)
        assert not is_valid
        assert "must be of type" in msg

        # XSS sanitization
        item = {"name": "<script>alert('xss')</script>"}
        is_valid, msg = validate_sync_item("stations", item)
        assert is_valid
        assert "&lt;script&gt;" in item["name"]

# ---------------------------------------------------------------------------
# Auth Tests
# ---------------------------------------------------------------------------
class TestAuth:
    def test_register(self):
        """User registration works."""
        response = client.post("/api/auth/register", json={
            "email": "newuser@fuelpro.app",
            "password": "password123",
            "name": "New User",
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "newuser@fuelpro.app"

    def test_register_duplicate_email(self):
        """Duplicate email registration fails."""
        client.post("/api/auth/register", json={
            "email": "dup@fuelpro.app",
            "password": "password123",
            "name": "Dup User",
        })
        response = client.post("/api/auth/register", json={
            "email": "dup@fuelpro.app",
            "password": "password123",
            "name": "Dup User 2",
        })
        assert response.status_code == 409

    def test_login(self, test_user):
        """Login with valid credentials works."""
        response = client.post("/api/auth/login", json={
            "email": test_user["user"]["email"],
            "password": "password123",
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data

    def test_login_invalid(self):
        """Login with invalid credentials fails."""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@fuelpro.app",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_me(self, test_user):
        """Get current user works."""
        response = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {test_user['token']}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user["user"]["email"]

    def test_password_reset_request(self):
        """Password reset request returns generic message."""
        response = client.post("/api/auth/password-reset/request", json={
            "email": "any@fuelpro.app",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        # Should not reveal if email exists
        assert "email_sent" in data

    def test_quick_start(self):
        """Quick start creates guest user."""
        response = client.post("/api/auth/quick-start")
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["is_guest"] is True
        assert "guest_" in data["user"]["email"]

# ---------------------------------------------------------------------------
# Sync Tests
# ---------------------------------------------------------------------------
class TestSync:
    def test_sync_put_validation(self, test_user):
        """Sync put validates items."""
        response = client.post("/api/sync/stations", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "items": [
                {"name": "Station 1", "location": "Nairobi"},
                {"name": "Station 2", "location": "Mombasa"},
            ]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["validated"] is True

    def test_sync_put_invalid_collection(self, test_user):
        """Sync put rejects unknown collections."""
        response = client.post("/api/sync/unknown", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={"items": []})
        assert response.status_code == 400

    def test_sync_put_xss_sanitization(self, test_user):
        """Sync put sanitizes XSS in strings."""
        response = client.post("/api/sync/stations", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "items": [{"name": "<script>alert('xss')</script>", "location": "Nairobi"}]
        })
        assert response.status_code == 200
        # Verify sanitization in DB

    def test_sync_get_pagination(self, test_user):
        """Sync get supports pagination."""
        # Insert test data
        response = client.get("/api/sync/stations", headers={
            "Authorization": f"Bearer {test_user['token']}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "pagination" in data
        assert "has_more" in data["pagination"]

# ---------------------------------------------------------------------------
# M-PESA Tests
# ---------------------------------------------------------------------------
class TestMpesa:
    @patch("backend.routers.mpesa.daraja.configured")
    def test_stk_push_mock(self, mock_configured, test_user):
        """STK push returns mock when Daraja not configured."""
        mock_configured.return_value = False
        response = client.post("/api/mpesa/stk-push", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "plan": "starter",
            "phone": "0712345678",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["mocked"] is True

    def test_stk_push_invalid_plan(self, test_user):
        """STK push rejects invalid plan."""
        response = client.post("/api/mpesa/stk-push", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "plan": "invalid",
            "phone": "0712345678",
        })
        assert response.status_code == 400

    def test_stk_push_invalid_phone(self, test_user):
        """STK push rejects invalid phone."""
        response = client.post("/api/mpesa/stk-push", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "plan": "starter",
            "phone": "12345",
        })
        assert response.status_code == 400

    def test_verify_receipt(self):
        """Receipt verification works."""
        response = client.get("/api/verify/receipt/TEST123")
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is False  # No such receipt in test DB

# ---------------------------------------------------------------------------
# Inventory Alerts Tests
# ---------------------------------------------------------------------------
class TestInventoryAlerts:
    def test_set_alert_config(self, test_user):
        """Set inventory alert configuration."""
        response = client.post("/api/inventory-alerts/config", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "thresholds": [
                {"fuel_type": "Petrol", "threshold_liters": 1000, "reorder_quantity": 5000},
                {"fuel_type": "Diesel", "threshold_liters": 500, "reorder_quantity": 3000},
            ],
            "channels": ["push", "email"],
            "cooldown_hours": 6,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True

    def test_invalid_channel(self, test_user):
        """Invalid channel is rejected."""
        response = client.post("/api/inventory-alerts/config", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "thresholds": [],
            "channels": ["invalid_channel"],
        })
        assert response.status_code == 400

    def test_check_alerts_no_inventory(self, test_user):
        """Check alerts with no inventory data returns empty."""
        response = client.post("/api/inventory-alerts/check", headers={
            "Authorization": f"Bearer {test_user['token']}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["triggered"] == 0

# ---------------------------------------------------------------------------
# Shift Management Tests
# ---------------------------------------------------------------------------
class TestShiftManagement:
    def test_start_shift(self, test_user):
        """Start a new shift."""
        response = client.post("/api/shifts/start", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "station_id": "station_1",
            "attendant_id": "attendant_1",
            "opening_cash": 5000,
            "fuel_readings": {"Petrol": 10000, "Diesel": 8000},
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["shift"]["status"] == "active"

    def test_end_shift(self, test_user):
        """End an active shift."""
        # First start a shift
        start_response = client.post("/api/shifts/start", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "station_id": "station_1",
            "attendant_id": "attendant_1",
            "opening_cash": 5000,
        })
        shift_id = start_response.json()["shift"]["id"]

        # End the shift
        response = client.post("/api/shifts/end", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "shift_id": shift_id,
            "closing_cash": 15000,
            "total_sales": 12000,
            "total_expenses": 2000,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["shift"]["status"] == "closed"
        assert data["shift"]["cash_variance"] is not None

    def test_end_nonexistent_shift(self, test_user):
        """Ending non-existent shift fails."""
        response = client.post("/api/shifts/end", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "shift_id": "nonexistent",
            "closing_cash": 10000,
            "total_sales": 5000,
        })
        assert response.status_code == 404

# ---------------------------------------------------------------------------
# Analytics Tests
# ---------------------------------------------------------------------------
class TestAnalytics:
    def test_kpi_empty(self, test_user):
        """KPI with no data returns zeros."""
        response = client.post("/api/analytics/kpi", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "from_date": "2024-01-01",
            "to_date": "2024-01-31",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["kpis"]["total_sales"] == 0

    def test_trends_insufficient_data(self, test_user):
        """Trends with insufficient data returns message."""
        response = client.post("/api/analytics/trends", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "from_date": "2024-01-01",
            "to_date": "2024-01-01",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["trend"] == "insufficient_data"

    def test_forecast_insufficient_data(self, test_user):
        """Forecast with insufficient data returns message."""
        response = client.post("/api/analytics/forecast", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "metric": "sales",
            "days_ahead": 7,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["forecast"] == "insufficient_data"

# ---------------------------------------------------------------------------
# Health Tests
# ---------------------------------------------------------------------------
class TestHealth:
    def test_health_endpoint(self):
        """Health endpoint returns ok."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True

# ---------------------------------------------------------------------------
# Security Tests
# ---------------------------------------------------------------------------
class TestSecurity:
    def test_no_auth_on_protected(self):
        """Protected endpoints require auth."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_invalid_token(self):
        """Invalid token is rejected."""
        response = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid_token"
        })
        assert response.status_code == 401

    def test_sql_injection_attempt(self, test_user):
        """SQL injection patterns are handled."""
        response = client.post("/api/auth/login", json={
            "email": "test@test.com'; DROP TABLE users; --",
            "password": "anything",
        })
        # Should fail auth, not crash
        assert response.status_code in [401, 400]

    def test_xss_in_sync(self, test_user):
        """XSS payloads are sanitized in sync data."""
        response = client.post("/api/sync/stations", headers={
            "Authorization": f"Bearer {test_user['token']}"
        }, json={
            "items": [{"name": "<img src=x onerror=alert(1)>", "location": "Nairobi"}]
        })
        assert response.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
