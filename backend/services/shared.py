"""Shared utilities extracted from duplicated patterns across routers.

Centralises audit-log writes, subscription activation, user-document
creation, OAuth upsert, IP extraction, collection validation, and
payment-transaction creation so every router uses a single code path.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, Request

from core import (
    ALLOWED_COLLECTIONS,
    db,
    log,
    new_id,
    now_iso,
)


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------
async def write_audit_log(
    user_id: str,
    action: str,
    meta: Optional[dict[str, Any]] = None,
    *,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    station_id: Optional[str] = None,
) -> str:
    """Insert a single audit-log entry. Returns the generated id."""
    doc: dict[str, Any] = {
        "id": new_id(),
        "user_id": user_id,
        "action": action,
        "at": now_iso(),
        "meta": meta or {},
    }
    if ip_address is not None:
        doc["ip_address"] = ip_address
    if user_agent is not None:
        doc["user_agent"] = user_agent
    if station_id is not None:
        doc["station_id"] = station_id
    await db.audit_log.insert_one(doc)
    return doc["id"]


# ---------------------------------------------------------------------------
# Request helpers
# ---------------------------------------------------------------------------
def get_client_ip(request: Request) -> str:
    """Extract the client IP from the request, respecting X-Forwarded-For."""
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_request_meta(request: Request) -> dict[str, Optional[str]]:
    """Return a dict with ip_address, user_agent, station_id from the request."""
    return {
        "ip_address": get_client_ip(request),
        "user_agent": request.headers.get("user-agent", "unknown"),
        "station_id": request.headers.get("x-station-id"),
    }


# ---------------------------------------------------------------------------
# Collection validation
# ---------------------------------------------------------------------------
def validate_collection(collection: str) -> None:
    """Raise HTTP 400 if *collection* is not in ALLOWED_COLLECTIONS."""
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown collection: {collection}")


# ---------------------------------------------------------------------------
# User document factory
# ---------------------------------------------------------------------------
def build_user_doc(
    email: str,
    name: str,
    *,
    password_hash: str = "",
    role: str = "owner",
    auth_methods: Optional[list[str]] = None,
    extra_fields: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Build a new user document dict with a 14-day trial.

    Does NOT insert it — the caller decides when to persist.
    """
    now = datetime.now(timezone.utc)
    doc: dict[str, Any] = {
        "id": new_id(),
        "email": email,
        "name": name,
        "password_hash": password_hash,
        "role": role,
        "tier": "free",
        "subscription_status": "trial",
        "trial_started_at": now.isoformat(),
        "trial_ends_at": (now + timedelta(days=14)).isoformat(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    if auth_methods:
        doc["auth_methods"] = auth_methods
    if extra_fields:
        doc.update(extra_fields)
    return doc


# ---------------------------------------------------------------------------
# OAuth user upsert
# ---------------------------------------------------------------------------
async def upsert_oauth_user(
    email: str,
    name: str,
    provider: str,
    *,
    picture: Optional[str] = None,
    extra_fields: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Find-or-create a user by *email* for an OAuth provider.

    - Existing user → merge auth_methods, update timestamps.
    - New user → create with 14-day trial, write audit-log entry.
    Returns the (refreshed) user document.
    """
    email = (email or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="OAuth profile missing email")

    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": email}, {"_id": 0})

    if existing:
        update_set: dict[str, Any] = {
            "auth_methods": list(set((existing.get("auth_methods") or []) + [provider])),
            f"last_{provider}_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        if picture:
            update_set[f"{provider}_picture"] = picture
        if extra_fields:
            update_set.update(extra_fields)
        await db.users.update_one({"email": email}, {"$set": update_set})
        return await db.users.find_one({"email": email}, {"_id": 0})

    user_doc = build_user_doc(
        email,
        name or email.split("@")[0],
        auth_methods=[provider],
    )
    if picture:
        user_doc[f"{provider}_picture"] = picture
    if extra_fields:
        user_doc.update(extra_fields)
    await db.users.insert_one(user_doc)
    await write_audit_log(
        user_doc["id"], "user.register",
        meta={"provider": provider, "email": email},
    )
    return user_doc


# ---------------------------------------------------------------------------
# Subscription activation
# ---------------------------------------------------------------------------
async def activate_subscription(
    user_id: str,
    plan: str,
    provider: str,
    *,
    billing_cycle: str = "monthly",
    period_days: Optional[int] = None,
    receipt: Optional[str] = None,
    session_id: Optional[str] = None,
    source: Optional[str] = None,
    push_title: str = "Subscription activated 🎉",
    push_body: Optional[str] = None,
) -> None:
    """Activate a subscription for *user_id*: update user tier, upsert
    subscription doc, write audit-log, and send a best-effort push."""
    if period_days is None:
        period_days = 365 if billing_cycle == "yearly" else 31
    period_end = (datetime.now(timezone.utc) + timedelta(days=period_days)).isoformat()
    now = now_iso()

    log.info(
        "fuelpro.%s.activated user_id=%s plan=%s cycle=%s source=%s period_end=%s",
        provider, user_id, plan, billing_cycle, source or provider, period_end,
    )

    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "tier": plan,
            "subscription_status": "active",
            "subscription_period_end": period_end,
            "updated_at": now,
        }},
    )

    sub_set: dict[str, Any] = {
        "user_id": user_id,
        "tier": plan,
        "status": "active",
        "provider": provider,
        "period_end": period_end,
        "updated_at": now,
    }
    if billing_cycle:
        sub_set["billing_cycle"] = billing_cycle
    if session_id:
        sub_set["session_id"] = session_id
    if receipt:
        sub_set["mpesa_receipt"] = receipt
    await db.subscriptions.update_one(
        {"user_id": user_id}, {"$set": sub_set}, upsert=True,
    )

    audit_meta: dict[str, Any] = {"plan": plan, "provider": provider}
    if session_id:
        audit_meta["session_id"] = session_id
    if receipt:
        audit_meta["receipt"] = receipt
    if source:
        audit_meta["source"] = source
    await write_audit_log(user_id, "subscription.activated", meta=audit_meta)

    if push_body is None:
        push_body = f"Your FuelPro {plan.title()} plan is now active."
    tag = f"{provider}-paid-{receipt or session_id or user_id}"
    try:
        from routers.push import push_to_user
        await push_to_user(user_id, {
            "title": push_title,
            "body": push_body,
            "url": "/#/?tab=dashboard",
            "tag": tag,
            "icon": "/logo-small.png",
        })
    except Exception as _e:
        log.debug("%s push skipped: %s", provider, _e)


# ---------------------------------------------------------------------------
# Payment transaction factory
# ---------------------------------------------------------------------------
async def create_payment_transaction(
    user_id: str,
    user_email: str,
    plan: str,
    amount: float,
    currency: str,
    provider: str,
    **extra: Any,
) -> str:
    """Insert a new payment_transactions row. Returns the generated tx id."""
    tx_id = new_id()
    doc: dict[str, Any] = {
        "id": tx_id,
        "user_id": user_id,
        "user_email": user_email,
        "plan": plan,
        "amount": amount,
        "currency": currency,
        "provider": provider,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    doc.update(extra)
    await db.payment_transactions.insert_one(doc)
    return tx_id
