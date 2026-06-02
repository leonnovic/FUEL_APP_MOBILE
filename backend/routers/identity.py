"""Anonymous → authenticated identity stitching.

When a user signs in, any per-device anonymous activity (sync_* collections,
user_data blob, audit_log entries keyed by the `x-user-id` anonymous id) is
merged into the now-authenticated profile. Privacy-safe: we only stitch
on EXPLICIT signal from the client — the frontend posts the anonymous_id to
`/api/identity/link` immediately after a successful login/register.

Every merge is recorded in `db.identity_links` for the Founder Stats dashboard
(Identity Match Rate KPI).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from core import (
    ALLOWED_COLLECTIONS,
    db,
    get_current_user,
    log,
    new_id,
    now_iso,
    require_founder,
)
from services.shared import write_audit_log

router = APIRouter()


class LinkBody(BaseModel):
    anonymous_id: str = Field(min_length=4, max_length=128)


async def _merge_user_data(anon_id: str, user_id: str, counts: dict[str, Any]) -> None:
    """Move the anonymous `user_data` blob over — only if the authenticated user
    doesn't already have one (we never silently overwrite user data)."""
    anon_blob = await db.user_data.find_one({"user_id": anon_id}, {"_id": 0})
    if not anon_blob:
        return
    user_blob = await db.user_data.find_one({"user_id": user_id}, {"_id": 0})
    if user_blob:
        counts["user_data"] = "kept_authenticated_copy"
        return
    await db.user_data.update_one(
        {"user_id": anon_id},
        {"$set": {"user_id": user_id, "merged_from": anon_id, "merged_at": now_iso()}},
    )
    counts["user_data"] = "moved"


async def _merge_sync_collections(anon_id: str, user_id: str, counts: dict[str, Any]) -> None:
    """Re-key every row in every sync_* collection from anonymous → authenticated."""
    for c in ALLOWED_COLLECTIONS:
        moved = await db[f"sync_{c}"].update_many(
            {"user_id": anon_id}, {"$set": {"user_id": user_id}},
        )
        if moved.modified_count:
            counts[f"sync_{c}"] = moved.modified_count


async def _merge_simple_collection(coll_name: str, anon_id: str, user_id: str,
                                   counts: dict[str, Any], count_key: str) -> None:
    """Re-key rows in a single top-level collection. Used for audit_log and
    storage_files where there's no per-collection projection — just `user_id`."""
    moved = await db[coll_name].update_many(
        {"user_id": anon_id}, {"$set": {"user_id": user_id}},
    )
    if moved.modified_count:
        counts[count_key] = moved.modified_count


@router.post("/identity/link")
async def link_anonymous(body: LinkBody, user: dict = Depends(get_current_user)):
    """Move all activity keyed by `anonymous_id` over to the authenticated
    user. Idempotent — if the anonymous_id was already merged, returns the
    prior link record without re-running."""
    anon_id = body.anonymous_id.strip()
    if anon_id == user["id"]:
        return {"ok": True, "noop": True, "reason": "anonymous_id == user_id"}

    existing = await db.identity_links.find_one(
        {"anonymous_id": anon_id, "user_id": user["id"]}, {"_id": 0},
    )
    if existing:
        return {"ok": True, "noop": True, "merged_at": existing.get("merged_at")}

    counts: dict[str, Any] = {}
    await _merge_user_data(anon_id, user["id"], counts)
    await _merge_sync_collections(anon_id, user["id"], counts)
    await _merge_simple_collection("audit_log", anon_id, user["id"], counts, "audit_log")
    await _merge_simple_collection("storage_files", anon_id, user["id"], counts, "storage_files")

    merged_at = now_iso()
    await db.identity_links.insert_one({
        "id": new_id(), "anonymous_id": anon_id, "user_id": user["id"],
        "merged_at": merged_at, "counts": counts,
    })
    await write_audit_log(
        user["id"], "identity.link",
        meta={"anonymous_id": anon_id, "counts": counts},
    )
    log.info("Identity link: anon=%s → user=%s counts=%s", anon_id, user["id"], counts)
    return {"ok": True, "merged_at": merged_at, "counts": counts}


@router.get("/founder/identity-stats")
async def identity_stats(_=Depends(require_founder)):
    """Founder dashboard KPI: Identity Match Rate over the last 30 days.

    Computed as:
      total_users — count(users)
      merged_users — count(distinct user_id in identity_links)
      match_rate — merged_users / max(1, total_users)
    """
    total_users = await db.users.estimated_document_count()
    merged_user_ids = await db.identity_links.distinct("user_id")
    merged_users = len(merged_user_ids)
    total_links = await db.identity_links.estimated_document_count()
    total_anon = await db.user_data.count_documents({
        "user_id": {"$not": {"$regex": "^[0-9a-f]{8}-"}},  # uuid4 pattern
    })
    # Active devices (open WS sockets)
    try:
        from routers.ws import _connections
        active_devices = sum(len(s) for s in _connections.values())
        users_with_devices = len(_connections)
    except Exception:
        active_devices = 0
        users_with_devices = 0
    match_rate = round(100 * merged_users / max(1, total_users), 2)
    return {
        "ok": True,
        "total_users": total_users,
        "merged_users": merged_users,
        "total_links": total_links,
        "match_rate_pct": match_rate,
        "anonymous_blobs": total_anon,
        "live_devices": active_devices,
        "live_users": users_with_devices,
        "ts": now_iso(),
    }


@router.get("/founder/identity-stats/trend")
async def identity_stats_trend(_=Depends(require_founder), days: int = 30):
    """Daily counts of identity-link merges for the last N days. Used by the
    Founder Stats sparkline to visualise stitch-rate over time."""
    from datetime import datetime, timedelta, timezone
    days = max(1, min(days, 365))
    end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days - 1)
    pipeline = [
        {"$match": {"merged_at": {"$gte": start.isoformat()}}},
        {"$project": {
            "day": {"$substr": ["$merged_at", 0, 10]},
        }},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
    ]
    raw = {r["_id"]: r["count"] async for r in db.identity_links.aggregate(pipeline)}
    series: list[dict[str, Any]] = []
    cursor = start
    while cursor <= end:
        key = cursor.strftime("%Y-%m-%d")
        series.append({"date": key, "count": raw.get(key, 0)})
        cursor += timedelta(days=1)
    return {"ok": True, "days": days, "series": series,
            "total": sum(p["count"] for p in series)}


@router.get("/identity/me/devices")
async def my_devices(user: dict = Depends(get_current_user)):
    """Return live WS device count for the current user."""
    try:
        from routers.ws import _connections
        sockets = _connections.get(user["id"], set())
        return {"ok": True, "count": len(sockets), "user_id": user["id"]}
    except Exception:
        return {"ok": True, "count": 0, "user_id": user["id"]}


# Public status — for UptimeRobot / external monitors. No auth, no PII.
@router.get("/status")
async def public_status():
    """Lightweight health endpoint for external uptime monitors."""
    try:
        await db.command("ping")
        mongo_ok = True
    except Exception:
        mongo_ok = False
    return {
        "ok": mongo_ok,
        "service": "FuelPro",
        "status": "operational" if mongo_ok else "degraded",
        "ts": now_iso(),
    }
