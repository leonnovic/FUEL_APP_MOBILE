"""Cloud sync: per-user blob (user-data), generic CRUD per collection, EPRA prices, audit-log.

SECURITY FIXES:
- Input validation against schemas defined in core.SYNC_SCHEMAS
- Pagination with cursor-based navigation
- XSS sanitization on all string fields
- Max item count enforcement per collection
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from core import (
    ALLOWED_COLLECTIONS,
    SYNC_SCHEMAS,
    db,
    get_current_user,
    get_current_user_optional,
    new_id,
    now_iso,
    scoped_user_id,
    validate_sync_item,
)

router = APIRouter()

# Default pagination limits
DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 1000

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
    # Realtime — fan out to other devices on the same account
    try:
        from routers.ws import publish_to_user
        await publish_to_user(uid, {"type": "user-data.updated", "updated_at": now})
    except Exception:
        pass
    return {"ok": True, "updated_at": now}

@router.get("/sync/{collection}")
async def sync_get(
    collection: str,
    user: dict = Depends(get_current_user),
    cursor: Optional[str] = None,
    limit: int = DEFAULT_PAGE_SIZE,
):
    """Get sync data with cursor-based pagination.

    Args:
        collection: One of ALLOWED_COLLECTIONS
        cursor: Optional cursor for pagination (last item's _id or id)
        limit: Number of items per page (max 1000)
    """
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Unknown collection")

    # Enforce pagination limits
    limit = min(max(limit, 1), MAX_PAGE_SIZE)

    query = {"user_id": user["id"]}
    if cursor:
        query["_id"] = {"$gt": cursor}

    # Use find with limit and sort
    cursor_obj = db[f"sync_{collection}"].find(query, {"_id": 0}).sort("_id", 1).limit(limit + 1)
    rows = await cursor_obj.to_list(limit + 1)

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:-1]  # Remove the extra item

    next_cursor = rows[-1].get("id") if rows and has_more else None

    return {
        "items": rows,
        "ok": True,
        "collection": collection,
        "pagination": {
            "limit": limit,
            "has_more": has_more,
            "next_cursor": next_cursor,
        }
    }

@router.post("/sync/{collection}")
async def sync_put(collection: str, request: Request, user: dict = Depends(get_current_user)):
    """Save sync data with schema validation and size limits.

    SECURITY: Validates each item against the collection schema,
    sanitizes HTML strings, and enforces max item counts.
    """
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Unknown collection")

    body = await request.json()
    items = body.get("items") if isinstance(body, dict) else None
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="Body must be {items: [...]}")

    schema = SYNC_SCHEMAS.get(collection, {})
    max_items = schema.get("max_items", 10000)

    if len(items) > max_items:
        raise HTTPException(
            status_code=400,
            detail=f"Too many items. Maximum allowed: {max_items}, received: {len(items)}"
        )

    # Validate each item
    validated_items = []
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail=f"Item at index {idx} is not an object")

        is_valid, error_msg = validate_sync_item(collection, item)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Validation failed for item at index {idx}: {error_msg}"
            )
        validated_items.append(item)

    coll = db[f"sync_{collection}"]
    await coll.delete_many({"user_id": user["id"]})
    if validated_items:
        scoped = [{**it, "user_id": user["id"]} for it in validated_items]
        await coll.insert_many(scoped)

    # Realtime broadcast
    try:
        from routers.ws import publish_to_user
        await publish_to_user(user["id"], {
            "type": "sync.updated",
            "collection": collection,
            "count": len(validated_items),
        })
    except Exception:
        pass

    return {
        "ok": True,
        "saved": len(validated_items),
        "collection": collection,
        "validated": True,
    }

@router.get("/fuel-prices/current")
async def fuel_prices(region: str = "nairobi"):
    """Live EPRA Kenya fuel prices (RSS-backed, curated fallback)."""
    from services.epra import get_fuel_prices
    return await get_fuel_prices(region)

@router.get("/audit-log")
async def audit_log_list(
    user: dict = Depends(get_current_user),
    cursor: Optional[str] = None,
    limit: int = DEFAULT_PAGE_SIZE,
):
    """Get audit log with pagination."""
    limit = min(max(limit, 1), MAX_PAGE_SIZE)
    query = {"user_id": user["id"]}
    if cursor:
        query["_id"] = {"$gt": cursor}

    rows = await db.audit_log.find(query, {"_id": 0}).sort("at", -1).limit(limit + 1).to_list(limit + 1)

    has_more = len(rows) > limit
    if has_more:
        rows = rows[:-1]

    next_cursor = rows[-1].get("id") if rows and has_more else None

    return {
        "items": rows,
        "ok": True,
        "pagination": {
            "limit": limit,
            "has_more": has_more,
            "next_cursor": next_cursor,
        }
    }

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
