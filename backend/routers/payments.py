"""Stripe Checkout: paywall init, status lookup, webhook."""

from __future__ import annotations

from typing import Optional

import os

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
    db,
    get_current_user,
    get_stripe,
    log,
    now_iso,
)
from services.shared import activate_subscription, create_payment_transaction

router = APIRouter()


def _stripe_key() -> str:
    return os.environ.get("STRIPE_API_KEY", "")


def _stripe_trust_redirect() -> bool:
    return os.environ.get("STRIPE_TRUST_REDIRECT", "1") != "0"


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
    if not _stripe_key():
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

    sc = StripeCheckout(api_key=_stripe_key(), webhook_url=webhook_url)
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

    await create_payment_transaction(
        user["id"], user["email"], body.plan, amount, "usd", "stripe",
        session_id=session.session_id, billing_cycle=body.billing_cycle, metadata=metadata,
    )
    return {"url": session.url, "session_id": session.session_id}


async def _resolve_stripe_status(sc, session_id: str, tx: dict) -> tuple[str, str, int, str, Optional[str], bool]:
    """Look up the Stripe session, falling back to local trust if Emergent's
    retrieve proxy is unavailable. Returns:
    (status_str, payment_status, amount_total, currency, stripe_error, from_live).
    Raises HTTPException(502) if Stripe lookup fails and trust-redirect is off.
    """
    stripe_error: Optional[str] = None
    try:
        cs: Optional[CheckoutStatusResponse] = await sc.get_checkout_status(session_id)
    except Exception as e:
        cs = None
        stripe_error = str(e)
        log.info("Stripe status lookup failed for %s (%s) — falling back to local trust",
                 session_id, stripe_error)

    if cs is not None:
        return cs.status, cs.payment_status, cs.amount_total, cs.currency, stripe_error, True
    if _stripe_trust_redirect():
        return (
            "complete", "paid",
            int(float(tx.get("amount", 0)) * 100),
            tx.get("currency", "usd"),
            stripe_error, False,
        )
    raise HTTPException(status_code=502, detail=f"Stripe status lookup failed: {stripe_error}")


async def _activate_subscription_from_stripe(tx: dict, session_id: str, from_live: bool) -> None:
    """Flip user → active, upsert subscription doc, write audit-log entry."""
    plan = tx.get("plan", "starter")
    user_id = (tx.get("metadata") or {}).get("user_id")
    if not user_id:
        log.warning("fuelpro.stripe.activate.skipped session_id=%s reason=no_user_id", session_id)
        return
    billing_cycle = tx.get("billing_cycle", "monthly")
    await activate_subscription(
        user_id, plan, "stripe",
        billing_cycle=billing_cycle,
        session_id=session_id,
        source="status_lookup" if from_live else "redirect_trust",
    )


@router.get("/payments/stripe/status/{session_id}")
async def stripe_status(session_id: str, request: Request):
    """Lookup + apply Stripe checkout status. Trusts the redirect if Emergent
    proxy can't retrieve (toggleable via STRIPE_TRUST_REDIRECT)."""
    if not _stripe_key():
        raise HTTPException(status_code=503, detail="Stripe not configured")

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Checkout session not found")

    (status_str, payment_status, amount_total, currency,
     stripe_error, from_live) = await _resolve_stripe_status(get_stripe(request), session_id, tx)

    if payment_status == "paid" and tx.get("payment_status") != "paid":
        await _activate_subscription_from_stripe(tx, session_id, from_live)

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
    if not _stripe_key():
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
