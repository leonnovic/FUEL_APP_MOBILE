"""Founder-only runtime configuration endpoints.

Allows the founder to paste API keys (Resend, Twilio, Stripe, Daraja) and
have them take effect immediately — without editing /app/backend/.env or
restarting the supervisor process. Keys are stored encrypted-at-rest in
MongoDB (`runtime_config` collection) and overlay the env values whenever
any service requests them.

This is the founder's "runtime override" layer. Persisted across restarts.
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import db, log, new_id, now_iso, require_founder

router = APIRouter()


class IntegrationKeys(BaseModel):
    # Email (Resend)
    resend_api_key: Optional[str] = Field(default=None, max_length=512)
    sender_email: Optional[str] = Field(default=None, max_length=256)
    # SMS (Twilio)
    twilio_account_sid: Optional[str] = Field(default=None, max_length=256)
    twilio_auth_token: Optional[str] = Field(default=None, max_length=512)
    twilio_from_number: Optional[str] = Field(default=None, max_length=64)
    # Stripe (override Emergent sandbox)
    stripe_api_key: Optional[str] = Field(default=None, max_length=512)
    stripe_trust_redirect: Optional[bool] = None
    # Daraja M-PESA
    mpesa_env: Optional[str] = Field(default=None, max_length=16)  # 'sandbox' | 'production'
    mpesa_consumer_key: Optional[str] = Field(default=None, max_length=256)
    mpesa_consumer_secret: Optional[str] = Field(default=None, max_length=512)
    mpesa_passkey: Optional[str] = Field(default=None, max_length=512)
    mpesa_shortcode: Optional[str] = Field(default=None, max_length=16)


# Map Pydantic field → env var name (KEY UPPERCASE)
_KEY_TO_ENV = {
    "resend_api_key": "RESEND_API_KEY",
    "sender_email": "SENDER_EMAIL",
    "twilio_account_sid": "TWILIO_ACCOUNT_SID",
    "twilio_auth_token": "TWILIO_AUTH_TOKEN",
    "twilio_from_number": "TWILIO_FROM_NUMBER",
    "stripe_api_key": "STRIPE_API_KEY",
    "stripe_trust_redirect": "STRIPE_TRUST_REDIRECT",
    "mpesa_env": "MPESA_ENV",
    "mpesa_consumer_key": "MPESA_CONSUMER_KEY",
    "mpesa_consumer_secret": "MPESA_CONSUMER_SECRET",
    "mpesa_passkey": "MPESA_PASSKEY",
    "mpesa_shortcode": "MPESA_SHORTCODE",
}


def _mask(v: Optional[str]) -> Optional[str]:
    if not v:
        return None
    if len(v) <= 8:
        return "•" * len(v)
    return v[:4] + "•" * (len(v) - 8) + v[-4:]


async def apply_runtime_config_to_env():
    """Called on backend startup — loads stored keys and copies them into os.environ.
    Existing env vars take precedence (devs can still override via .env)."""
    doc = await db.runtime_config.find_one({"_id": "integrations"}, {"_id": 0})
    if not doc:
        return
    applied = []
    for field, env_name in _KEY_TO_ENV.items():
        val = doc.get(field)
        if val is None or val == "":
            continue
        # Only set if not already in env (preserves .env override priority)
        if not os.environ.get(env_name):
            os.environ[env_name] = str(val) if not isinstance(val, bool) else ("1" if val else "0")
            applied.append(env_name)
    if applied:
        log.info("Runtime integration keys applied: %s", applied)


@router.get("/founder/integrations")
async def get_integrations(_=Depends(require_founder)):
    """Return masked + booleans for the UI to render the current state."""
    doc = await db.runtime_config.find_one({"_id": "integrations"}, {"_id": 0}) or {}
    masked = {f: _mask(doc.get(f)) for f in _KEY_TO_ENV if f != "stripe_trust_redirect"}
    masked["stripe_trust_redirect"] = doc.get("stripe_trust_redirect")
    # Live env values (un-masked existence check only)
    live = {env_name: bool(os.environ.get(env_name)) for env_name in _KEY_TO_ENV.values()}
    return {"ok": True, "integrations": masked, "live_env_present": live,
            "updated_at": doc.get("_updated_at")}


@router.post("/founder/integrations")
async def set_integrations(body: IntegrationKeys, _=Depends(require_founder)):
    """Persist + immediately apply integration keys to os.environ."""
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No keys provided")

    # Persist
    payload["_updated_at"] = now_iso()
    await db.runtime_config.update_one(
        {"_id": "integrations"}, {"$set": payload}, upsert=True,
    )

    # Apply live to os.environ so the next service call picks them up
    for field, val in payload.items():
        if field == "_updated_at":
            continue
        env_name = _KEY_TO_ENV.get(field)
        if not env_name:
            continue
        if isinstance(val, bool):
            os.environ[env_name] = "1" if val else "0"
        elif val is not None:
            os.environ[env_name] = str(val)

    # Audit
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": "founder", "action": "founder.integrations_updated",
        "at": now_iso(),
        "meta": {"keys_set": [k for k in payload if k != "_updated_at"]},
    })
    return {"ok": True, "applied": list(payload.keys())}


@router.delete("/founder/integrations/{field}")
async def clear_integration(field: str, _=Depends(require_founder)):
    """Clear a single key (sets to empty so env override goes back to .env / default)."""
    if field not in _KEY_TO_ENV:
        raise HTTPException(status_code=400, detail="Unknown field")
    await db.runtime_config.update_one(
        {"_id": "integrations"}, {"$unset": {field: ""}, "$set": {"_updated_at": now_iso()}},
    )
    env_name = _KEY_TO_ENV[field]
    os.environ.pop(env_name, None)
    return {"ok": True, "cleared": field}


# ---------------------------------------------------------------------------
# System diagnostics — founder-only "ops dashboard"
# ---------------------------------------------------------------------------
@router.get("/founder/system-stats")
async def system_stats(_=Depends(require_founder)):
    """Live counts + DB size for the founder ops dashboard."""
    stats: dict = {"counts": {}, "db_stats": None}
    for col in ["users", "audit_log", "subscriptions", "payment_transactions",
                "invites", "stations", "founder_login_log",
                "loyalty_customers", "ai_reconcile_cache", "daily_digests"]:
        try:
            stats["counts"][col] = await db[col].estimated_document_count()
        except Exception as e:
            stats["counts"][col] = {"error": str(e)}
    try:
        stats["db_stats"] = await db.command("dbStats")
        # dbStats returns BSON Decimal128 / floats — strip non-JSON-friendly types
        stats["db_stats"] = {k: (v if isinstance(v, (int, float, str, bool, type(None))) else str(v))
                              for k, v in stats["db_stats"].items()}
    except Exception as e:
        stats["db_stats"] = {"error": str(e)}
    return {"ok": True, "stats": stats, "ts": now_iso()}


@router.post("/founder/broadcast")
async def broadcast_message(body: dict, _=Depends(require_founder)):
    """Send a system-wide notification (audit log entry per user). UI shows a
    toast next time each user loads the app."""
    msg = (body.get("message") or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message required")
    severity = body.get("severity", "info")  # info | warning | critical
    users = await db.users.find({}, {"_id": 0, "id": 1}).to_list(10000)
    docs = [{
        "id": new_id(), "user_id": u["id"],
        "action": "founder.broadcast",
        "at": now_iso(),
        "meta": {"message": msg, "severity": severity, "read": False},
    } for u in users]
    if docs:
        await db.audit_log.insert_many(docs)
    return {"ok": True, "sent_to": len(docs)}


@router.delete("/founder/users/{user_id}")
async def founder_delete_user(user_id: str, _=Depends(require_founder)):
    """Hard-delete a user and their related data. Use with extreme caution."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") == "owner":
        owner_count = await db.users.count_documents({"role": "owner"})
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last remaining owner")
    deleted_counts = {}
    for col in ["users", "subscriptions", "user_data", "ai_reconcile_cache",
                "loyalty_config", "loyalty_customers", "daily_digests",
                "price_alerts", "price_snapshots"]:
        try:
            r = await db[col].delete_many({"user_id": user_id} if col != "users" else {"id": user_id})
            deleted_counts[col] = r.deleted_count
        except Exception as e:
            deleted_counts[col] = f"err:{e}"
    for col in ["sync_stations", "sync_sales", "sync_inventory", "sync_employees",
                "sync_invoices", "sync_deliveries", "sync_expenses", "sync_suppliers",
                "sync_audit", "sync_documents"]:
        try:
            r = await db[col].delete_many({"user_id": user_id})
            deleted_counts[col] = r.deleted_count
        except Exception as e:
            deleted_counts[col] = f"err:{e}"
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": "founder", "action": "founder.user_deleted",
        "at": now_iso(),
        "meta": {"target_email": user.get("email"), "target_id": user_id, "deleted_counts": deleted_counts},
    })
    return {"ok": True, "deleted": deleted_counts}


