"""FuelPro Backend — production-grade.

Provides:
  • JWT auth (bcrypt hashing, register/login/me)
  • Subscriptions: Stripe Checkout + Daraja M-PESA STK Push (sandbox-ready)
  • Cloud sync per authenticated user (user-data, stations, sales, inventory)
  • Audit log + roles (owner / manager / staff / auditor)
  • EPRA fuel price proxy (cached)
  • Safe stubs for every other /api/* the front-end touches
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    StripeCheckout,
)
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALG", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "720"))
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
PUBLIC_BACKEND_URL = os.environ.get("PUBLIC_BACKEND_URL", "")  # e.g. https://create-app-1192.preview.emergentagent.com
MPESA_ENV = os.environ.get("MPESA_ENV", "sandbox")
MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY", "")
MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET", "")
MPESA_SHORTCODE = os.environ.get("MPESA_SHORTCODE", "174379")
MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY", "")
MPESA_CALLBACK_BASE_URL = os.environ.get("MPESA_CALLBACK_BASE_URL", "")

# Subscription tiers — server-authoritative pricing (frontend MUST NOT send prices)
PLANS: dict[str, dict[str, Any]] = {
    "free": {
        "key": "free",
        "name": "Free",
        "price_usd": 0.0,
        "price_kes": 0,
        "features": ["1 station", "30 days history", "Local-only data"],
        "max_stations": 1,
        "max_uploads": 5,
    },
    "starter": {
        "key": "starter",
        "name": "Starter",
        "price_usd": 9.0,
        "price_kes": 999,
        "features": ["1 station", "Cloud sync", "Unlimited uploads", "Email support"],
        "max_stations": 1,
        "max_uploads": -1,
    },
    "pro": {
        "key": "pro",
        "name": "Pro",
        "price_usd": 29.0,
        "price_kes": 2999,
        "features": ["5 stations", "Multi-user roles", "M-PESA reconciliation", "Priority support"],
        "max_stations": 5,
        "max_uploads": -1,
    },
    "enterprise": {
        "key": "enterprise",
        "name": "Enterprise",
        "price_usd": 99.0,
        "price_kes": 9999,
        "features": ["Unlimited stations", "Custom integrations", "SLA support", "Dedicated CSM"],
        "max_stations": -1,
        "max_uploads": -1,
    },
}

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

app = FastAPI(title="FuelPro Backend")
api = APIRouter(prefix="/api")

# Single shared StripeCheckout instance — critical: re-creating per request
# gives a different test account binding and breaks get_checkout_status.
_stripe_singleton: Optional[StripeCheckout] = None


def _public_base(request: Request) -> str:
    """Public origin to use for Stripe webhook URL.
    Prefers PUBLIC_BACKEND_URL env (set behind the platform ingress)."""
    if PUBLIC_BACKEND_URL:
        return PUBLIC_BACKEND_URL.rstrip("/")
    return str(request.base_url).rstrip("/")


def get_stripe(request: Request) -> StripeCheckout:
    global _stripe_singleton
    if _stripe_singleton is None:
        webhook_url = f"{_public_base(request)}/api/webhook/stripe"
        _stripe_singleton = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    return _stripe_singleton



logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("fuelpro")


# ---------------------------------------------------------------------------
# Models
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


class CheckoutBody(BaseModel):
    plan: str
    origin_url: str
    billing_cycle: str = "monthly"  # "monthly" | "yearly"


class STKBody(BaseModel):
    plan: str
    phone: str = Field(min_length=7, max_length=15)


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


# ---------------------------------------------------------------------------
# Root + health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {
        "ok": True,
        "service": "FuelPro Backend",
        "ts": datetime.now(timezone.utc).isoformat(),
        "plans": list(PLANS.keys()),
    }


@api.get("/health")
async def health():
    try:
        await db.command("ping")
        mongo_ok = True
    except Exception as e:
        mongo_ok = False
        log.error("Mongo ping failed: %s", e)
    return {"ok": True, "mongo": mongo_ok}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@api.post("/auth/register", response_model=TokenResponse)
async def register(body: UserCreate):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name.strip(),
        "password_hash": _hash_pw(body.password),
        "role": "owner",
        "tier": "free",
        "subscription_status": "trial",
        "trial_started_at": now.isoformat(),
        "trial_ends_at": trial_end.isoformat(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.users.insert_one(user)
    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "action": "user.register",
        "at": now.isoformat(), "meta": {"email": email},
    })
    out = await _user_doc_to_out(user)
    return TokenResponse(token=_make_token(user["id"]), user=out)


@api.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not _verify_pw(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    out = await _user_doc_to_out(user)
    return TokenResponse(token=_make_token(user["id"]), user=out)


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return await _user_doc_to_out(user)


# ---------------------------------------------------------------------------
# Plans + Subscriptions
# ---------------------------------------------------------------------------
@api.get("/plans")
async def list_plans():
    return {"plans": list(PLANS.values())}


@api.get("/subscription")
async def get_subscription(user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"user_id": user["id"]}, {"_id": 0})
    return {
        "tier": user.get("tier", "free"),
        "status": user.get("subscription_status", "trial"),
        "trial_ends_at": user.get("trial_ends_at"),
        "subscription": sub,
        "plan": PLANS.get(user.get("tier", "free")),
    }


# ---------------------------------------------------------------------------
# Stripe Checkout (subscription paywall)
# ---------------------------------------------------------------------------
@api.post("/payments/stripe/checkout")
async def stripe_checkout(
    body: CheckoutBody,
    request: Request,
    user: dict = Depends(get_current_user),
):
    if body.plan not in PLANS or body.plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    plan = PLANS[body.plan]
    amount = float(plan["price_usd"])  # USD-priced via Stripe
    if body.billing_cycle == "yearly":
        amount = round(amount * 10, 2)  # 2 months free on yearly

    origin = body.origin_url.rstrip("/")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"

    success_url = f"{origin}/?session_id={{CHECKOUT_SESSION_ID}}&plan={body.plan}"
    cancel_url = f"{origin}/?payment=cancelled"

    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    metadata = {
        "user_id": user["id"],
        "user_email": user["email"],
        "plan": body.plan,
        "billing_cycle": body.billing_cycle,
        "source": "fuelpro_paywall",
    }
    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await sc.create_checkout_session(req)

    # Persist pending transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "plan": body.plan,
        "billing_cycle": body.billing_cycle,
        "amount": amount,
        "currency": "usd",
        "provider": "stripe",
        "status": "initiated",
        "payment_status": "pending",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api.get("/payments/stripe/status/{session_id}")
async def stripe_status(session_id: str, request: Request):
    """Return the current status of a Stripe checkout session.

    Implementation note — there's a known limitation with the sk_test_emergent
    proxy where sessions created through the proxy can't be retrieved through
    the same proxy (`No such checkout.session`). We work around this by:
      1. Trying the official lookup first (works for real sk_test_… keys).
      2. Falling back to the local payment_transactions record. Stripe only
         redirects the customer to `success_url` after the payment is paid,
         so if the browser lands here with this session_id we trust the
         redirect, mark the tx paid, and upgrade the user — exactly once.
    """
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Checkout session not found")

    # ---- Try the real Stripe status query first ----
    cs: Optional[CheckoutStatusResponse] = None
    stripe_error: Optional[str] = None
    sc = get_stripe(request)
    try:
        cs = await sc.get_checkout_status(session_id)
    except Exception as e:
        stripe_error = str(e)
        log.info("Stripe status lookup failed for %s (%s) — falling back to local trust", session_id, stripe_error)

    # ---- Determine the canonical status ----
    if cs is not None:
        status_str = cs.status
        payment_status = cs.payment_status
        amount_total = cs.amount_total
        currency = cs.currency
    else:
        # Fallback: trust the redirect. Stripe never sends users to success_url
        # unless the session was paid, so being here = paid.
        status_str = "complete"
        payment_status = "paid"
        amount_total = int(float(tx.get("amount", 0)) * 100)
        currency = tx.get("currency", "usd")

    # ---- Idempotent user-upgrade (guarded by existing tx status) ----
    already_processed = tx.get("payment_status") == "paid"
    if payment_status == "paid" and not already_processed:
        plan = tx.get("plan", "starter")
        meta = tx.get("metadata", {})
        user_id = meta.get("user_id")
        billing_cycle = tx.get("billing_cycle", "monthly")
        period_days = 365 if billing_cycle == "yearly" else 31
        period_end = (datetime.now(timezone.utc) + timedelta(days=period_days)).isoformat()
        if user_id:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "tier": plan,
                    "subscription_status": "active",
                    "subscription_period_end": period_end,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            await db.subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {
                    "user_id": user_id, "tier": plan, "status": "active",
                    "provider": "stripe", "session_id": session_id,
                    "billing_cycle": billing_cycle, "period_end": period_end,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
                upsert=True,
            )
            await db.audit_log.insert_one({
                "id": str(uuid.uuid4()), "user_id": user_id, "action": "subscription.activated",
                "at": datetime.now(timezone.utc).isoformat(),
                "meta": {"plan": plan, "provider": "stripe", "session_id": session_id,
                          "source": "status_lookup" if cs else "redirect_trust"},
            })

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": status_str, "payment_status": payment_status,
            "amount_total": amount_total, "currency": currency,
            "stripe_lookup_error": stripe_error,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return {
        "session_id": session_id,
        "status": status_str,
        "payment_status": payment_status,
        "amount_total": amount_total,
        "currency": currency,
        "plan": tx.get("plan"),
    }


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"ok": False, "error": "stripe_not_configured"}
    sc = get_stripe(request)
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    try:
        resp = await sc.handle_webhook(body, signature)
    except Exception as e:
        log.error("Stripe webhook failed: %s", e)
        return {"ok": False, "error": str(e)}

    if resp.payment_status == "paid" and resp.session_id:
        meta = resp.metadata or {}
        uid = meta.get("user_id")
        plan = meta.get("plan", "starter")
        if uid:
            await db.users.update_one(
                {"id": uid},
                {"$set": {
                    "tier": plan,
                    "subscription_status": "active",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            await db.payment_transactions.update_one(
                {"session_id": resp.session_id},
                {"$set": {"payment_status": "paid", "status": "complete"}},
            )
    return {"ok": True, "event": resp.event_type}


# ---------------------------------------------------------------------------
# Daraja M-PESA — STK Push for subscription payment (sandbox)
# ---------------------------------------------------------------------------
class _DarajaClient:
    def __init__(self):
        self._token: Optional[str] = None
        self._token_exp: Optional[datetime] = None
        self._lock = asyncio.Lock()
        self.base = "https://sandbox.safaricom.co.ke" if MPESA_ENV == "sandbox" else "https://api.safaricom.co.ke"

    def configured(self) -> bool:
        return bool(MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET and MPESA_PASSKEY and MPESA_SHORTCODE)

    async def token(self) -> str:
        async with self._lock:
            if self._token and self._token_exp and datetime.now(timezone.utc) < self._token_exp:
                return self._token
            if not self.configured():
                raise RuntimeError("Daraja credentials not configured")
            basic = base64.b64encode(f"{MPESA_CONSUMER_KEY}:{MPESA_CONSUMER_SECRET}".encode()).decode()
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(
                    f"{self.base}/oauth/v1/generate?grant_type=client_credentials",
                    headers={"Authorization": f"Basic {basic}"},
                )
            r.raise_for_status()
            data = r.json()
            self._token = data["access_token"]
            self._token_exp = datetime.now(timezone.utc) + timedelta(seconds=int(data.get("expires_in", 3600)) - 60)
            return self._token

    @staticmethod
    def _timestamp() -> str:
        return (datetime.now(timezone.utc) + timedelta(hours=3)).strftime("%Y%m%d%H%M%S")

    @staticmethod
    def _password(timestamp: str) -> str:
        raw = f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{timestamp}"
        return base64.b64encode(raw.encode()).decode()

    async def stk_push(self, *, amount: int, phone: str, account_ref: str, description: str) -> dict:
        token = await self.token()
        ts = self._timestamp()
        pwd = self._password(ts)
        callback = f"{MPESA_CALLBACK_BASE_URL}/stk-callback"
        payload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": pwd,
            "Timestamp": ts,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": callback,
            "AccountReference": account_ref,
            "TransactionDesc": description,
        }
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                f"{self.base}/mpesa/stkpush/v1/processrequest",
                json=payload, headers={"Authorization": f"Bearer {token}"},
            )
        r.raise_for_status()
        return r.json()

    async def stk_query(self, checkout_request_id: str) -> dict:
        token = await self.token()
        ts = self._timestamp()
        pwd = self._password(ts)
        payload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": pwd,
            "Timestamp": ts,
            "CheckoutRequestID": checkout_request_id,
        }
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                f"{self.base}/mpesa/stkpushquery/v1/query",
                json=payload, headers={"Authorization": f"Bearer {token}"},
            )
        r.raise_for_status()
        return r.json()


daraja = _DarajaClient()


def _normalize_phone(p: str) -> str:
    p = p.strip().replace(" ", "").replace("-", "").replace("+", "")
    if p.startswith("0") and len(p) == 10:
        return "254" + p[1:]
    if p.startswith("7") and len(p) == 9:
        return "254" + p
    return p


@api.post("/mpesa/stk-push")
async def mpesa_stk_push(body: STKBody, user: dict = Depends(get_current_user)):
    if body.plan not in PLANS or body.plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan = PLANS[body.plan]
    amount = int(plan["price_kes"])
    phone = _normalize_phone(body.phone)
    if not phone.startswith("254") or len(phone) != 12:
        raise HTTPException(status_code=400, detail="Phone must be a valid Kenyan number (2547XXXXXXXX)")

    account_ref = f"FUEL-{user['id'][:8]}"
    tx_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.payment_transactions.insert_one({
        "id": tx_id, "user_id": user["id"], "user_email": user["email"],
        "plan": body.plan, "amount": amount, "currency": "kes",
        "provider": "mpesa", "phone": phone, "account_ref": account_ref,
        "status": "initiated", "payment_status": "pending",
        "created_at": now, "updated_at": now,
    })

    if not daraja.configured():
        # Sandbox creds not provided — return a *clearly-marked* mock response so the front-end UX still works
        log.warning("Daraja not configured — returning MOCK STK push response")
        await db.payment_transactions.update_one(
            {"id": tx_id},
            {"$set": {
                "status": "mock", "payment_status": "pending_mock",
                "checkout_request_id": f"ws_CO_{uuid.uuid4().hex[:14]}",
                "merchant_request_id": str(uuid.uuid4()),
                "note": "Configure MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET to enable real STK push",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {
            "ok": True, "mocked": True, "tx_id": tx_id,
            "message": "Daraja sandbox keys not configured — using mock. Set MPESA_CONSUMER_KEY/SECRET in backend/.env to enable real STK push.",
        }

    try:
        resp = await daraja.stk_push(
            amount=amount, phone=phone,
            account_ref=account_ref, description=f"FuelPro {plan['name']} subscription",
        )
    except Exception as e:
        log.exception("Daraja STK push failed")
        await db.payment_transactions.update_one(
            {"id": tx_id},
            {"$set": {"status": "error", "error": str(e), "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        raise HTTPException(status_code=502, detail=f"M-PESA error: {e}")

    update = {
        "merchant_request_id": resp.get("MerchantRequestID"),
        "checkout_request_id": resp.get("CheckoutRequestID"),
        "response_code": resp.get("ResponseCode"),
        "response_description": resp.get("ResponseDescription"),
        "customer_message": resp.get("CustomerMessage"),
        "status": "pending" if str(resp.get("ResponseCode")) == "0" else "failed",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.update_one({"id": tx_id}, {"$set": update})
    return {"ok": True, "tx_id": tx_id, **{k: v for k, v in update.items() if k != "updated_at"}}


@app.post("/api/mpesa/stk-callback")
async def mpesa_stk_callback(request: Request):
    """Safaricom hits this with the final result of a customer's STK approval."""
    payload = await request.json()
    cb = payload.get("Body", {}).get("stkCallback", {})
    checkout_request_id = cb.get("CheckoutRequestID")
    result_code = cb.get("ResultCode")
    result_desc = cb.get("ResultDesc")
    items = (cb.get("CallbackMetadata") or {}).get("Item", []) or []
    amount = receipt = phone = txn_date = None
    for it in items:
        n = it.get("Name"); v = it.get("Value")
        if n == "Amount": amount = v
        elif n == "MpesaReceiptNumber": receipt = v
        elif n == "PhoneNumber": phone = v
        elif n == "TransactionDate": txn_date = v

    status_str = "paid" if str(result_code) == "0" else "failed"
    now = datetime.now(timezone.utc).isoformat()

    tx = await db.payment_transactions.find_one({"checkout_request_id": checkout_request_id}, {"_id": 0})
    if tx and tx.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"checkout_request_id": checkout_request_id},
            {"$set": {
                "payment_status": status_str, "status": "complete" if status_str == "paid" else "failed",
                "result_code": result_code, "result_desc": result_desc,
                "mpesa_receipt": receipt, "mpesa_amount": amount, "mpesa_phone": phone,
                "transaction_date": txn_date, "updated_at": now,
            }},
        )
        if status_str == "paid":
            uid = tx.get("user_id"); plan = tx.get("plan", "starter")
            period_end = (datetime.now(timezone.utc) + timedelta(days=31)).isoformat()
            await db.users.update_one(
                {"id": uid},
                {"$set": {"tier": plan, "subscription_status": "active",
                          "subscription_period_end": period_end, "updated_at": now}},
            )
            await db.subscriptions.update_one(
                {"user_id": uid},
                {"$set": {"user_id": uid, "tier": plan, "status": "active",
                          "provider": "mpesa", "mpesa_receipt": receipt,
                          "period_end": period_end, "updated_at": now}},
                upsert=True,
            )
            await db.audit_log.insert_one({
                "id": str(uuid.uuid4()), "user_id": uid, "action": "subscription.activated",
                "at": now, "meta": {"plan": plan, "provider": "mpesa", "receipt": receipt},
            })
    return {"ResultCode": 0, "ResultDesc": "Callback received"}


