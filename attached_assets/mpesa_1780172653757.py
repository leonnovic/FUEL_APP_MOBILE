"""Daraja M-PESA STK Push (sandbox + production) + callback + status lookup.

FIXES:
- Proper timezone handling using pytz Africa/Nairobi
- Production environment support
- Enhanced error handling and logging
- Idempotency key support for duplicate prevention
"""

from __future__ import annotations

import asyncio
import base64
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

import os

from core import (
    MPESA_CALLBACK_BASE_URL,
    PLANS,
    db,
    get_current_user,
    log,
    new_id,
    normalize_phone,
    now_iso,
)

router = APIRouter()

# Read Daraja keys lazily so founder-runtime updates take effect immediately
def _mpesa_env(): return os.environ.get("MPESA_ENV", "sandbox")
def _mpesa_consumer_key(): return os.environ.get("MPESA_CONSUMER_KEY", "")
def _mpesa_consumer_secret(): return os.environ.get("MPESA_CONSUMER_SECRET", "")
def _mpesa_shortcode(): return os.environ.get("MPESA_SHORTCODE", "174379")
def _mpesa_passkey(): return os.environ.get("MPESA_PASSKEY", "")

class STKBody(BaseModel):
    plan: str
    phone: str = Field(min_length=7, max_length=15)

class _DarajaClient:
    def __init__(self):
        self._token: Optional[str] = None
        self._token_exp: Optional[datetime] = None
        self._lock = asyncio.Lock()

    @property
    def base(self) -> str:
        return "https://sandbox.safaricom.co.ke" if _mpesa_env() == "sandbox" else "https://api.safaricom.co.ke"

    def configured(self) -> bool:
        return bool(_mpesa_consumer_key() and _mpesa_consumer_secret()
                    and _mpesa_passkey() and _mpesa_shortcode())

    async def token(self) -> str:
        async with self._lock:
            if self._token and self._token_exp and datetime.now(timezone.utc) < self._token_exp:
                return self._token
            if not self.configured():
                raise RuntimeError("Daraja credentials not configured")
            basic = base64.b64encode(f"{_mpesa_consumer_key()}:{_mpesa_consumer_secret()}".encode()).decode()
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
        """Generate M-PESA timestamp in Nairobi timezone (required by Daraja)."""
        try:
            import pytz
            nairobi = pytz.timezone("Africa/Nairobi")
            return datetime.now(nairobi).strftime("%Y%m%d%H%M%S")
        except ImportError:
            # Fallback: UTC+3 for Nairobi
            return (datetime.now(timezone.utc) + timedelta(hours=3)).strftime("%Y%m%d%H%M%S")

    @staticmethod
    def _password(timestamp: str) -> str:
        raw = f"{_mpesa_shortcode()}{_mpesa_passkey()}{timestamp}"
        return base64.b64encode(raw.encode()).decode()

    async def stk_push(self, *, amount: int, phone: str, account_ref: str, description: str) -> dict:
        token = await self.token()
        ts = self._timestamp()
        pwd = self._password(ts)
        callback = f"{MPESA_CALLBACK_BASE_URL}/stk-callback"
        payload = {
            "BusinessShortCode": _mpesa_shortcode(),
            "Password": pwd, "Timestamp": ts,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount, "PartyA": phone, "PartyB": _mpesa_shortcode(),
            "PhoneNumber": phone, "CallBackURL": callback,
            "AccountReference": account_ref, "TransactionDesc": description,
        }
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                f"{self.base}/mpesa/stkpush/v1/processrequest",
                json=payload, headers={"Authorization": f"Bearer {token}"},
            )
            r.raise_for_status()
            return r.json()

    async def query_status(self, checkout_request_id: str) -> dict:
        """Query the status of an STK push transaction."""
        token = await self.token()
        ts = self._timestamp()
        pwd = self._password(ts)
        payload = {
            "BusinessShortCode": _mpesa_shortcode(),
            "Password": pwd,
            "Timestamp": ts,
            "CheckoutRequestID": checkout_request_id,
        }
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                f"{self.base}/mpesa/stkpushquery/v1/query",
                json=payload, headers={"Authorization": f"Bearer {token}"},
            )
            r.raise_for_status()
            return r.json()

