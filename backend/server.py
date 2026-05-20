"""FuelPro Backend — production-grade application composition.

This module wires the FastAPI app, registers routers from `routers/`, configures
middleware, runs startup tasks (indexes, founder seed, digest scheduler) and
keeps a catch-all that 404s unknown /api routes in production.

Per-feature endpoints live in dedicated router modules under `routers/` to
keep this file small and readable. Shared primitives (config, db, models,
helpers) live in `core.py`.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone

from fastapi import APIRouter, FastAPI, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware

from core import (
    ALLOWED_COLLECTIONS,
    IS_PRODUCTION,
    PLANS,
    client,
    db,
    log,
)
from routers import auth, digest, features, founder, founder_ops, invites, misc, mpesa, payments, sync
from routers.founder import ensure_founder_seeded
from routers.founder_ops import apply_runtime_config_to_env
from routers.mpesa import mpesa_stk_callback_handler
from routers.payments import stripe_webhook_handler

app = FastAPI(title="FuelPro Backend")
api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Root + health (kept here so the prefix is plain `/api/` not nested)
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {
        "ok": True,
        "service": "FuelPro Backend",
        "ts": datetime.now(timezone.utc).isoformat(),
        "plans": list(PLANS.keys()),
    }


@api.get("/health")
async def health():
    try:
        await db.command("ping")
        mongo_ok = True
    except Exception as e:
        mongo_ok = False
        log.error("Mongo ping failed: %s", e)
    return {"ok": True, "mongo": mongo_ok}


# ---------------------------------------------------------------------------
# Compose routers under the /api prefix
# ---------------------------------------------------------------------------
api.include_router(auth.router)
api.include_router(payments.router)
api.include_router(mpesa.router)
api.include_router(sync.router)
api.include_router(invites.router)
api.include_router(digest.router)
api.include_router(founder.router)
api.include_router(founder_ops.router)
api.include_router(features.router)
api.include_router(misc.router)

app.include_router(api)


# ---------------------------------------------------------------------------
# Webhooks (mounted directly on app — kept exactly at their original paths
# so external services keep working without redeploys)
# ---------------------------------------------------------------------------
@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    return await stripe_webhook_handler(request)


@app.post("/api/mpesa/stk-callback")
async def mpesa_stk_callback(request: Request):
    return await mpesa_stk_callback_handler(request)


# ---------------------------------------------------------------------------
# Catch-all (must be registered AFTER specific handlers).
# In production, unknown /api routes 404 loudly. In dev, they return safe stubs.
# ---------------------------------------------------------------------------
@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def api_fallback(full_path: str, request: Request):
    if IS_PRODUCTION:
        raise HTTPException(status_code=404, detail=f"Unknown API route: /api/{full_path}")
    log.info("Unhandled %s /api/%s → safe stub (non-prod)", request.method, full_path)
    if request.method == "GET":
        return {"ok": True, "items": [], "stub": True, "path": full_path}
    return {"ok": True, "stub": True, "path": full_path}


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.payment_transactions.create_index("session_id", sparse=True)
        await db.payment_transactions.create_index("checkout_request_id", sparse=True)
        await db.payment_transactions.create_index("user_id")
        await db.subscriptions.create_index("user_id", unique=True)
        await db.audit_log.create_index([("user_id", 1), ("at", -1)])
        await db.invites.create_index("code", unique=True)
        await db.invites.create_index("email")
        await db.password_resets.create_index("email", unique=True)
        await db.ai_reconcile_cache.create_index([("user_id", 1), ("key", 1)], unique=True)
        await db.daily_digests.create_index([("user_id", 1), ("date", -1)])
        await db.password_resets_log.create_index([("ip", 1), ("at", -1)])
        await db.password_resets_log.create_index([("email", 1), ("at", -1)])
        await db.invites.create_index(
            [("email", 1), ("status", 1)],
            unique=True,
            partialFilterExpression={"status": "pending"},
        )
        for c in ALLOWED_COLLECTIONS:
            await db[f"sync_{c}"].create_index("user_id")
        log.info("MongoDB indexes ready")
    except Exception as e:
        log.warning("Index creation issue: %s", e)

    if os.environ.get("DIGEST_ENABLED", "1") == "1":
        from services.digest import digest_scheduler
        app.state.digest_task = asyncio.create_task(digest_scheduler(db))

    try:
        await ensure_founder_seeded()
    except Exception as e:
        log.warning("Founder seed failed: %s", e)

    # Apply any runtime integration keys the founder previously stored
    # (Resend, Twilio, Stripe, Daraja) so services pick them up immediately.
    try:
        await apply_runtime_config_to_env()
    except Exception as e:
        log.warning("Runtime config apply failed: %s", e)


@app.on_event("shutdown")
async def shutdown():
    task = getattr(app.state, "digest_task", None)
    if task and not task.done():
        task.cancel()
    client.close()
