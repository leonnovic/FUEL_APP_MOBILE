"""FastAPI server composition.

Mounts all routers, middleware, startup/shutdown, and M-PESA callback.
FIXES: Graceful shutdown, health probes, event bus wiring.
"""

from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import APIRouter, FastAPI, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware

from core import (
    ALLOWED_COLLECTIONS,
    IS_PRODUCTION,
    PLANS,
    get_db,
    close_db,
    log,
)
from routers import (
    auth, digest, features, founder, founder_ops,
    identity, invites, location, misc, mpesa,
    oauth_extra, payments, push, storage, sync, ws,
    health as health_router,
    analytics, inventory_alerts, shift_management
)
from routers.founder import ensure_founder_seeded
from routers.founder_ops import apply_runtime_config_to_env
from routers.health import watchdog_scheduler
from routers.mpesa import mpesa_stk_callback_handler
from routers.payments import stripe_webhook_handler

# ---------------------------------------------------------------------------
# Startup / Shutdown (using lifespan)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("FuelPro backend starting up...")

    # Initialize database connection with retry
    try:
        database = await get_db()
        # Create indexes
        await database.users.create_index("email", unique=True)
        await database.users.create_index("id", unique=True)
        await database.payment_transactions.create_index("session_id", sparse=True)
        await database.payment_transactions.create_index("checkout_request_id", sparse=True)
        await database.payment_transactions.create_index("user_id")
        await database.subscriptions.create_index("user_id", unique=True)
        await database.audit_log.create_index([("user_id", 1), ("at", -1)])
        await database.invites.create_index("code", unique=True)
        await database.invites.create_index("email")
        await database.password_resets.create_index("email", unique=True)
        await database.ai_reconcile_cache.create_index([("user_id", 1), ("key", 1)], unique=True)
        await database.daily_digests.create_index([("user_id", 1), ("date", -1)])
        await database.password_resets_log.create_index([("ip", 1), ("at", -1)])
        await database.password_resets_log.create_index([("email", 1), ("at", -1)])
        await database.storage_files.create_index([("user_id", 1), ("created_at", -1)])
        await database.storage_files.create_index("key", unique=True)
        await database.identity_links.create_index([("anonymous_id", 1), ("user_id", 1)], unique=True)
        await database.identity_links.create_index("user_id")
        await database.push_subscriptions.create_index("endpoint", unique=True)
        await database.push_subscriptions.create_index("user_id")
        # JWT revocation list with TTL
        await database.token_revocations.create_index(
            [("expires_at", 1)],
            expireAfterSeconds=0,
            background=True
        )
        await database.invites.create_index(
            [("email", 1), ("status", 1)],
            unique=True,
            partialFilterExpression={"status": "pending"},
        )
        for c in ALLOWED_COLLECTIONS:
            await database[f"sync_{c}"].create_index("user_id")

        # NEW ROUTER INDEXES
        await database.inventory_alerts.create_index("user_id")
        await database.inventory_alerts.create_index([("user_id", 1), ("fuel_type", 1)])
        await database.shifts.create_index("user_id")
        await database.shifts.create_index([("user_id", 1), ("status", 1)])

        log.info("Database indexes created successfully")
    except Exception as e:
        log.error("Database initialization failed: %s", e)
        raise

    # Background tasks
    if os.environ.get("DIGEST_ENABLED", "1") == "1":
        from services.digest import digest_scheduler
        app.state.digest_task = asyncio.create_task(digest_scheduler(database))

    if os.environ.get("WATCHDOG_ENABLED", "1") == "1":
        app.state.watchdog_task = asyncio.create_task(watchdog_scheduler())

    try:
        await ensure_founder_seeded()
    except Exception as e:
        log.warning("Founder seed failed: %s", e)

    try:
        await apply_runtime_config_to_env()
    except Exception as e:
        log.warning("Runtime config apply failed: %s", e)

    yield

    log.info("FuelPro backend shutting down...")
    # Graceful shutdown
    for attr in ("digest_task", "watchdog_task"):
        task = getattr(app.state, attr, None)
        if task and not task.done():
            task.cancel()

    await asyncio.sleep(1)
    await close_db()
    log.info("Shutdown complete.")

# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------
app = FastAPI(title="FuelPro Backend", lifespan=lifespan)
api = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Root + health
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
        database = await get_db()
        await database.command("ping")
        mongo_ok = True
    except Exception as e:
        mongo_ok = False
        log.error("Mongo ping failed: %s", e)
    return {"ok": True, "mongo": mongo_ok}


@api.get("/version")
async def version():
    return {
        "api_version": "v1",
        "service": "FuelPro Backend",
        "ts": datetime.now(timezone.utc).isoformat(),
        "build": os.environ.get("RENDER_GIT_COMMIT", "local")[:8],
    }

# ---------------------------------------------------------------------------
# Compose routers
# ---------------------------------------------------------------------------
api.include_router(auth.router)
api.include_router(oauth_extra.router)
api.include_router(payments.router)
api.include_router(mpesa.router)
api.include_router(sync.router)
api.include_router(storage.router)
api.include_router(push.router)
api.include_router(ws.router)
api.include_router(invites.router)
api.include_router(identity.router)
api.include_router(digest.router)
api.include_router(founder.router)
api.include_router(founder_ops.router)
api.include_router(health_router.router)
api.include_router(features.router)
api.include_router(location.router)
api.include_router(misc.router)

# NEW ROUTERS
api.include_router(inventory_alerts.router)
api.include_router(shift_management.router)
api.include_router(analytics.router)

app.include_router(api)

# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------
@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    return await stripe_webhook_handler(request)


@app.post("/api/mpesa/stk-callback")
async def mpesa_stk_callback(request: Request):
    return await mpesa_stk_callback_handler(request)

# ---------------------------------------------------------------------------
# Catch-all
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
# Production-safe CORS
if IS_PRODUCTION:
    allowed_origins = [
        origin.strip() for origin in 
        os.environ.get("CORS_ORIGINS", "https://fuel-app-mobile.vercel.app").split(",")
        if origin.strip() and origin.strip() != "*"
    ]
    allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    allowed_headers = [
        "Authorization", "Content-Type", "X-Station-ID",
        "X-Request-ID", "X-App-Version", "Accept",
        "X-Timestamp", "X-Signature", "X-CSRF-Token"
    ]
    expose_headers = ["X-Request-ID", "X-RateLimit-Remaining"]
    max_age = 600
else:
    allowed_origins = [
        "https://fuel-app-mobile.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "capacitor://localhost",
        "http://localhost",
    ]
    allowed_methods = ["*"]
    allowed_headers = ["*"]
    expose_headers = ["*"]
    max_age = 3600

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
    expose_headers=expose_headers,
    max_age=max_age,
)

from middleware import AuthRateLimitMiddleware, RequestIDMiddleware, SecurityHeadersMiddleware
app.add_middleware(AuthRateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)