daraja = _DarajaClient()

@router.post("/mpesa/stk-push")
async def mpesa_stk_push(body: STKBody, user: dict = Depends(get_current_user)):
    if body.plan not in PLANS or body.plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan = PLANS[body.plan]
    amount = int(plan["price_kes"])
    phone = normalize_phone(body.phone)
    if not phone.startswith("254") or len(phone) != 12:
        raise HTTPException(status_code=400, detail="Phone must be a valid Kenyan number (2547XXXXXXXX)")

    account_ref = f"FUEL-{user['id'][:8]}"
    tx_id = new_id()
    # Idempotency: check for existing pending transaction
    existing = await db.payment_transactions.find_one({
        "user_id": user["id"],
        "plan": body.plan,
        "status": {"$in": ["initiated", "pending"]},
    })
    if existing:
        return {
            "ok": True,
            "tx_id": existing["id"],
            "message": "Existing transaction found",
            "existing": True,
        }

    await db.payment_transactions.insert_one({
        "id": tx_id, "user_id": user["id"], "user_email": user["email"],
        "plan": body.plan, "amount": amount, "currency": "kes",
        "provider": "mpesa", "phone": phone, "account_ref": account_ref,
        "status": "initiated", "payment_status": "pending",
        "created_at": now_iso(), "updated_at": now_iso(),
    })

    if not daraja.configured():
        log.warning("Daraja not configured — returning MOCK STK push response")
        await db.payment_transactions.update_one(
            {"id": tx_id},
            {"$set": {
                "status": "mock", "payment_status": "pending_mock",
                "checkout_request_id": f"ws_CO_{uuid.uuid4().hex[:14]}",
                "merchant_request_id": new_id(),
                "note": "Configure MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET to enable real STK push",
                "updated_at": now_iso(),
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
            {"$set": {"status": "error", "error": str(e), "updated_at": now_iso()}},
        )
        raise HTTPException(status_code=502, detail=f"M-PESA error: {e}")

    update = {
        "merchant_request_id": resp.get("MerchantRequestID"),
        "checkout_request_id": resp.get("CheckoutRequestID"),
        "response_code": resp.get("ResponseCode"),
        "response_description": resp.get("ResponseDescription"),
        "customer_message": resp.get("CustomerMessage"),
        "status": "pending" if str(resp.get("ResponseCode")) == "0" else "failed",
        "updated_at": now_iso(),
    }
    await db.payment_transactions.update_one({"id": tx_id}, {"$set": update})
    return {"ok": True, "tx_id": tx_id, **{k: v for k, v in update.items() if k != "updated_at"}}

def _parse_stk_callback(payload: dict) -> dict:
    """Pull the bits we care about out of a Daraja STK callback envelope."""
    cb = payload.get("Body", {}).get("stkCallback", {})
    items = (cb.get("CallbackMetadata") or {}).get("Item", []) or []
    parsed = {
        "checkout_request_id": cb.get("CheckoutRequestID"),
        "result_code": cb.get("ResultCode"),
        "result_desc": cb.get("ResultDesc"),
        "amount": None, "receipt": None, "phone": None, "txn_date": None,
    }
    key_map = {
        "Amount": "amount", "MpesaReceiptNumber": "receipt",
        "PhoneNumber": "phone", "TransactionDate": "txn_date",
    }
    for it in items:
        target = key_map.get(it.get("Name"))
        if target:
            parsed[target] = it.get("Value")
    parsed["status_str"] = "paid" if str(parsed["result_code"]) == "0" else "failed"
    return parsed

async def _update_payment_transaction(parsed: dict, now: str) -> None:
    """Apply the callback result to the matching transaction row."""
    await db.payment_transactions.update_one(
        {"checkout_request_id": parsed["checkout_request_id"]},
        {"$set": {
            "payment_status": parsed["status_str"],
            "status": "complete" if parsed["status_str"] == "paid" else "failed",
            "result_code": parsed["result_code"],
            "result_desc": parsed["result_desc"],
            "mpesa_receipt": parsed["receipt"],
            "mpesa_amount": parsed["amount"],
            "mpesa_phone": parsed["phone"],
            "transaction_date": parsed["txn_date"],
            "updated_at": now,
        }},
    )

async def _activate_subscription_from_callback(tx: dict, parsed: dict, now: str) -> None:
    """Flip the user to `active` + write subscription + audit-log entry."""
    uid = tx.get("user_id")
    plan = tx.get("plan", "starter")
    period_end = (datetime.now(timezone.utc) + timedelta(days=31)).isoformat()
    log.info(
        "fuelpro.mpesa.activated user_id=%s plan=%s receipt=%s amount=%s period_end=%s",
        uid, plan, parsed.get("receipt"), parsed.get("amount"), period_end,
    )
    await db.users.update_one(
        {"id": uid},
        {"$set": {"tier": plan, "subscription_status": "active",
                  "subscription_period_end": period_end, "updated_at": now}},
    )
    await db.subscriptions.update_one(
        {"user_id": uid},
        {"$set": {"user_id": uid, "tier": plan, "status": "active",
                  "provider": "mpesa", "mpesa_receipt": parsed["receipt"],
                  "period_end": period_end, "updated_at": now}},
        upsert=True,
    )
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": uid, "action": "subscription.activated",
        "at": now, "meta": {"plan": plan, "provider": "mpesa", "receipt": parsed["receipt"]},
    })
    # Push notification (best-effort)
    try:
        from routers.push import push_to_user
        await push_to_user(uid, {
            "title": "Payment received 🎉",
            "body": f"Your {plan.title()} plan is now active. Receipt: {parsed.get('receipt', 'N/A')}",
            "url": "/#/?tab=dashboard",
            "tag": f"mpesa-paid-{parsed.get('receipt', uid)}",
            "icon": "/logo-small.png",
        })
    except Exception as _e:
        log.debug("mpesa push skipped: %s", _e)

