"""Daily digest endpoints + AI M-PESA reconciliation (with cache)."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core import db, get_current_user, new_id, now_iso

router = APIRouter()


class ReconcileBody(BaseModel):
    inflows: list[dict[str, Any]]
    sales: list[dict[str, Any]]


def _reconcile_cache_key(inflows: list[dict], sales: list[dict]) -> str:
    payload = json.dumps(
        {"i": [(i.get("receipt"), i.get("paidIn") or i.get("amount"),
                 i.get("date"), i.get("time")) for i in inflows],
         "s": [(s.get("id"), s.get("amount") or s.get("total"),
                 s.get("date"), s.get("time"), s.get("fuel_type") or s.get("fuelType"))
                for s in sales]},
        sort_keys=True, default=str,
    ).encode()
    return hashlib.sha256(payload).hexdigest()


@router.post("/ai/reconcile-mpesa")
async def ai_reconcile(body: ReconcileBody, user: dict = Depends(get_current_user)):
    from services.ai import reconcile_mpesa_with_sales
    cache_key = _reconcile_cache_key(body.inflows, body.sales)
    cached = await db.ai_reconcile_cache.find_one(
        {"user_id": user["id"], "key": cache_key}, {"_id": 0},
    )
    if cached and cached.get("result", {}).get("ok"):
        return {**cached["result"], "cached": True}

    result = await reconcile_mpesa_with_sales(body.inflows, body.sales)

    if result.get("ok"):
        await db.ai_reconcile_cache.update_one(
            {"user_id": user["id"], "key": cache_key},
            {"$set": {
                "user_id": user["id"], "key": cache_key, "result": result,
                "created_at": now_iso(),
            }},
            upsert=True,
        )

    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user["id"], "action": "ai.reconcile_mpesa",
        "at": now_iso(),
        "meta": {"inflows": len(body.inflows), "sales": len(body.sales),
                  "matched": len(result.get("matches", [])) if result.get("ok") else 0,
                  "cached": False},
    })
    return result


@router.post("/digest/preview")
async def digest_preview(user: dict = Depends(get_current_user), date: Optional[str] = None):
    from services.digest import build_digest_for_user, render_digest_html
    d = await build_digest_for_user(db, user, override_date=date)
    return {"ok": True, "digest": d, "html": render_digest_html(d)}


@router.post("/digest/send")
async def digest_send_now(user: dict = Depends(get_current_user), date: Optional[str] = None):
    from services.digest import send_digest_to_user
    return await send_digest_to_user(db, user, override_date=date)


@router.get("/digest/history")
async def digest_history(user: dict = Depends(get_current_user), limit: int = 14):
    rows = await db.daily_digests.find(
        {"user_id": user["id"]}, {"_id": 0},
    ).sort("date", -1).to_list(limit)
    return {"items": rows, "ok": True}
