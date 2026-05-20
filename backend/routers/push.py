"""Web Push Notifications (VAPID-based, cross-platform).

Lets the frontend register a Push subscription with the browser's push service
(Chrome → fcm.googleapis.com, Firefox → updates.push.services.mozilla.com,
Apple → push.apple.com when installed as a PWA on iOS 16.4+).

We store the subscription server-side and use pywebpush to send notifications
signed with our VAPID private key. No Firebase / no service-account JSON
needed — just one VAPID key pair (already generated and stored in .env).

Endpoints
---------
GET    /api/push/public-key        public VAPID key for the browser to subscribe
POST   /api/push/subscribe         persist a new subscription
POST   /api/push/unsubscribe       remove by endpoint
POST   /api/push/test              send a test notification to the caller
POST   /api/push/broadcast         (founder) send to all users
"""
from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import db, get_current_user, log, new_id, now_iso, require_founder

router = APIRouter()

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT_EMAIL", "mailto:admin@fuelpro.app")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: PushKeys
    user_agent: str | None = None
    expiration_time: int | None = None


class PushUnsubscribeRequest(BaseModel):
    endpoint: str


class PushSendRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., max_length=400)
    url: str | None = "/"
    icon: str | None = "/logo-small.png"
    tag: str | None = None


# ---------------------------------------------------------------------------
# Public VAPID key (called by frontend before subscribing)
# ---------------------------------------------------------------------------
@router.get("/push/public-key")
async def get_public_key():
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(503, "Push not configured (VAPID_PUBLIC_KEY missing)")
    return {"public_key": VAPID_PUBLIC_KEY}


# ---------------------------------------------------------------------------
# Subscribe / unsubscribe
# ---------------------------------------------------------------------------
@router.post("/push/subscribe")
async def subscribe(body: PushSubscribeRequest, user: dict[str, Any] = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "endpoint": body.endpoint,
        "p256dh": body.keys.p256dh,
        "auth": body.keys.auth,
        "user_agent": body.user_agent or "",
        "expiration_time": body.expiration_time,
        "created_at": now_iso(),
        "last_used_at": now_iso(),
    }
    # Upsert by endpoint (endpoint is unique per browser/device)
    await db.push_subscriptions.update_one(
        {"endpoint": body.endpoint},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "id": doc["id"]}


@router.post("/push/unsubscribe")
async def unsubscribe(body: PushUnsubscribeRequest, user: dict[str, Any] = Depends(get_current_user)):
    res = await db.push_subscriptions.delete_one({"endpoint": body.endpoint, "user_id": user["id"]})
    return {"ok": True, "deleted": res.deleted_count}


# ---------------------------------------------------------------------------
# Send helpers (also reusable from other routers — e.g., digest, mpesa)
# ---------------------------------------------------------------------------
async def _send_to_subscription(sub: dict[str, Any], payload: dict[str, Any]) -> tuple[bool, str]:
    """Send a single push. Returns (ok, message)."""
    if not VAPID_PRIVATE_KEY:
        return False, "vapid_not_configured"
    try:
        from pywebpush import WebPushException, webpush  # local import — pywebpush is heavy
        webpush(
            subscription_info={
                "endpoint": sub["endpoint"],
                "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
            },
            data=__import__("json").dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CONTACT},
            ttl=86400,
        )
        return True, "ok"
    except Exception as e:  # noqa: BLE001
        # WebPushException with .response.status_code 404/410 → endpoint gone → delete sub
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status in (404, 410):
            try:
                await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
            except Exception:
                pass
            return False, f"gone_{status}"
        log.warning("push send failed: %s (%s)", e, type(e).__name__)
        return False, str(e)[:120]


async def push_to_user(user_id: str, payload: dict[str, Any]) -> dict[str, int]:
    """Public helper: send a payload to every subscription belonging to user_id."""
    subs_cursor = db.push_subscriptions.find({"user_id": user_id}, {"_id": 0})
    sent, failed = 0, 0
    async for sub in subs_cursor:
        ok, _ = await _send_to_subscription(sub, payload)
        if ok:
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed}


# ---------------------------------------------------------------------------
# Test send (caller's own subscriptions)
# ---------------------------------------------------------------------------
@router.post("/push/test")
async def send_test(body: PushSendRequest, user: dict[str, Any] = Depends(get_current_user)):
    payload = {
        "title": body.title,
        "body": body.body,
        "url": body.url or "/",
        "icon": body.icon or "/logo-small.png",
        "tag": body.tag or "fuelpro-test",
    }
    result = await push_to_user(user["id"], payload)
    if result["sent"] == 0 and result["failed"] == 0:
        raise HTTPException(404, "No subscriptions found. Enable notifications first.")
    return {"ok": True, **result}


# ---------------------------------------------------------------------------
# Founder-only broadcast
# ---------------------------------------------------------------------------
@router.post("/push/broadcast", dependencies=[Depends(require_founder)])
async def broadcast(body: PushSendRequest):
    payload = {
        "title": body.title,
        "body": body.body,
        "url": body.url or "/",
        "icon": body.icon or "/logo-small.png",
        "tag": body.tag or "fuelpro-broadcast",
    }
    subs_cursor = db.push_subscriptions.find({}, {"_id": 0})
    sent, failed = 0, 0
    async for sub in subs_cursor:
        ok, _ = await _send_to_subscription(sub, payload)
        if ok:
            sent += 1
        else:
            failed += 1
    return {"ok": True, "sent": sent, "failed": failed}


# ---------------------------------------------------------------------------
# List current subscriptions (debugging)
# ---------------------------------------------------------------------------
@router.get("/push/subscriptions")
async def list_subscriptions(user: dict[str, Any] = Depends(get_current_user)):
    items = []
    async for s in db.push_subscriptions.find(
        {"user_id": user["id"]},
        {"_id": 0, "endpoint": 1, "user_agent": 1, "created_at": 1},
    ):
        items.append(s)
    return {"items": items, "count": len(items)}