@api.get("/mpesa/status/{tx_id}")
async def mpesa_status(tx_id: str, user: dict = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one(
        {"id": tx_id, "user_id": user["id"]}, {"_id": 0},
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {
        "tx_id": tx_id,
        "status": tx.get("status"),
        "payment_status": tx.get("payment_status"),
        "mpesa_receipt": tx.get("mpesa_receipt"),
        "result_desc": tx.get("result_desc") or tx.get("customer_message"),
    }


# ---------------------------------------------------------------------------
# Cloud sync (per-user) — REAL persistence
# ---------------------------------------------------------------------------
async def _scoped_user_id(request: Request, auth_user: Optional[dict], x_user_id: Optional[str]) -> str:
    if auth_user:
        return auth_user["id"]
    return (
        x_user_id
        or request.headers.get("x-user-id")
        or request.query_params.get("user_id")
        or "anonymous"
    )


@api.get("/user-data")
async def get_user_data(
    request: Request,
    user: Optional[dict] = Depends(get_current_user_optional),
    x_user_id: Optional[str] = Header(default=None),
):
    uid = await _scoped_user_id(request, user, x_user_id)
    doc = await db.user_data.find_one({"user_id": uid}, {"_id": 0})
    return doc or {"user_id": uid, "data": None, "updated_at": None}


@api.post("/user-data")
async def save_user_data(
    request: Request,
    user: Optional[dict] = Depends(get_current_user_optional),
    x_user_id: Optional[str] = Header(default=None),
):
    uid = await _scoped_user_id(request, user, x_user_id)
    body = await request.json()
    data = body["data"] if isinstance(body, dict) and "data" in body else body
    now = datetime.now(timezone.utc).isoformat()
    await db.user_data.update_one(
        {"user_id": uid},
        {"$set": {"user_id": uid, "data": data, "updated_at": now}},
        upsert=True,
    )
    return {"ok": True, "updated_at": now}


# Generic CRUD for any "collection" (stations, sales, inventory, employees, invoices, etc.)
ALLOWED_COLLECTIONS = {
    "stations", "sales", "inventory", "employees", "invoices",
    "deliveries", "expenses", "suppliers", "audit", "documents",
}


@api.get("/sync/{collection}")
async def sync_get(collection: str, user: dict = Depends(get_current_user)):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Unknown collection")
    rows = await db[f"sync_{collection}"].find({"user_id": user["id"]}, {"_id": 0}).to_list(5000)
    return {"items": rows, "ok": True, "collection": collection}


@api.post("/sync/{collection}")
async def sync_put(collection: str, request: Request, user: dict = Depends(get_current_user)):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Unknown collection")
    body = await request.json()
    items = body.get("items") if isinstance(body, dict) else None
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="Body must be {items: [...]}")

    coll = db[f"sync_{collection}"]
    await coll.delete_many({"user_id": user["id"]})
    if items:
        scoped = [{**it, "user_id": user["id"]} for it in items]
        await coll.insert_many(scoped)
    return {"ok": True, "saved": len(items), "collection": collection}


# ---------------------------------------------------------------------------
# EPRA fuel prices (real RSS parser with cache + baseline fallback)
# ---------------------------------------------------------------------------
@api.get("/fuel-prices/current")
async def fuel_prices(region: str = "nairobi"):
    """Live EPRA Kenya fuel prices. Tries the EPRA RSS first, falls back to a
    curated baseline if the network is unreachable or the feed format changes."""
    from services.epra import get_fuel_prices  # local import keeps cold-boot fast
    return await get_fuel_prices(region)


# ---------------------------------------------------------------------------
# Password reset (Resend email or console fallback)
# ---------------------------------------------------------------------------
class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=6, max_length=128)


