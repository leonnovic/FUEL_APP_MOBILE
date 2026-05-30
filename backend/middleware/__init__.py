"""Production middleware stack for FuelPro backend.

Middleware (applied in registration order, outermost first):
- RequestIDMiddleware   — generates X-Request-ID per request; threads via contextvars
- SecurityHeadersMiddleware — HSTS, X-Frame-Options, CSP, Permissions-Policy
- AuthRateLimitMiddleware   — sliding-window per-IP limit on auth endpoints

Toggle via env:
  SECURITY_HEADERS=0           → disable security headers (dev convenience)
  AUTH_RATE_LIMIT_PER_MIN=10   → override per-IP rate limit
"""

from __future__ import annotations

import os
import time
import uuid
from collections import deque
from contextvars import ContextVar
from typing import Deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# ---------------------------------------------------------------------------
# Context variable: request_id is set by RequestIDMiddleware and can be read
# anywhere in the call stack (routers, services, logging filters).
# ---------------------------------------------------------------------------
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


HSTS_VALUE = "max-age=31536000; includeSubDomains; preload"
PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(self), payment=(self)"
REFERRER_POLICY = "strict-origin-when-cross-origin"
FRAME_OPTIONS = "DENY"
CONTENT_TYPE_OPTIONS = "nosniff"


# ---------------------------------------------------------------------------
# Request ID middleware
# ---------------------------------------------------------------------------

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Generate a unique X-Request-ID for every request.

    - Accepts X-Request-ID from the client (Vercel edge, load balancer) if already set.
    - Otherwise generates a compact UUID4.
    - Stores the ID in a ContextVar so any router / service can read it.
    - Echoes it back on the response so clients can correlate logs.
    """

    async def dispatch(self, request: Request, call_next):
        req_id = (
            request.headers.get("x-request-id")
            or request.headers.get("x-correlation-id")
            or str(uuid.uuid4())
        )
        # Trim to 64 chars max to prevent header smuggling
        req_id = req_id[:64]
        token = request_id_ctx.set(req_id)
        try:
            response: Response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        response.headers.setdefault("X-Request-ID", req_id)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add production-grade security response headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        if os.environ.get("SECURITY_HEADERS", "1") == "0":
            return response
        h = response.headers
        h.setdefault("Strict-Transport-Security", HSTS_VALUE)
        h.setdefault("X-Content-Type-Options", CONTENT_TYPE_OPTIONS)
        h.setdefault("X-Frame-Options", FRAME_OPTIONS)
        h.setdefault("Referrer-Policy", REFERRER_POLICY)
        h.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        h.setdefault("X-XSS-Protection", "1; mode=block")
        h.setdefault("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
        # CORS already handled by CORSMiddleware; do not stomp on it.
        return response


def _is_private_ip(ip: str) -> bool:
    if not ip:
        return False
    if ip in ("127.0.0.1", "::1", "localhost", "testclient"):
        return True
    return (
        ip.startswith("10.")
        or ip.startswith("192.168.")
        or any(ip.startswith(f"172.{i}.") for i in range(16, 32))
    )


def _real_client_ip(request: Request) -> str:
    """Return the real client IP. In this Kubernetes environment the backend
    sits behind a trusted ingress that always sets X-Forwarded-For. Fall back
    to the direct socket IP for tests / local dev.
    """
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        # XFF is a comma-separated list; the leftmost is the original client.
        first = xff.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "anonymous"


def _is_cluster_internal(request: Request) -> bool:
    """A request is "cluster-internal" when every IP in the X-Forwarded-For
    chain (plus the direct socket peer) is private/loopback. External users
    come through Cloudflare → ingress, so XFF contains a public IP and we
    enforce the rate-limit normally.
    """
    socket_ip = request.client.host if request.client else ""
    xff = request.headers.get("x-forwarded-for", "")
    chain = [ip.strip() for ip in xff.split(",") if ip.strip()]
    if socket_ip:
        chain.append(socket_ip)
    if not chain:
        return True  # No identifiable client — most likely local
    return all(_is_private_ip(ip) for ip in chain)


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window per-IP rate limit on /api/auth/login and /api/auth/register.

    Default: 20 requests / minute per IP (well above legitimate human usage,
    designed to blunt credential-stuffing bots). The password-reset endpoint
    has its own dedicated 10/h limit in auth.py.
    """

    PROTECTED = ("/api/auth/login", "/api/auth/register")
    WINDOW_SECONDS = 60

    def __init__(self, app) -> None:
        super().__init__(app)
        # ip → deque[ts]
        self._buckets: dict[str, Deque[float]] = {}
        try:
            self._limit = int(os.environ.get("AUTH_RATE_LIMIT_PER_MIN", "20"))
        except ValueError:
            self._limit = 20

    async def dispatch(self, request: Request, call_next):
        if request.url.path not in self.PROTECTED:
            return await call_next(request)
        # Skip cluster-internal traffic (loopback, TestClient, pod-to-pod over
        # private addresses). External clients always come through the ingress
        # with a public IP in X-Forwarded-For.
        if _is_cluster_internal(request):
            return await call_next(request)
        # Trusted bypass header for internal test/CI traffic. Production
        # clients never know this token, so the protection is intact.
        bypass = os.environ.get("AUTH_RATE_LIMIT_BYPASS_TOKEN")
        if bypass and request.headers.get("x-fuelpro-internal") == bypass:
            return await call_next(request)
        ip = _real_client_ip(request)
        now = time.time()
        bucket = self._buckets.setdefault(ip, deque())
        # Drop entries outside the window
        cutoff = now - self.WINDOW_SECONDS
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= self._limit:
            return JSONResponse(
                {"detail": "Too many requests. Slow down and try again in a moment."},
                status_code=429,
            )
        bucket.append(now)
        return await call_next(request)
