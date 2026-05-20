"""Root-level pytest conftest.

Adds /app/backend to sys.path so that `from routers.foo import bar`
works regardless of whether pytest is invoked from /app or /app/backend.
This keeps test imports cwd-agnostic for CI / fork agents.
"""
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