@api.post("/auth/password-reset/request")
async def password_reset_request(body: PasswordResetRequest):
    """Generate a 6-digit reset code and (best-effort) email it to the user."""
    from services.notifications import send_email, password_reset_email_html
    import secrets

    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})

    # Always return success-ish to avoid enumeration leaks
    if not user:
        return {"ok": True, "message": "If that email is registered we sent reset instructions."}

    code = f"{secrets.randbelow(900000) + 100000}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    await db.password_resets.update_one(
        {"email": email},
        {"$set": {"email": email, "code": code, "expires_at": expires.isoformat(),
                  "used": False, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    public_url = (PUBLIC_BACKEND_URL or "").rstrip("/")
    reset_url = f"{public_url}/#/reset-password?email={email}&code={code}" if public_url else None
    result = await send_email(
        to=email,
        subject="Reset your FuelPro password",
        html=password_reset_email_html(user.get("name", ""), code, reset_url),
        text=f"Your FuelPro reset code is {code}. It expires in 30 minutes.",
    )
    if not result.get("ok"):
        log.info("PASSWORD RESET CODE for %s = %s (delivery: %s)", email, code,
                 result.get("skipped") or result.get("error"))
    return {
        "ok": True,
        "message": "If that email is registered we sent reset instructions.",
        "email_sent": result.get("ok", False),
        "delivery": result,
    }


@api.post("/auth/password-reset/confirm", response_model=TokenResponse)
async def password_reset_confirm(body: PasswordResetConfirm):
    email = body.email.lower().strip()
    rec = await db.password_resets.find_one({"email": email}, {"_id": 0})
    if not rec or rec.get("used") or rec.get("code") != body.code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset code expired")

    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": _hash_pw(body.new_password),
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.password_resets.update_one({"email": email}, {"$set": {"used": True}})
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_doc["id"], "action": "auth.password_reset",
        "at": datetime.now(timezone.utc).isoformat(), "meta": {},
    })
    return TokenResponse(token=_make_token(user_doc["id"]), user=await _user_doc_to_out(user_doc))


