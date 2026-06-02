"""Inventory Low-Stock Alert System.

Monitors fuel inventory levels and triggers alerts when stock drops below
configurable thresholds. Supports email, SMS, and push notification channels.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import db, get_current_user, log, new_id, now_iso

router = APIRouter()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class AlertThreshold(BaseModel):
    fuel_type: str = Field(min_length=1, max_length=50)
    threshold_liters: float = Field(gt=0, le=1000000)
    reorder_quantity: float = Field(gt=0, le=1000000)
    enabled: bool = True

class AlertConfig(BaseModel):
    thresholds: list[AlertThreshold] = Field(default_factory=list)
    channels: list[str] = Field(default_factory=lambda: ["push"])
    cooldown_hours: int = Field(default=6, ge=1, le=168)
    recipients: list[str] = Field(default_factory=list)

class AlertHistoryQuery(BaseModel):
    status: Optional[str] = None  # "active", "resolved", "all"
    limit: int = Field(default=50, ge=1, le=500)

# ---------------------------------------------------------------------------
# Alert Management
# ---------------------------------------------------------------------------
@router.get("/inventory-alerts/config")
async def get_alert_config(user: dict = Depends(get_current_user)):
    """Get the current inventory alert configuration for the user."""
    cfg = await db.inventory_alert_config.find_one(
        {"user_id": user["id"]}, {"_id": 0, "user_id": 0}
    )
    if not cfg:
        return {
            "config": AlertConfig().model_dump(),
            "ok": True,
            "default": True,
        }
    return {"config": cfg, "ok": True, "default": False}

@router.post("/inventory-alerts/config")
async def set_alert_config(body: AlertConfig, user: dict = Depends(get_current_user)):
    """Set inventory alert configuration."""
    # Validate channels
    valid_channels = {"email", "sms", "push", "whatsapp"}
    invalid = set(body.channels) - valid_channels
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid channels: {invalid}. Valid: {valid_channels}"
        )

    doc = {
        **body.model_dump(),
        "user_id": user["id"],
        "updated_at": now_iso(),
    }
    await db.inventory_alert_config.update_one(
        {"user_id": user["id"]},
        {"$set": doc},
        upsert=True,
    )

    await db.audit_log.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "action": "inventory_alerts.config_updated",
        "at": now_iso(),
        "meta": {"thresholds_count": len(body.thresholds)},
    })

    return {"ok": True, "config": body.model_dump()}

# ---------------------------------------------------------------------------
# Alert Checking & Triggering
# ---------------------------------------------------------------------------
async def _check_inventory_alerts(user_id: str) -> list[dict[str, Any]]:
    """Check inventory levels against thresholds and return triggered alerts."""
    cfg = await db.inventory_alert_config.find_one({"user_id": user_id}, {"_id": 0})
    if not cfg or not cfg.get("enabled", True):
        return []

    thresholds = cfg.get("thresholds", [])
    if not thresholds:
        return []

    # Get current inventory
    inventory_items = await db.sync_inventory.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(1000)

    triggered = []
    cooldown_hours = cfg.get("cooldown_hours", 6)
    cooldown_cutoff = (datetime.now(timezone.utc) - timedelta(hours=cooldown_hours)).isoformat()

    for threshold in thresholds:
        if not threshold.get("enabled", True):
            continue

        fuel_type = threshold["fuel_type"]
        threshold_liters = threshold["threshold_liters"]

        # Find matching inventory item
        inv_item = next(
            (i for i in inventory_items if i.get("fuel_type", "").lower() == fuel_type.lower()),
            None
        )

        if not inv_item:
            continue

        current_qty = float(inv_item.get("quantity_liters", 0))

        if current_qty <= threshold_liters:
            # Check cooldown
            recent_alert = await db.inventory_alerts.find_one({
                "user_id": user_id,
                "fuel_type": fuel_type,
                "status": "active",
                "created_at": {"$gt": cooldown_cutoff},
            })

            if recent_alert:
                continue

            alert = {
                "id": new_id(),
                "user_id": user_id,
                "fuel_type": fuel_type,
                "threshold_liters": threshold_liters,
                "current_liters": current_qty,
                "reorder_quantity": threshold.get("reorder_quantity", 0),
                "status": "active",
                "channels": cfg.get("channels", ["push"]),
                "created_at": now_iso(),
                "resolved_at": None,
            }
            await db.inventory_alerts.insert_one(alert)
            triggered.append(alert)

            # Send notifications
            await _send_alert_notifications(user_id, alert, cfg)

    return triggered

async def _send_alert_notifications(user_id: str, alert: dict, cfg: dict) -> None:
    """Send notifications through configured channels."""
    channels = cfg.get("channels", ["push"])
    message = (
        f"⚠️ LOW STOCK ALERT: {alert['fuel_type']} is at {alert['current_liters']:.0f}L "
        f"(threshold: {alert['threshold_liters']:.0f}L). "
        f"Recommended reorder: {alert['reorder_quantity']:.0f}L"
    )

    # Push notification
    if "push" in channels:
        try:
            from routers.push import push_to_user
            await push_to_user(user_id, {
                "title": f"Low Stock: {alert['fuel_type']}",
                "body": message,
                "url": "/#/?tab=inventory",
                "tag": f"inventory-alert-{alert['fuel_type']}",
                "icon": "/logo-small.png",
            })
        except Exception as e:
            log.warning("Push alert failed: %s", e)

    # Email notification
    if "email" in channels:
        try:
            from services.notifications import send_email
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if user and user.get("email"):
                await send_email(
                    to=user["email"],
                    subject=f"FuelPro: Low Stock Alert - {alert['fuel_type']}",
                    html=f"""
                    <h2>Low Stock Alert</h2>
                    <p><strong>Fuel Type:</strong> {alert['fuel_type']}</p>
                    <p><strong>Current Level:</strong> {alert['current_liters']:.0f}L</p>
                    <p><strong>Threshold:</strong> {alert['threshold_liters']:.0f}L</p>
                    <p><strong>Recommended Reorder:</strong> {alert['reorder_quantity']:.0f}L</p>
                    <p><a href="https://fuelpro.app/#/?tab=inventory">View Inventory</a></p>
                    """,
                    text=message,
                )
        except Exception as e:
            log.warning("Email alert failed: %s", e)

    # SMS notification
    if "sms" in channels:
        try:
            from services.notifications import send_sms
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if user and user.get("phone"):
                await send_sms(
                    to=user["phone"],
                    body=message[:160],
                )
        except Exception as e:
            log.warning("SMS alert failed: %s", e)

@router.post("/inventory-alerts/check")
async def check_inventory_alerts(user: dict = Depends(get_current_user)):
    """Manually trigger inventory alert check."""
    triggered = await _check_inventory_alerts(user["id"])
    return {
        "ok": True,
        "triggered": len(triggered),
        "alerts": [{"id": a["id"], "fuel_type": a["fuel_type"], "current_liters": a["current_liters"]} for a in triggered],
    }

@router.get("/inventory-alerts/history")
async def get_alert_history(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    """Get alert history with optional status filter."""
    limit = min(max(limit, 1), 500)
    query = {"user_id": user["id"]}
    if status and status != "all":
        query["status"] = status

    rows = await db.inventory_alerts.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    return {
        "items": rows,
        "ok": True,
        "total": len(rows),
    }

@router.post("/inventory-alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, user: dict = Depends(get_current_user)):
    """Mark an alert as resolved."""
    result = await db.inventory_alerts.update_one(
        {"id": alert_id, "user_id": user["id"]},
        {"$set": {"status": "resolved", "resolved_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"ok": True, "alert_id": alert_id, "status": "resolved"}

@router.delete("/inventory-alerts/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(get_current_user)):
    """Delete an alert."""
    result = await db.inventory_alerts.delete_one(
        {"id": alert_id, "user_id": user["id"]},
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"ok": True, "deleted": alert_id}