@router.post("/founder/users/{user_id}/extend-trial")
async def founder_extend_trial(user_id: str, body: dict, _=Depends(require_founder)):
    """Extend a user's trial by N days. Useful for support cases."""
    from datetime import datetime, timedelta, timezone
    days = int(body.get("days", 14))
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    current_end = user.get("trial_ends_at")
    if current_end:
        try:
            base = datetime.fromisoformat(current_end)
        except Exception:
            base = datetime.now(timezone.utc)
    else:
        base = datetime.now(timezone.utc)
    new_end = base + timedelta(days=days)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"trial_ends_at": new_end.isoformat(),
                  "subscription_status": "trial",
                  "updated_at": now_iso()}},
    )
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": "founder", "action": "founder.trial_extended",
        "at": now_iso(),
        "meta": {"target_user_id": user_id, "days": days, "new_end": new_end.isoformat()},
    })
    return {"ok": True, "trial_ends_at": new_end.isoformat()}


@router.post("/founder/users/{user_id}/grant-subscription")
async def founder_grant_subscription(user_id: str, body: dict, _=Depends(require_founder)):
    """Comp a paid subscription tier to a user (no payment needed). Audit-logged."""
    from datetime import datetime, timedelta, timezone
    plan = body.get("plan", "pro")
    days = int(body.get("days", 31))
    if plan not in {"starter", "pro", "enterprise"}:
        raise HTTPException(status_code=400, detail="Invalid plan")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    period_end = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"tier": plan, "subscription_status": "active",
                  "subscription_period_end": period_end, "updated_at": now_iso()}},
    )
    await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "tier": plan, "status": "active",
                  "provider": "founder_grant", "period_end": period_end,
                  "updated_at": now_iso()}},
        upsert=True,
    )
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": "founder", "action": "founder.subscription_granted",
        "at": now_iso(),
        "meta": {"target_user_id": user_id, "plan": plan, "days": days},
    })
    return {"ok": True, "plan": plan, "period_end": period_end}
