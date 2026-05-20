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


def _load_env_value(key: str) -> str:
    """Read an env var, falling back to /app/backend/.env so tests work
    whether or not they were started via supervisor."""
    val = os.environ.get(key, "")
    if val:
        return val
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip()
    return ""


def _load_bypass_token() -> str:
    return _load_env_value("AUTH_RATE_LIMIT_BYPASS_TOKEN")


_BYPASS_TOKEN = _load_bypass_token()

# Expose secrets to the rest of the test suite via env so tests can read
# them without re-implementing the .env parser. Backwards-compatible: any
# pre-existing env value wins over the .env fallback.
_FOUNDER_PASSWORD = _load_env_value("FOUNDER_PASSWORD")
if _FOUNDER_PASSWORD and not os.environ.get("FOUNDER_PASSWORD"):
    os.environ["FOUNDER_PASSWORD"] = _FOUNDER_PASSWORD


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
