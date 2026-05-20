"""Smoke tests for the Web Push (VAPID) router."""
import os
import uuid
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://create-app-1192.preview.emergentagent.com",
).rstrip("/")


def test_public_key_is_returned():
    """Anyone (no auth) can fetch the VAPID public key — needed to subscribe."""
    r = requests.get(f"{BASE_URL}/api/push/public-key", timeout=10)
    assert r.status_code in (200, 503), r.text
    if r.status_code == 200:
        body = r.json()
        assert "public_key" in body
        # P-256 uncompressed base64url ≈ 87 chars
        assert len(body["public_key"]) >= 60


def test_subscribe_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/push/subscribe",
        json={"endpoint": "https://example.com/push", "keys": {"p256dh": "x", "auth": "y"}},
        timeout=10,
    )
    assert r.status_code in (401, 403, 422), r.text


def test_unsubscribe_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/push/unsubscribe",
        json={"endpoint": "https://example.com/push"},
        timeout=10,
    )
    assert r.status_code in (401, 403, 422), r.text


def test_test_endpoint_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/push/test",
        json={"title": "hello", "body": "world"},
        timeout=10,
    )
    assert r.status_code in (401, 403, 422), r.text


def test_authed_user_can_subscribe_and_list():
    """End-to-end: register a fresh user, subscribe a fake endpoint, list, unsubscribe."""
    email = f"push_{uuid.uuid4().hex[:8]}@fuelpro.app"
    pw = "TestPushPw1!"
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": pw, "name": "Push Tester"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    token = r.json().get("token") or r.json().get("access_token")
    assert token
    headers = {"Authorization": f"Bearer {token}"}

    endpoint = f"https://example.com/push/{uuid.uuid4().hex}"
    r = s.post(
        f"{BASE_URL}/api/push/subscribe",
        headers=headers,
        json={"endpoint": endpoint, "keys": {"p256dh": "abc", "auth": "def"}, "user_agent": "pytest"},
        timeout=10,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    r = s.get(f"{BASE_URL}/api/push/subscriptions", headers=headers, timeout=10)
    assert r.status_code == 200, r.text
    items = r.json().get("items", [])
    assert any(it.get("endpoint") == endpoint for it in items)

    r = s.post(f"{BASE_URL}/api/push/unsubscribe", headers=headers, json={"endpoint": endpoint}, timeout=10)
    assert r.status_code == 200, r.text
    assert r.json().get("deleted") == 1