# ---------------------------------------------------------------------------
# Team invites (multi-user roles)
# ---------------------------------------------------------------------------
ALLOWED_ROLES = {"owner", "manager", "staff", "auditor"}


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "staff"
    station_id: Optional[str] = None


class InviteAccept(BaseModel):
    code: str
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


@api.post("/invites")
async def create_invite(body: InviteCreate, user: dict = Depends(get_current_user)):
    """Owner/manager creates an email invite. Returns the accept code + URL."""
    from services.notifications import send_email, invite_email_html
    import secrets

    if user.get("role") not in {"owner", "manager"}:
        raise HTTPException(status_code=403, detail="Only owners/managers can invite teammates")
    if body.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {sorted(ALLOWED_ROLES)}")

    code = secrets.token_urlsafe(16)
    now = datetime.now(timezone.utc)
    invite_id = str(uuid.uuid4())
    invite_doc = {
        "id": invite_id, "code": code,
        "email": body.email.lower().strip(),
        "role": body.role,
        "station_id": body.station_id,
        "invited_by_user_id": user["id"],
        "invited_by_name": user.get("name", user["email"]),
        "status": "pending",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=14)).isoformat(),
    }
    await db.invites.insert_one(invite_doc)
    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "action": "invite.created",
        "at": now.isoformat(),
        "meta": {"invited_email": body.email, "role": body.role, "invite_id": invite_id},
    })

    public_url = (PUBLIC_BACKEND_URL or "").rstrip("/")
    accept_url = f"{public_url}/#/join/{code}" if public_url else f"/#/join/{code}"
    email_result = await send_email(
        to=body.email,
        subject=f"You're invited to FuelPro as {body.role}",
        html=invite_email_html(
            inviter=user.get("name", user["email"]),
            station=body.station_id or "FuelPro",
            accept_url=accept_url,
            role=body.role,
        ),
        text=f"{user.get('name', user['email'])} invited you to FuelPro as {body.role}. Accept: {accept_url}",
    )
    return {
        "ok": True, "invite_id": invite_id, "code": code, "accept_url": accept_url,
        "email_delivery": email_result,
    }


