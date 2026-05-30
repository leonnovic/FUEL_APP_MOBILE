"""FastAPI server composition.

Mounts all routers, middleware, startup/shutdown, and M-PESA callback.
FIXES: Graceful shutdown, health probes, event bus wiring.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import get_db, log
from middleware import AuthRateLimit, SecurityHeaders
from routers.auth import router as auth_router
from routers.payments import router as payments_router
from routers.mpesa import mpesa_stk_callback_handler, router as mpesa_router
from routers.sync import router as sync_router
from routers.storage import router as storage_router
from routers.push import router as push_router
from routers.ws import router as ws_router
from routers.invites import router as invites_router
from routers.identity import router as identity_router
from routers.digest import router as digest_router
from routers.founder import router as founder_router
from routers.founder_ops import router as founder_ops_router
from routers.health import router as health_router
from routers.features import router as features_router
from routers.misc import router as misc_router
from routers.oauth_extra import router as oauth_extra_router

# NEW ROUTERS
from routers.inventory_alerts import router as inventory_alerts_router
from routers.shift_management import router as shift_router
from routers.analytics import router as analytics_router

# ---------------------------------------------------------------------------
# Startup / Shutdown
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
        await database.user_data.create_index("user_id", unique=True)
        await database.audit_log.create_index("user_id")
        await database.audit_log.create_index("at")
        await database.password_resets.create_index("email", unique=True)
        await database.password_resets_log.create_index("at")
        await database.payment_transactions.create_index("user_id")
        await database.payment_transactions.create_index("checkout_request_id")
        await database.subscriptions.create_index("user_id", unique=True)
        await database.inventory_alerts.create_index("user_id")
        await database.inventory_alerts.create_index([("user_id", 1), ("fuel_type", 1)])
        await database.shifts.create_index("user_id")
        await database.shifts.create_index([("user_id", 1), ("status", 1)])

        log.info("Database indexes created successfully")
    except Exception as e:
        log.error("Database initialization failed: %s", e)
        raise

    yield

    log.info("FuelPro backend shutting down...")
    # Graceful shutdown: wait for in-flight requests
    await asyncio.sleep(1)
    log.info("Shutdown complete.")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="FuelPro API",
    version="1.0.0",
    docs_url="/docs" if __import__("os").environ.get("APP_ENV") != "production" else None,
    redoc_url="/redoc" if __import__("os").environ.get("APP_ENV") != "production" else None,
    lifespan=lifespan,
)

# CORS - restrict in production
origins = [
    "https://fuel-app-mobile.vercel.app",
    "https://fuelpro.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "capacitor://localhost",
    "http://localhost",
]

if __import__("os").environ.get("APP_ENV") == "development":
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(SecurityHeaders)
app.add_middleware(AuthRateLimit)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
routers = [
    (auth_router, "/api"),
    (payments_router, "/api"),
    (mpesa_router, "/api"),
    (sync_router, "/api"),
    (storage_router, "/api"),
    (push_router, "/api"),
    (ws_router, "/api"),
    (invites_router, "/api"),
    (identity_router, "/api"),
    (digest_router, "/api"),
    (founder_router, "/api"),
    (founder_ops_router, "/api"),
    (health_router, "/api"),
    (features_router, "/api"),
    (misc_router, "/api"),
    (oauth_extra_router, "/api"),
    # NEW ROUTERS
    (inventory_alerts_router, "/api"),
    (shift_router, "/api"),
    (analytics_router, "/api"),
]

for router, prefix in routers:
    app.include_router(router, prefix=prefix)

# M-PESA callback (mounted directly, no auth)
app.post("/api/mpesa/stk-callback")(mpesa_stk_callback_handler)

# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "service": "FuelPro API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
