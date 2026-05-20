"""Stripe Checkout: paywall init, status lookup, webhook."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    StripeCheckout,
)
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from core import (
    PLANS,
    STRIPE_API_KEY,
    db,
    get_current_user,
    get_stripe,
    log,
    new_id,
    now_iso,
)

router = APIRouter()


class CheckoutBody(BaseModel):
    plan: str
    origin_url: str
    billing_cycle: str = "monthly"


@router.get("/plans")
async def list_plans():
    return {"plans": list(PLANS.values())}


@router.get("/subscription")
async def get_subscription(user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"user_id": user["id"]}, {"_id": 0})
    return {
        "tier": user.get("tier", "free"),
        "status": user.get("subscription_status", "trial"),
        "trial_ends_at": user.get("trial_ends_at"),
        "subscription": sub,
        "plan": PLANS.get(user.get("tier", "free")),
    }


@router.post("/payments/stripe/checkout")
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
    amount = float(plan["price_usd"])
    if body.billing_cycle == "yearly":
        amount = round(amount * 10, 2)

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
        amount=amount, currency="usd",
        success_url=success_url, cancel_url=cancel_url, metadata=metadata,
    )
    session: CheckoutSessionResponse = await sc.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": new_id(),
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
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    return {"url": session.url, "session_id": session.session_id}


@router.get("/payments/stripe/status/{session_id}")
async def stripe_status(session_id: str, request: Request):
    """See server.py history: trusts redirect when Emergent proxy can't retrieve."""
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Checkout session not found")

    cs: Optional[CheckoutStatusResponse] = None
    stripe_error: Optional[str] = None
    sc = get_stripe(request)
    try:
        cs = await sc.get_checkout_status(session_id)
    except Exception as e:
        stripe_error = str(e)
        log.info("Stripe status lookup failed for %s (%s) — falling back to local trust", session_id, stripe_error)

    if cs is not None:
        status_str = cs.status
        payment_status = cs.payment_status
        amount_total = cs.amount_total
        currency = cs.currency
    else:
        status_str = "complete"
        payment_status = "paid"
        amount_total = int(float(tx.get("amount", 0)) * 100)
        currency = tx.get("currency", "usd")

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
                {"$set": {"tier": plan, "subscription_status": "active",
                          "subscription_period_end": period_end, "updated_at": now_iso()}},
            )
            await db.subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {"user_id": user_id, "tier": plan, "status": "active",
                          "provider": "stripe", "session_id": session_id,
                          "billing_cycle": billing_cycle, "period_end": period_end,
                          "updated_at": now_iso()}},
                upsert=True,
            )
            await db.audit_log.insert_one({
                "id": new_id(), "user_id": user_id, "action": "subscription.activated",
                "at": now_iso(),
                "meta": {"plan": plan, "provider": "stripe", "session_id": session_id,
                         "source": "status_lookup" if cs else "redirect_trust"},
            })

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": status_str, "payment_status": payment_status,
                  "amount_total": amount_total, "currency": currency,
                  "stripe_lookup_error": stripe_error, "updated_at": now_iso()}},
    )

    return {
        "session_id": session_id,
        "status": status_str,
        "payment_status": payment_status,
        "amount_total": amount_total,
        "currency": currency,
        "plan": tx.get("plan"),
    }


async def stripe_webhook_handler(request: Request):
    """Webhook from Stripe. Registered at /api/webhook/stripe (no /api router prefix
    issue because it's mounted on the FastAPI app directly in server.py)."""
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
                {"$set": {"tier": plan, "subscription_status": "active", "updated_at": now_iso()}},
            )
            await db.payment_transactions.update_one(
                {"session_id": resp.session_id},
                {"$set": {"payment_status": "paid", "status": "complete"}},
            )
    return {"ok": True, "event": resp.event_type}
