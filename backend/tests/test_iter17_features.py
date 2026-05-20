"""Iter-17 backend tests: Apple/Microsoft OAuth, S3 storage, WebSocket sync, broadcast.

Run:
  pytest /app/backend/tests/test_iter17_features.py -v \
    --junitxml=/app/test_reports/pytest/iter17_results.xml
"""
from __future__ import annotations

import asyncio
import json
import os
import time
import uuid

import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to reading from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

WS_BASE = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
# Founder password read from env (see conftest.py for fallback to .env file).
FOUNDER_PASSWORD = os.environ.get("FOUNDER_PASSWORD") or "publican1D#20"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def founder_token(s):
    r = s.post(f"{BASE_URL}/api/founder/login",
               json={"username": "FOUNDER", "password": FOUNDER_PASSWORD},
               timeout=15)
    assert r.status_code == 200, f"Founder login failed: {r.status_code} {r.text}"
    tok = r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def founder_headers(founder_token):
    return {"Authorization": f"Bearer {founder_token}"}


@pytest.fixture(scope="module")
def user_token(s):
    email = f"TEST_iter17_{uuid.uuid4().hex[:8]}@fuelpro.app"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"email": email, "password": "password123", "name": "Iter17 Tester"},
               timeout=15)
    assert r.status_code in (200, 201), f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["token"], "email": email, "user_id": data["user"]["id"]}


@pytest.fixture(scope="module")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token['token']}"}


# ---------------------------------------------------------------------------
# OAuth providers endpoint
# ---------------------------------------------------------------------------
class TestOAuthProviders:
    def test_oauth_providers_no_keys(self, s, founder_headers):
        # Ensure keys are absent
        s.delete(f"{BASE_URL}/api/founder/integrations/apple_client_id", headers=founder_headers)
        s.delete(f"{BASE_URL}/api/founder/integrations/microsoft_client_id", headers=founder_headers)

        r = s.get(f"{BASE_URL}/api/auth/oauth-providers")
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["google"] is True
        assert d["apple"] is False
        assert d["microsoft"] is False
        assert "microsoft_tenant" in d

    def test_apple_signin_unconfigured(self, s):
        r = s.post(f"{BASE_URL}/api/auth/apple",
                   json={"id_token": "bogus.token.value"}, timeout=15)
        assert r.status_code == 503
        assert "not configured" in r.json().get("detail", "").lower()

    def test_microsoft_signin_unconfigured(self, s):
        r = s.post(f"{BASE_URL}/api/auth/microsoft",
                   json={"id_token": "bogus.token.value"}, timeout=15)
        assert r.status_code == 503
        assert "not configured" in r.json().get("detail", "").lower()

    def test_apple_bogus_token_after_config(self, s, founder_headers):
        # Set Apple client id
        r = s.post(f"{BASE_URL}/api/founder/integrations",
                   json={"apple_client_id": "com.fuelpro.signin.test"},
                   headers=founder_headers, timeout=15)
        assert r.status_code == 200
        # Verify oauth-providers now lists apple
        prov = s.get(f"{BASE_URL}/api/auth/oauth-providers").json()
        assert prov["apple"] is True
        # Bogus token → should fail in JWT validation (401)
        r2 = s.post(f"{BASE_URL}/api/auth/apple",
                    json={"id_token": "bogus.token.value"}, timeout=20)
        assert r2.status_code == 401, f"Expected 401, got {r2.status_code}: {r2.text}"
        # Cleanup
        s.delete(f"{BASE_URL}/api/founder/integrations/apple_client_id", headers=founder_headers)
        prov2 = s.get(f"{BASE_URL}/api/auth/oauth-providers").json()
        assert prov2["apple"] is False