async def mpesa_stk_callback_handler(request: Request):
    """Mounted on the FastAPI app at /api/mpesa/stk-callback by server.py."""
    parsed = _parse_stk_callback(await request.json())
    log.info(
        "fuelpro.mpesa.callback.parsed checkout_id=%s result_code=%s status=%s receipt=%s",
        parsed.get("checkout_request_id"), parsed.get("result_code"),
        parsed.get("status_str"), parsed.get("receipt"),
    )
    tx = await db.payment_transactions.find_one(
        {"checkout_request_id": parsed["checkout_request_id"]}, {"_id": 0},
    )
    if tx and tx.get("payment_status") != "paid":
        now = now_iso()
        await _update_payment_transaction(parsed, now)
        if parsed["status_str"] == "paid":
            await _activate_subscription_from_callback(tx, parsed, now)
    return {"ResultCode": 0, "ResultDesc": "Callback received"}

@router.get("/mpesa/status/{tx_id}")
async def mpesa_status(tx_id: str, user: dict = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one(
        {"id": tx_id, "user_id": user["id"]}, {"_id": 0},
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # If pending, try to query live status from Daraja
    if tx.get("status") == "pending" and tx.get("checkout_request_id") and daraja.configured():
        try:
            live_status = await daraja.query_status(tx["checkout_request_id"])
            if live_status.get("ResultCode") is not None:
                parsed = {
                    "checkout_request_id": tx["checkout_request_id"],
                    "result_code": live_status.get("ResultCode"),
                    "result_desc": live_status.get("ResultDesc"),
                    "status_str": "paid" if str(live_status.get("ResultCode")) == "0" else "failed",
                }
                now = now_iso()
                await _update_payment_transaction(parsed, now)
                if parsed["status_str"] == "paid":
                    await _activate_subscription_from_callback(tx, parsed, now)
                # Refresh tx data
                tx = await db.payment_transactions.find_one(
                    {"id": tx_id, "user_id": user["id"]}, {"_id": 0},
                )
        except Exception as e:
            log.warning("Live status query failed for tx %s: %s", tx_id, e)

    return {
        "tx_id": tx_id,
        "status": tx.get("status"),
        "payment_status": tx.get("payment_status"),
        "mpesa_receipt": tx.get("mpesa_receipt"),
        "result_desc": tx.get("result_desc") or tx.get("customer_message"),
    }

@router.get("/verify/receipt/{receipt}")
async def verify_receipt(receipt: str):
    """Public receipt verification — anyone with a receipt can confirm validity."""
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
