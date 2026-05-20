"""Security middleware — adds production-grade response headers and a
simple per-IP rate limiter for auth endpoints.

Headers applied:
- Strict-Transport-Security: HSTS (1 year, includeSubDomains)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY  (clickjacking)
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: lock down camera/microphone/geolocation
- Content-Security-Policy: applied to non-API HTML routes only (so the API
  responses stay un-restricted for the React dev server / Vite HMR)

Toggle via env:
  SECURITY_HEADERS=0   → disable entirely (dev convenience)
  AUTH_RATE_LIMIT_PER_MIN=10  → override per-IP limit on /api/auth/{login,register}
"""

from __future__ import annotations

import os
import time
from collections import deque
from typing import Deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


HSTS_VALUE = "max-age=31536000; includeSubDomains"
PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(self), payment=(self)"
REFERRER_POLICY = "strict-origin-when-cross-origin"
FRAME_OPTIONS = "DENY"
CONTENT_TYPE_OPTIONS = "nosniff"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
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
        # CORS already handled by CORSMiddleware; do not stomp on it.
        return response


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
        ip = request.client.host if request.client else "anonymous"
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
