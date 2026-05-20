"""Shared core module for FuelPro backend.

Contains config, database, security primitives, Pydantic models, and dependency
helpers used across the split router modules. Keeping these in one module avoids
circular imports between routers.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from emergentintegrations.payments.stripe.checkout import StripeCheckout
from fastapi import Depends, Header, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Configuration (env-driven)
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALG", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "720"))
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
PUBLIC_BACKEND_URL = os.environ.get("PUBLIC_BACKEND_URL", "")
APP_ENV = os.environ.get("APP_ENV", "production").lower()
IS_PRODUCTION = APP_ENV in {"production", "prod"}
MPESA_ENV = os.environ.get("MPESA_ENV", "sandbox")
MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY", "")
MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET", "")
MPESA_SHORTCODE = os.environ.get("MPESA_SHORTCODE", "174379")
MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY", "")
MPESA_CALLBACK_BASE_URL = os.environ.get("MPESA_CALLBACK_BASE_URL", "")
FOUNDER_DEFAULT_PASSWORD = os.environ.get("FOUNDER_DEFAULT_PASSWORD", "publican1D#20")
FOUNDER_EMAIL = os.environ.get("FOUNDER_EMAIL", "founder@fuelpro.app")

# Server-authoritative subscription tiers — frontend MUST NOT send prices.
PLANS: dict[str, dict[str, Any]] = {
    "free": {
        "key": "free", "name": "Free",
        "price_usd": 0.0, "price_kes": 0,
        "features": ["1 station", "30 days history", "Local-only data"],
        "max_stations": 1, "max_uploads": 5,
    },
    "starter": {
        "key": "starter", "name": "Starter",
        "price_usd": 9.0, "price_kes": 999,
        "features": ["1 station", "Cloud sync", "Unlimited uploads", "Email support"],
        "max_stations": 1, "max_uploads": -1,
    },
    "pro": {
        "key": "pro", "name": "Pro",
        "price_usd": 29.0, "price_kes": 2999,
        "features": ["5 stations", "Multi-user roles", "M-PESA reconciliation", "Priority support"],
        "max_stations": 5, "max_uploads": -1,
    },
    "enterprise": {
        "key": "enterprise", "name": "Enterprise",
        "price_usd": 99.0, "price_kes": 9999,
        "features": ["Unlimited stations", "Custom integrations", "SLA support", "Dedicated CSM"],
        "max_stations": -1, "max_uploads": -1,
    },
}

ALLOWED_ROLES = {"owner", "manager", "staff", "auditor"}
ALLOWED_COLLECTIONS = {
    "stations", "sales", "inventory", "employees", "invoices",
    "deliveries", "expenses", "suppliers", "audit", "documents",
}

# ---------------------------------------------------------------------------
# Logger, DB, security primitives
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("fuelpro")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

# Lazily-constructed Stripe client (single instance — re-creating per request
# breaks get_checkout_status because of the proxy account binding).
_stripe_singleton: Optional[StripeCheckout] = None


def _public_base(request: Request) -> str:
    if PUBLIC_BACKEND_URL:
        return PUBLIC_BACKEND_URL.rstrip("/")
    return str(request.base_url).rstrip("/")


def get_stripe(request: Request) -> StripeCheckout:
    global _stripe_singleton
    if _stripe_singleton is None:
        webhook_url = f"{_public_base(request)}/api/webhook/stripe"
        _stripe_singleton = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    return _stripe_singleton


# ---------------------------------------------------------------------------
# Pydantic models (shared)
# ---------------------------------------------------------------------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str = "owner"
    tier: str = "free"
    trial_ends_at: Optional[str] = None
    subscription_status: str = "trial"
    created_at: str


class TokenResponse(BaseModel):
    token: str
    user: UserOut


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def _hash_pw(pw: str) -> str:
    return pwd_ctx.hash(pw)


def _verify_pw(pw: str, hashed: str) -> bool:
    try:
        return pwd_ctx.verify(pw, hashed)
    except Exception:
        return False


def _make_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": user_id, "exp": exp}, JWT_SECRET, algorithm=JWT_ALG)


def _strip_oid(d: dict) -> dict:
    d.pop("_id", None)
    return d


async def _user_doc_to_out(doc: dict) -> UserOut:
    return UserOut(
        id=doc["id"],
        email=doc["email"],
        name=doc.get("name", ""),
        role=doc.get("role", "owner"),
        tier=doc.get("tier", "free"),
        trial_ends_at=doc.get("trial_ends_at"),
        subscription_status=doc.get("subscription_status", "trial"),
        created_at=doc.get("created_at", ""),
    )


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await db.users.find_one({"id": uid}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_user_optional(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Optional[dict]:
    if not creds:
        return None
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
        if not uid:
            return None
        return await db.users.find_one({"id": uid}, {"_id": 0})
    except JWTError:
        return None


def require_founder(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Founder token required")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    if payload.get("scope") != "founder":
        raise HTTPException(status_code=403, detail="Founder scope required")
    return payload


async def scoped_user_id(
    request: Request,
    auth_user: Optional[dict],
    x_user_id: Optional[str],
) -> str:
    if auth_user:
        return auth_user["id"]
    return (
        x_user_id
        or request.headers.get("x-user-id")
        or request.query_params.get("user_id")
        or "anonymous"
    )


def normalize_phone(p: str) -> str:
    p = p.strip().replace(" ", "").replace("-", "").replace("+", "")
    if p.startswith("0") and len(p) == 10:
        return "254" + p[1:]
    if p.startswith("7") and len(p) == 9:
        return "254" + p
    return p


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
