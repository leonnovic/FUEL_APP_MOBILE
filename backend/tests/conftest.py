"""Pytest auto-fixture — adds the rate-limit bypass header to every requests.Session
created in any test, so the test suite can register/login fast without tripping the
public 20-req/min auth rate-limit.

The bypass token is set in `/app/backend/.env`; without it the header is
ignored and tests would be subject to the same rate-limit as external clients.
"""

import os
from pathlib import Path

import pytest
import requests


def _load_bypass_token() -> str:
    """Read AUTH_RATE_LIMIT_BYPASS_TOKEN — prefer process env, fall back to
    /app/backend/.env so tests work whether or not they were started via
    supervisor."""
    val = os.environ.get("AUTH_RATE_LIMIT_BYPASS_TOKEN", "")
    if val:
        return val
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("AUTH_RATE_LIMIT_BYPASS_TOKEN="):
                return line.split("=", 1)[1].strip()
    return ""


_BYPASS_TOKEN = _load_bypass_token()


@pytest.fixture(autouse=True, scope="session")
def _attach_internal_header(request):
    """Monkey-patch `requests.Session.__init__` so every new Session
    automatically carries the internal bypass header. Restored after the
    session so production code paths remain unaffected."""
    if not _BYPASS_TOKEN:
        yield
        return

    original_init = requests.Session.__init__

    def patched_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        self.headers.update({"X-Fuelpro-Internal": _BYPASS_TOKEN})

    requests.Session.__init__ = patched_init  # type: ignore[method-assign]
    try:
        yield
    finally:
        requests.Session.__init__ = original_init  # type: ignore[method-assign]
