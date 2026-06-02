"""Customer Loyalty + Bulk Import + Fuel Price Alert routes.

Loyalty: a simple punch-card model — customers earn stamps for each fuel-up
above a threshold, and redeem a free fuel-up after N stamps. Anonymous-friendly:
the customer is identified by phone number (no FuelPro account needed).

Bulk import: validates an uploaded JSON array (frontend converts XLSX/CSV to JSON
client-side via the existing `xlsx` dep) and ingests it into the user's sync
collections in a single atomic batch.

Fuel price alert: stores user preferences for EPRA price-change notifications.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import (
    db,
    get_current_user,
    new_id,
    normalize_phone,
    now_iso,
)
from services.shared import validate_collection, write_audit_log

router = APIRouter()


# ---------------------------------------------------------------------------
# Loyalty — punch-card style
# ---------------------------------------------------------------------------
class LoyaltyConfig(BaseModel):
    stamps_required: int = Field(default=10, ge=2, le=50)
    min_purchase_amount: float = Field(default=500.0, ge=0)
    reward_description: str = Field(default="1 free fuel-up", max_length=200)
    currency: str = Field(default="KES", max_length=8)
    enabled: bool = True


class LoyaltyStamp(BaseModel):
    phone: str = Field(min_length=7, max_length=15)
    amount: float = Field(gt=0)
    fuel_type: Optional[str] = None
    note: Optional[str] = None


@router.get("/loyalty/config")
async def loyalty_get_config(user: dict = Depends(get_current_user)):
    cfg = await db.loyalty_config.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cfg:
        cfg = LoyaltyConfig().model_dump()
    else:
        cfg.pop("user_id", None)
    return {"config": cfg, "ok": True}


@router.post("/loyalty/config")
async def loyalty_set_config(body: LoyaltyConfig, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "user_id": user["id"], "updated_at": now_iso()}
    await db.loyalty_config.update_one(
        {"user_id": user["id"]}, {"$set": doc}, upsert=True,
    )
    return {"ok": True, "config": body.model_dump()}


@router.post("/loyalty/stamp")
async def loyalty_add_stamp(body: LoyaltyStamp, user: dict = Depends(get_current_user)):
    """Add a stamp for a customer. Auto-creates the customer record on first stamp."""
    cfg_doc = await db.loyalty_config.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    cfg = LoyaltyConfig(**{k: v for k, v in cfg_doc.items() if k != "user_id"})
    if not cfg.enabled:
        raise HTTPException(status_code=400, detail="Loyalty program is disabled")
    if body.amount < cfg.min_purchase_amount:
        raise HTTPException(status_code=400,
                            detail=f"Purchase below minimum ({cfg.min_purchase_amount})")

    phone = normalize_phone(body.phone)
    customer = await db.loyalty_customers.find_one(
        {"user_id": user["id"], "phone": phone}, {"_id": 0},
    )

    now = now_iso()
    stamp = {
        "id": new_id(), "at": now, "amount": body.amount,
        "fuel_type": body.fuel_type, "note": body.note,
    }

    if not customer:
        customer = {
            "id": new_id(), "user_id": user["id"], "phone": phone,
            "stamps": [stamp], "redemptions": [],
            "lifetime_amount": body.amount,
            "lifetime_redemptions": 0,
            "created_at": now, "updated_at": now,
        }
        await db.loyalty_customers.insert_one(customer)
    else:
        customer["stamps"].append(stamp)
        customer["lifetime_amount"] = customer.get("lifetime_amount", 0) + body.amount
        customer["updated_at"] = now
        await db.loyalty_customers.update_one(
            {"user_id": user["id"], "phone": phone},
            {"$push": {"stamps": stamp},
             "$inc": {"lifetime_amount": body.amount},
             "$set": {"updated_at": now}},
        )

    stamp_count = len(customer["stamps"]) - len(customer.get("redemptions", [])) * cfg.stamps_required
    redeemable = stamp_count >= cfg.stamps_required
    customer.pop("_id", None)
    customer.pop("user_id", None)
    return {
        "ok": True,
        "phone": phone,
        "stamps_total": len(customer["stamps"]),
        "stamps_available": stamp_count,
        "stamps_required": cfg.stamps_required,
        "redeemable": redeemable,
        "reward": cfg.reward_description if redeemable else None,
    }


@router.post("/loyalty/redeem")
async def loyalty_redeem(body: LoyaltyStamp, user: dict = Depends(get_current_user)):
    """Redeem stamps for a reward. Body uses same shape as stamp; amount is ignored."""
    phone = normalize_phone(body.phone)
    cfg_doc = await db.loyalty_config.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    cfg = LoyaltyConfig(**{k: v for k, v in cfg_doc.items() if k != "user_id"})
    customer = await db.loyalty_customers.find_one(
        {"user_id": user["id"], "phone": phone}, {"_id": 0},
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    available = len(customer.get("stamps", [])) - len(customer.get("redemptions", [])) * cfg.stamps_required
    if available < cfg.stamps_required:
        raise HTTPException(status_code=400,
                            detail=f"Not enough stamps ({available}/{cfg.stamps_required})")

    redemption = {"id": new_id(), "at": now_iso(), "reward": cfg.reward_description}
    await db.loyalty_customers.update_one(
        {"user_id": user["id"], "phone": phone},
        {"$push": {"redemptions": redemption},
         "$inc": {"lifetime_redemptions": 1},
         "$set": {"updated_at": now_iso()}},
    )
    await write_audit_log(
        user["id"], "loyalty.redeem",
        meta={"phone": phone, "reward": cfg.reward_description},
    )
    return {"ok": True, "redemption": redemption,
            "stamps_available": available - cfg.stamps_required}


@router.get("/loyalty/customer/{phone}")
async def loyalty_customer(phone: str, user: dict = Depends(get_current_user)):
    p = normalize_phone(phone)
    cfg_doc = await db.loyalty_config.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    cfg = LoyaltyConfig(**{k: v for k, v in cfg_doc.items() if k != "user_id"})
    c = await db.loyalty_customers.find_one(
        {"user_id": user["id"], "phone": p}, {"_id": 0, "user_id": 0},
    )
    if not c:
        return {"found": False, "phone": p,
                "stamps_required": cfg.stamps_required,
                "reward_description": cfg.reward_description}
    available = len(c.get("stamps", [])) - len(c.get("redemptions", [])) * cfg.stamps_required
    return {
        "found": True, "customer": c,
        "stamps_available": available, "stamps_required": cfg.stamps_required,
        "redeemable": available >= cfg.stamps_required,
        "reward_description": cfg.reward_description,
    }


@router.get("/loyalty/customers")
async def loyalty_customers_list(user: dict = Depends(get_current_user), limit: int = 200):
    rows = await db.loyalty_customers.find(
        {"user_id": user["id"]}, {"_id": 0, "user_id": 0},
    ).sort("updated_at", -1).to_list(limit)
    return {"items": rows, "ok": True, "total": len(rows)}


# ---------------------------------------------------------------------------
# Bulk import
# ---------------------------------------------------------------------------
class BulkImportBody(BaseModel):
    items: list[dict[str, Any]] = Field(min_length=1, max_length=10000)
    mode: str = Field(default="append", pattern="^(append|replace)$")


@router.post("/bulk-import/{collection}")
async def bulk_import(collection: str, body: BulkImportBody, user: dict = Depends(get_current_user)):
    validate_collection(collection)

    coll = db[f"sync_{collection}"]
    if body.mode == "replace":
        await coll.delete_many({"user_id": user["id"]})

    docs = []
    for it in body.items:
        if not isinstance(it, dict):
            continue
        docs.append({**it, "id": it.get("id") or new_id(),
                     "user_id": user["id"],
                     "_imported_at": now_iso()})
    if docs:
        await coll.insert_many(docs)
    await write_audit_log(
        user["id"], "bulk_import",
        meta={"collection": collection, "count": len(docs), "mode": body.mode},
    )
    return {"ok": True, "imported": len(docs), "collection": collection, "mode": body.mode}


# ---------------------------------------------------------------------------
# Fuel price alerts
# ---------------------------------------------------------------------------
class PriceAlertPrefs(BaseModel):
    enabled: bool = True
    regions: list[str] = Field(default_factory=lambda: ["nairobi"])
    channels: list[str] = Field(default_factory=lambda: ["email"])
    threshold_kes: float = Field(default=0.5, ge=0.0)  # min change to trigger


@router.get("/price-alerts/prefs")
async def price_alerts_get(user: dict = Depends(get_current_user)):
    doc = await db.price_alerts.find_one({"user_id": user["id"]}, {"_id": 0, "user_id": 0})
    if not doc:
        doc = PriceAlertPrefs().model_dump()
    return {"prefs": doc, "ok": True}


@router.post("/price-alerts/prefs")
async def price_alerts_set(body: PriceAlertPrefs, user: dict = Depends(get_current_user)):
    await db.price_alerts.update_one(
        {"user_id": user["id"]},
        {"$set": {**body.model_dump(), "user_id": user["id"], "updated_at": now_iso()}},
        upsert=True,
    )
    await write_audit_log(user["id"], "price_alerts.updated", meta=body.model_dump())
    return {"ok": True, "prefs": body.model_dump()}


@router.get("/price-alerts/check")
async def price_alerts_check(user: dict = Depends(get_current_user)):
    """Compare the latest EPRA prices to the last cached snapshot for the user.
    Returns any deltas above the user's threshold.
    """
    from services.epra import get_fuel_prices
    prefs_doc = await db.price_alerts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not prefs_doc or not prefs_doc.get("enabled", True):
        return {"ok": True, "alerts": [], "skipped": "disabled"}
    threshold = float(prefs_doc.get("threshold_kes", 0.5))
    regions = prefs_doc.get("regions", ["nairobi"])

    snapshot = await db.price_snapshots.find_one({"user_id": user["id"]}, {"_id": 0})
    prev = snapshot.get("prices", {}) if snapshot else {}

    alerts = []
    fresh: dict[str, Any] = {}
    for region in regions:
        prices = await get_fuel_prices(region)
        per_region = prices.get("prices", {}).get(region, prices.get("prices", {}))
        fresh[region] = per_region
        for fuel_type, new_price in (per_region or {}).items():
            try:
                new_price_f = float(new_price)
            except (TypeError, ValueError):
                continue
            old_price = prev.get(region, {}).get(fuel_type)
            if old_price is None:
                continue
            try:
                delta = new_price_f - float(old_price)
            except (TypeError, ValueError):
                continue
            if abs(delta) >= threshold:
                alerts.append({
                    "region": region, "fuel_type": fuel_type,
                    "old_price": float(old_price), "new_price": new_price_f,
                    "delta": round(delta, 2),
                    "direction": "up" if delta > 0 else "down",
                })

    await db.price_snapshots.update_one(
        {"user_id": user["id"]},
        {"$set": {"user_id": user["id"], "prices": fresh, "captured_at": now_iso()}},
        upsert=True,
    )

    if alerts:
        await write_audit_log(
            user["id"], "price_alert.triggered",
            meta={"alerts": alerts, "count": len(alerts)},
        )

    return {"ok": True, "alerts": alerts,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "threshold_kes": threshold}
