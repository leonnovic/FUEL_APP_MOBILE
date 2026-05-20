"""Cloud sync: per-user blob (user-data), generic CRUD per collection, EPRA prices, audit-log."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from core import (
    ALLOWED_COLLECTIONS,
    db,
    get_current_user,
    get_current_user_optional,
    new_id,
    now_iso,
    scoped_user_id,
)

router = APIRouter()


@router.get("/user-data")
async def get_user_data(
    request: Request,
    user: Optional[dict] = Depends(get_current_user_optional),
    x_user_id: Optional[str] = Header(default=None),
):
    uid = await scoped_user_id(request, user, x_user_id)
    doc = await db.user_data.find_one({"user_id": uid}, {"_id": 0})
    return doc or {"user_id": uid, "data": None, "updated_at": None}


@router.post("/user-data")
async def save_user_data(
    request: Request,
    user: Optional[dict] = Depends(get_current_user_optional),
    x_user_id: Optional[str] = Header(default=None),
):
    uid = await scoped_user_id(request, user, x_user_id)
    body = await request.json()
    data = body["data"] if isinstance(body, dict) and "data" in body else body
    now = now_iso()
    await db.user_data.update_one(
        {"user_id": uid},
        {"$set": {"user_id": uid, "data": data, "updated_at": now}},
        upsert=True,
    )
    return {"ok": True, "updated_at": now}


@router.get("/sync/{collection}")
async def sync_get(collection: str, user: dict = Depends(get_current_user)):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Unknown collection")
    rows = await db[f"sync_{collection}"].find({"user_id": user["id"]}, {"_id": 0}).to_list(5000)
    return {"items": rows, "ok": True, "collection": collection}


@router.post("/sync/{collection}")
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


@router.get("/fuel-prices/current")
async def fuel_prices(region: str = "nairobi"):
    """Live EPRA Kenya fuel prices (RSS-backed, curated fallback)."""
    from services.epra import get_fuel_prices
    return await get_fuel_prices(region)


@router.get("/audit-log")
async def audit_log_list(user: dict = Depends(get_current_user), limit: int = 200):
    rows = await db.audit_log.find({"user_id": user["id"]}, {"_id": 0}).sort("at", -1).to_list(limit)
    return {"items": rows, "ok": True}


@router.post("/audit-log")
async def audit_log_add(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "action": body.get("action", "unknown"),
        "at": now_iso(),
        "meta": body.get("meta", {}),
    }
    await db.audit_log.insert_one(doc)
    return {"ok": True, "id": doc["id"]}