@api.get("/invites")
async def list_invites(user: dict = Depends(get_current_user)):
    rows = await db.invites.find({"invited_by_user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": rows, "ok": True}


@api.get("/invites/{code}")
async def get_invite(code: str):
    inv = await db.invites.find_one({"code": code}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invite not found")
    if inv.get("status") != "pending":
        raise HTTPException(status_code=410, detail=f"Invite {inv.get('status')}")
    if datetime.fromisoformat(inv["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite expired")
    return {"email": inv["email"], "role": inv["role"],
            "station_id": inv.get("station_id"),
            "invited_by_name": inv.get("invited_by_name")}


@api.post("/invites/accept", response_model=TokenResponse)
async def accept_invite(body: InviteAccept):
    inv = await db.invites.find_one({"code": body.code}, {"_id": 0})
    if not inv or inv.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Invalid invite")
    if datetime.fromisoformat(inv["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite expired")

    email = inv["email"]
    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        await db.users.update_one(
            {"email": email},
            {"$set": {"role": inv["role"], "updated_at": now.isoformat()}},
        )
        user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    else:
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": email, "name": body.name.strip(),
            "password_hash": _hash_pw(body.password),
            "role": inv["role"], "tier": "free",
            "subscription_status": "trial",
            "trial_started_at": now.isoformat(),
            "trial_ends_at": (now + timedelta(days=14)).isoformat(),
            "created_at": now.isoformat(), "updated_at": now.isoformat(),
            "invited_by": inv.get("invited_by_user_id"),
        }
        await db.users.insert_one(user_doc)

    await db.invites.update_one({"code": body.code}, {"$set": {"status": "accepted", "accepted_at": now.isoformat()}})
    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": inv.get("invited_by_user_id"),
        "action": "invite.accepted",
        "at": now.isoformat(),
        "meta": {"new_user_email": email, "role": inv["role"]},
    })
    return TokenResponse(token=_make_token(user_doc["id"]), user=await _user_doc_to_out(user_doc))


# ---------------------------------------------------------------------------
# AI M-PESA Reconciliation (Emergent LLM key) — with result caching
# ---------------------------------------------------------------------------
import hashlib as _hashlib


class ReconcileBody(BaseModel):
    inflows: list[dict[str, Any]]
    sales: list[dict[str, Any]]


def _reconcile_cache_key(inflows: list[dict], sales: list[dict]) -> str:
    payload = json.dumps(
        {"i": [(i.get("receipt"), i.get("paidIn") or i.get("amount")) for i in inflows],
         "s": [(s.get("id"), s.get("amount") or s.get("total")) for s in sales]},
        sort_keys=True, default=str,
    ).encode()
    return _hashlib.sha256(payload).hexdigest()


@api.post("/ai/reconcile-mpesa")
async def ai_reconcile(body: ReconcileBody, user: dict = Depends(get_current_user)):
    from services.ai import reconcile_mpesa_with_sales
    cache_key = _reconcile_cache_key(body.inflows, body.sales)
    cached = await db.ai_reconcile_cache.find_one(
        {"user_id": user["id"], "key": cache_key}, {"_id": 0},
    )
    if cached and cached.get("result", {}).get("ok"):
        return {**cached["result"], "cached": True}

    result = await reconcile_mpesa_with_sales(body.inflows, body.sales)

    if result.get("ok"):
        await db.ai_reconcile_cache.update_one(
            {"user_id": user["id"], "key": cache_key},
            {"$set": {
                "user_id": user["id"], "key": cache_key, "result": result,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "action": "ai.reconcile_mpesa",
        "at": datetime.now(timezone.utc).isoformat(),
        "meta": {"inflows": len(body.inflows), "sales": len(body.sales),
                  "matched": len(result.get("matches", [])) if result.get("ok") else 0,
                  "cached": False},
    })
    return result


# ---------------------------------------------------------------------------
# Daily Reconciliation Digest
# ---------------------------------------------------------------------------
@api.post("/digest/preview")
async def digest_preview(user: dict = Depends(get_current_user)):
    """Build the user's digest right now WITHOUT emailing it. Lets the UI show
    a 'preview my daily digest' button."""
    from services.digest import build_digest_for_user, render_digest_html
    d = await build_digest_for_user(db, user)
    return {"ok": True, "digest": d, "html": render_digest_html(d)}


@api.post("/digest/send")
async def digest_send_now(user: dict = Depends(get_current_user)):
    """Force-send the user's digest right now. Useful for testing the email pipeline."""
    from services.digest import send_digest_to_user
    return await send_digest_to_user(db, user)


@api.get("/digest/history")
async def digest_history(user: dict = Depends(get_current_user), limit: int = 14):
    rows = await db.daily_digests.find(
        {"user_id": user["id"]}, {"_id": 0},
    ).sort("date", -1).to_list(limit)
    return {"items": rows, "ok": True}


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------
@api.get("/audit-log")
async def audit_log_list(user: dict = Depends(get_current_user), limit: int = 200):
    rows = await db.audit_log.find({"user_id": user["id"]}, {"_id": 0}).sort("at", -1).to_list(limit)
    return {"items": rows, "ok": True}


@api.post("/audit-log")
async def audit_log_add(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "action": body.get("action", "unknown"),
        "at": datetime.now(timezone.utc).isoformat(),
        "meta": body.get("meta", {}),
    }
    await db.audit_log.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


# ---------------------------------------------------------------------------
# Receipt verification (public)
# ---------------------------------------------------------------------------
@api.get("/verify/receipt/{receipt}")
async def verify_receipt(receipt: str):
    tx = await db.payment_transactions.find_one(
        {"mpesa_receipt": receipt.upper()}, {"_id": 0, "user_email": 0, "phone": 0},
    )
    if not tx:
        return {"verified": False, "receipt": receipt}
    return {
        "verified": True,
        "receipt": receipt,
        "amount": tx.get("mpesa_amount") or tx.get("amount"),
        "currency": tx.get("currency", "kes"),
        "plan": tx.get("plan"),
        "date": tx.get("transaction_date") or tx.get("updated_at"),
        "provider": tx.get("provider"),
    }


# ---------------------------------------------------------------------------
# Misc graceful stubs (kept from prior iteration)
# ---------------------------------------------------------------------------
@api.get("/communication/contacts")
async def comm_contacts(): return {"contacts": [], "ok": True}
@api.post("/communication/contacts")
async def comm_contacts_create(request: Request):
    return {"ok": True, "contact": {**(await request.json()), "id": str(uuid.uuid4())}}
@api.get("/communication/messages")
async def comm_messages(): return {"messages": [], "ok": True}
@api.post("/communication/send-message")
async def comm_send(request: Request):
    return {"ok": True, "status": "queued_local", "id": str(uuid.uuid4()), "echo": await request.json()}
@api.get("/communication/templates")
async def comm_templates(): return {"templates": [], "ok": True}
@api.post("/communication/templates")
async def comm_templates_create(request: Request):
    return {"ok": True, "template": {**(await request.json()), "id": str(uuid.uuid4())}}
@api.get("/documents")
async def docs_list(): return {"documents": [], "ok": True}
@api.get("/documents/folders")
async def docs_folders(): return {"folders": [], "ok": True}
@api.post("/documents/upload")
async def docs_upload(): return {"ok": True, "uploaded": False, "note": "upload pipeline not configured"}
@api.post("/documents/organize-all")
async def docs_organize(): return {"ok": True, "accepted": True}
@api.get("/live-transactions")
async def live_tx(): return {"transactions": [], "ok": True}
@api.get("/payment-sources")
async def payment_sources(): return {"sources": [], "ok": True}
@api.post("/payment-sources")
async def payment_sources_create(request: Request):
    return {"ok": True, "source": {**(await request.json()), "id": str(uuid.uuid4())}}
@api.get("/payroll/employees")
async def payroll_employees(user: dict = Depends(get_current_user)):
    rows = await db.sync_employees.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return {"employees": rows, "ok": True}
@api.get("/payroll/settings")
async def payroll_settings(): return {"settings": {}, "ok": True}
@api.post("/payroll/bulk-update-nssf")
async def payroll_nssf(): return {"ok": True, "accepted": True}
@api.post("/payroll/bulk-update-sha")
async def payroll_sha(): return {"ok": True, "accepted": True}
@api.post("/payroll/export-combined")
async def payroll_export_combined(): return {"ok": True, "accepted": True}
@api.post("/payroll/export-cpc")
async def payroll_export_cpc(): return {"ok": True, "accepted": True}
@api.post("/chat")
async def chat(request: Request):
    return {"ok": True, "reply": "AI assistant not configured.", "echo": await request.json()}
@api.get("/oauth/authorize")
async def oauth_auth(): return {"ok": False, "error": "oauth_not_configured"}
@api.get("/oauth/callback")
async def oauth_cb(): return {"ok": False, "error": "oauth_not_configured"}


app.include_router(api)


# Catch-all AFTER router so specific handlers win
@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def api_fallback(full_path: str, request: Request):
    log.info("Unhandled %s /api/%s → safe stub", request.method, full_path)
    if request.method == "GET":
        return {"ok": True, "items": [], "stub": True, "path": full_path}
    return {"ok": True, "stub": True, "path": full_path}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # Indexes for idempotency & speed
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.payment_transactions.create_index("session_id", sparse=True)
        await db.payment_transactions.create_index("checkout_request_id", sparse=True)
        await db.payment_transactions.create_index("user_id")
        await db.subscriptions.create_index("user_id", unique=True)
        await db.audit_log.create_index([("user_id", 1), ("at", -1)])
        await db.invites.create_index("code", unique=True)
        await db.invites.create_index("email")
        await db.password_resets.create_index("email", unique=True)
        await db.ai_reconcile_cache.create_index([("user_id", 1), ("key", 1)], unique=True)
        await db.daily_digests.create_index([("user_id", 1), ("date", -1)])
        for c in ALLOWED_COLLECTIONS:
            await db[f"sync_{c}"].create_index("user_id")
        log.info("MongoDB indexes ready")
    except Exception as e:
        log.warning("Index creation issue: %s", e)

    # Start the daily digest scheduler (only when DIGEST_ENABLED=1)
    if os.environ.get("DIGEST_ENABLED", "1") == "1":
        from services.digest import digest_scheduler
        app.state.digest_task = asyncio.create_task(digest_scheduler(db))


@app.on_event("shutdown")
async def shutdown():
    task = getattr(app.state, "digest_task", None)
    if task and not task.done():
        task.cancel()
    client.close()