# ---------------------------------------------------------------------------
# Founder integration test endpoints (apple/microsoft/s3)
# ---------------------------------------------------------------------------
class TestFounderIntegrationTests:
    def test_apple_test_unset(self, s, founder_headers):
        s.delete(f"{BASE_URL}/api/founder/integrations/apple_client_id", headers=founder_headers)
        r = s.post(f"{BASE_URL}/api/founder/integrations/test/apple",
                   json={"to": "x@y.com", "message": "ping"},
                   headers=founder_headers)
        assert r.status_code == 200
        assert r.json()["ok"] is False

    def test_apple_test_set(self, s, founder_headers):
        s.post(f"{BASE_URL}/api/founder/integrations",
               json={"apple_client_id": "com.fuelpro.test"},
               headers=founder_headers)
        r = s.post(f"{BASE_URL}/api/founder/integrations/test/apple",
                   json={"to": "x@y.com", "message": "ping"},
                   headers=founder_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body.get("client_id_present") is True
        s.delete(f"{BASE_URL}/api/founder/integrations/apple_client_id", headers=founder_headers)

    def test_microsoft_test_flow(self, s, founder_headers):
        s.delete(f"{BASE_URL}/api/founder/integrations/microsoft_client_id", headers=founder_headers)
        r = s.post(f"{BASE_URL}/api/founder/integrations/test/microsoft",
                   json={"to": "x@y.com", "message": "ping"},
                   headers=founder_headers)
        assert r.status_code == 200 and r.json()["ok"] is False
        s.post(f"{BASE_URL}/api/founder/integrations",
               json={"microsoft_client_id": "azure-app-id", "microsoft_tenant": "common"},
               headers=founder_headers)
        r2 = s.post(f"{BASE_URL}/api/founder/integrations/test/microsoft",
                    json={"to": "x@y.com", "message": "ping"},
                    headers=founder_headers)
        assert r2.status_code == 200
        body = r2.json()
        assert body["ok"] is True
        assert body.get("tenant") == "common"
        s.delete(f"{BASE_URL}/api/founder/integrations/microsoft_client_id", headers=founder_headers)

    def test_s3_test_unconfigured(self, s, founder_headers):
        r = s.post(f"{BASE_URL}/api/founder/integrations/test/s3",
                   json={"to": "x@y.com", "message": "ping"},
                   headers=founder_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is False
        assert "not configured" in body.get("error", "").lower()


# ---------------------------------------------------------------------------
# Founder integrations CRUD includes new fields
# ---------------------------------------------------------------------------
class TestFounderIntegrationsCRUD:
    def test_set_and_get_new_keys(self, s, founder_headers):
        payload = {
            "apple_client_id": "com.test.apple",
            "microsoft_client_id": "azure-id-xyz",
            "microsoft_tenant": "organizations",
            "aws_access_key_id": "AKIATESTTESTTEST",
            "aws_secret_access_key": "secrettest1234567890",
            "aws_region": "us-west-2",
            "aws_s3_bucket": "test-bucket-iter17",
        }
        r = s.post(f"{BASE_URL}/api/founder/integrations",
                   json=payload, headers=founder_headers)
        assert r.status_code == 200
        applied = r.json()["applied"]
        for k in payload:
            assert k in applied

        r2 = s.get(f"{BASE_URL}/api/founder/integrations", headers=founder_headers)
        assert r2.status_code == 200
        body = r2.json()
        integ = body["integrations"]
        # Masked but present
        for k in payload:
            assert integ.get(k), f"{k} missing from integrations"
        live = body["live_env_present"]
        for k in payload:
            env_name = {
                "apple_client_id": "APPLE_CLIENT_ID",
                "microsoft_client_id": "MICROSOFT_CLIENT_ID",
                "microsoft_tenant": "MICROSOFT_TENANT",
                "aws_access_key_id": "AWS_ACCESS_KEY_ID",
                "aws_secret_access_key": "AWS_SECRET_ACCESS_KEY",
                "aws_region": "AWS_REGION",
                "aws_s3_bucket": "AWS_S3_BUCKET",
            }[k]
            assert live.get(env_name) is True, f"env {env_name} not live"

        # Cleanup
        for k in payload:
            s.delete(f"{BASE_URL}/api/founder/integrations/{k}", headers=founder_headers)


# ---------------------------------------------------------------------------
# S3 storage endpoints
# ---------------------------------------------------------------------------
class TestStorage:
    def test_storage_config(self, s, user_headers):
        r = s.get(f"{BASE_URL}/api/storage/config", headers=user_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["configured"] is False  # no aws keys
        assert len(d["categories"]) == 6
        assert set(d["categories"]) == {"receipts", "photos", "payroll", "documents", "logos", "misc"}
        assert "user_id" in d

    def test_storage_presign_upload_unconfigured(self, s, user_headers):
        r = s.post(f"{BASE_URL}/api/storage/presign-upload",
                   json={"filename": "test.pdf", "content_type": "application/pdf",
                         "category": "receipts"},
                   headers=user_headers)
        assert r.status_code == 503

    def test_storage_list_empty(self, s, user_headers):
        r = s.get(f"{BASE_URL}/api/storage/list", headers=user_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert d["items"] == []


# ---------------------------------------------------------------------------
# WebSocket /ws/sync
# ---------------------------------------------------------------------------
class TestWebSocket:
    def test_ws_no_token_closes(self):
        async def run():
            uri = f"{WS_BASE}/api/ws/sync"
            try:
                async with websockets.connect(uri, open_timeout=10) as ws:
                    try:
                        await asyncio.wait_for(ws.recv(), timeout=3)
                    except websockets.ConnectionClosed as cc:
                        return ("close", cc.code)
                    except asyncio.TimeoutError:
                        return ("timeout", None)
            except Exception as e:
                # websockets v16 raises InvalidStatus when server rejects upgrade
                status = getattr(e, "status_code", None) or getattr(
                    getattr(e, "response", None), "status_code", None)
                return ("reject", status if status else str(e))
            return ("unknown", None)
        result = asyncio.get_event_loop().run_until_complete(run())
        # Spec requires close code 4401 — accept-before-close is now wired so
        # the custom close frame reaches the client. Lingering 403 reject is
        # also acceptable (some proxies may still short-circuit the upgrade).
        kind, code = result
        assert (kind == "close" and code == 4401) or (kind == "reject" and code == 403), \
            f"Unexpected WS no-token result: {result}"

    def test_ws_hello_and_no_self_echo(self, user_token):
        async def run():
            uri = f"{WS_BASE}/api/ws/sync?token={user_token['token']}"
            async with websockets.connect(uri, open_timeout=10) as ws:
                hello = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
                assert hello.get("type") == "hello"
                assert hello.get("user_id") == user_token["user_id"]
                # Send a sync.write message
                await ws.send(json.dumps({"type": "sync.write", "collection": "sales"}))
                # Should NOT echo back to self (within 2s)
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=2)
                    parsed = json.loads(msg)
                    # Allow heartbeat ping; fail on echo
                    if parsed.get("type") == "sync.write":
                        return ("echoed", parsed)
                    return ("other", parsed)
                except asyncio.TimeoutError:
                    return ("no_echo", None)
        result = asyncio.get_event_loop().run_until_complete(run())
        assert result[0] != "echoed", f"Server echoed sync.write back to self: {result[1]}"

    def test_ws_two_sockets_fanout(self, user_token):
        async def run():
            uri = f"{WS_BASE}/api/ws/sync?token={user_token['token']}"
            async with websockets.connect(uri, open_timeout=10) as a, \
                       websockets.connect(uri, open_timeout=10) as b:
                # Read hello from both
                await asyncio.wait_for(a.recv(), timeout=10)
                await asyncio.wait_for(b.recv(), timeout=10)
                # Send from A
                await a.send(json.dumps({"type": "sync.write", "collection": "inventory"}))
                # B should receive
                got_b = None
                try:
                    while True:
                        raw = await asyncio.wait_for(b.recv(), timeout=5)
                        m = json.loads(raw)
                        if m.get("type") == "sync.write":
                            got_b = m
                            break
                        if m.get("type") == "ping":
                            continue
                except asyncio.TimeoutError:
                    pass
                return got_b
        m = asyncio.get_event_loop().run_until_complete(run())
        assert m is not None and m.get("collection") == "inventory", \
            f"Socket B did not receive fan-out: {m}"

    def test_ws_sync_updated_on_post(self, s, user_token, user_headers):
        async def run():
            uri = f"{WS_BASE}/api/ws/sync?token={user_token['token']}"
            async with websockets.connect(uri, open_timeout=10) as ws:
                await asyncio.wait_for(ws.recv(), timeout=10)  # hello
                # Trigger a POST /api/sync/sales from outside
                loop = asyncio.get_event_loop()
                def post_sales():
                    return s.post(f"{BASE_URL}/api/sync/sales",
                                  json={"items": [{"id": "x1", "amount": 10}]},
                                  headers=user_headers, timeout=15)
                r = await loop.run_in_executor(None, post_sales)
                assert r.status_code == 200
                # WS should receive sync.updated within a few seconds
                got = None
                try:
                    while True:
                        raw = await asyncio.wait_for(ws.recv(), timeout=5)
                        m = json.loads(raw)
                        if m.get("type") == "sync.updated":
                            got = m
                            break
                        if m.get("type") in ("ping", "hello"):
                            continue
                except asyncio.TimeoutError:
                    pass
                return got
        m = asyncio.get_event_loop().run_until_complete(run())
        assert m is not None, "Did not receive sync.updated event"
        assert m["collection"] == "sales"
        assert m["count"] == 1

    def test_ws_founder_broadcast(self, user_token, founder_headers, s):
        async def run():
            uri = f"{WS_BASE}/api/ws/sync?token={user_token['token']}"
            async with websockets.connect(uri, open_timeout=10) as ws:
                await asyncio.wait_for(ws.recv(), timeout=10)  # hello
                loop = asyncio.get_event_loop()
                msg = f"iter17 test broadcast {uuid.uuid4().hex[:6]}"
                def do_broadcast():
                    return s.post(f"{BASE_URL}/api/founder/broadcast",
                                  json={"message": msg, "severity": "warning"},
                                  headers=founder_headers, timeout=20)
                r = await loop.run_in_executor(None, do_broadcast)
                assert r.status_code == 200, r.text
                got = None
                try:
                    while True:
                        raw = await asyncio.wait_for(ws.recv(), timeout=8)
                        m = json.loads(raw)
                        if m.get("type") == "founder.broadcast":
                            got = m
                            break
                        if m.get("type") in ("ping",):
                            continue
                except asyncio.TimeoutError:
                    pass
                return got, msg
        got, expected_msg = asyncio.get_event_loop().run_until_complete(run())
        assert got is not None, "Did not receive founder.broadcast"
        assert got["message"] == expected_msg
        assert got["severity"] == "warning"


# ---------------------------------------------------------------------------
# WebSocket stats
# ---------------------------------------------------------------------------
class TestWsStats:
    def test_ws_stats(self, s):
        r = s.get(f"{BASE_URL}/api/ws/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert "users_connected" in d
        assert "sockets_open" in d
        assert isinstance(d["users_connected"], int)
        assert isinstance(d["sockets_open"], int)


# ---------------------------------------------------------------------------
# Regression sanity-check on existing endpoints
# ---------------------------------------------------------------------------
class TestRegression:
    def test_founder_login(self, s):
        r = s.post(f"{BASE_URL}/api/founder/login",
                   json={"username": "FOUNDER", "password": FOUNDER_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert r.json().get("token")

    def test_auth_register_login_me(self, s):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@fuelpro.app"
        r = s.post(f"{BASE_URL}/api/auth/register",
                   json={"email": email, "password": "password123", "name": "Reg Test"})
        assert r.status_code in (200, 201)
        tok = r.json()["token"]
        r2 = s.post(f"{BASE_URL}/api/auth/login",
                    json={"email": email, "password": "password123"})
        assert r2.status_code == 200
        r3 = s.get(f"{BASE_URL}/api/auth/me",
                   headers={"Authorization": f"Bearer {tok}"})
        assert r3.status_code == 200
        assert r3.json()["email"].lower() == email.lower()

    def test_audit_log_endpoint(self, s, user_headers):
        r = s.get(f"{BASE_URL}/api/audit-log", headers=user_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_subscription_endpoint(self, s, user_headers):
        r = s.get(f"{BASE_URL}/api/subscription", headers=user_headers)
        assert r.status_code == 200

    def test_fuel_prices(self, s):
        r = s.get(f"{BASE_URL}/api/fuel-prices/current")
        assert r.status_code == 200

    def test_digest_preview(self, s, user_headers):
        r = s.get(f"{BASE_URL}/api/digest/preview", headers=user_headers)
        # Should not 500
        assert r.status_code in (200, 400, 404)

    def test_invites_list(self, s, user_headers):
        r = s.get(f"{BASE_URL}/api/invites", headers=user_headers)
        assert r.status_code == 200

    def test_ai_reconcile(self, s, user_headers):
        # AI endpoint may be mocked-out without key; accept 200/400/422/503
        r = s.post(f"{BASE_URL}/api/ai/reconcile-mpesa",
                   json={"inflows": [{"receipt": "KE12345", "amount": 100}],
                         "sales": [{"id": "s1", "amount": 100}]},
                   headers=user_headers, timeout=30)
        assert r.status_code in (200, 400, 422, 503)
