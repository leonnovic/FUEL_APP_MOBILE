"""FuelPro Backend — minimal cloud-sync + graceful stubs.

Why this file exists:
The original FuelPro front-end (ported from a Hono/tRPC stack) makes calls to
several /api/* endpoints for cloud sync, payroll, communication, documents,
M-PESA, fuel prices, etc. None of those were running on this Emergent
deployment, so the browser console was filling up with 404 noise and some
features (like Cloud Sync) silently broke.

This module provides:
  • /api/user-data  — real cloud sync persisted to MongoDB (per-user blob)
  • Safe defaults for every other /api/* the client touches so the app
    degrades gracefully instead of throwing.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Header, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="FuelPro Backend")
api = APIRouter(prefix="/api")


def _user_id(request: Request, x_user_id: str | None) -> str:
    """Resolve a stable per-user key from headers / cookies / query."""
    return (
        x_user_id
        or request.headers.get("x-user-id")
        or request.query_params.get("user_id")
        or request.cookies.get("fuelpro_user_id")
        or "anonymous"
    )


# ---------------------------------------------------------------------------
# Status (kept from the bootstrap server)
# ---------------------------------------------------------------------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api.get("/")
async def root():
    return {"message": "FuelPro API", "ok": True, "ts": datetime.now(timezone.utc).isoformat()}


@api.post("/status", response_model=StatusCheck)
async def create_status_check(payload: StatusCheckCreate):
    obj = StatusCheck(**payload.model_dump())
    doc = obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return obj


@api.get("/status", response_model=list[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get("timestamp"), str):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])
    return rows


# ---------------------------------------------------------------------------
# Cloud sync — user-data blob (the main one the UI hits)
# ---------------------------------------------------------------------------
@api.get("/user-data")
async def get_user_data(request: Request, x_user_id: str | None = Header(default=None)):
    uid = _user_id(request, x_user_id)
    doc = await db.user_data.find_one({"user_id": uid}, {"_id": 0})
    if not doc:
        return {"user_id": uid, "data": None, "updated_at": None}
    return doc


@api.post("/user-data")
async def save_user_data(
    request: Request,
    x_user_id: str | None = Header(default=None),
):
    uid = _user_id(request, x_user_id)
    try:
        body = await request.json()
    except Exception as e:  # malformed body
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    doc = {
        "user_id": uid,
        "data": body if not isinstance(body, dict) or "data" not in body else body["data"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.user_data.update_one({"user_id": uid}, {"$set": doc}, upsert=True)
    return {"ok": True, "updated_at": doc["updated_at"]}


@api.delete("/user-data")
async def delete_user_data(request: Request, x_user_id: str | None = Header(default=None)):
    uid = _user_id(request, x_user_id)
    await db.user_data.delete_one({"user_id": uid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Generic graceful-stub helpers
# ---------------------------------------------------------------------------
def _empty_list() -> dict[str, Any]:
    return {"items": [], "ok": True}


def _accepted() -> dict[str, Any]:
    return {"ok": True, "accepted": True}


# Communication
@api.get("/communication/contacts")
async def comm_contacts(): return {"contacts": [], "ok": True}


@api.post("/communication/contacts")
async def comm_contacts_create(request: Request):
    body = await request.json()
    return {"ok": True, "contact": {**body, "id": str(uuid.uuid4())}}


@api.get("/communication/messages")
async def comm_messages(): return {"messages": [], "ok": True}


@api.post("/communication/send-message")
async def comm_send(request: Request):
    body = await request.json()
    # NOTE: real SMS/WhatsApp send is MOCKED — returns success without dispatching
    return {"ok": True, "status": "queued_local", "id": str(uuid.uuid4()), "echo": body}


@api.get("/communication/templates")
async def comm_templates(): return {"templates": [], "ok": True}


@api.post("/communication/templates")
async def comm_templates_create(request: Request):
    body = await request.json()
    return {"ok": True, "template": {**body, "id": str(uuid.uuid4())}}


# Documents
@api.get("/documents")
async def docs_list(): return {"documents": [], "ok": True}


@api.get("/documents/folders")
async def docs_folders(): return {"folders": [], "ok": True}


@api.post("/documents/upload")
async def docs_upload(): return {"ok": True, "uploaded": False, "note": "upload pipeline not configured on this deployment"}


@api.post("/documents/organize-all")
async def docs_organize(): return _accepted()


# Fuel prices
@api.get("/fuel-prices/current")
async def fuel_prices():
    # Returns null so the front-end falls back to its local EPRA table
    return {"ok": True, "prices": None, "source": "fallback"}


# Live transactions
@api.get("/live-transactions")
async def live_tx(): return {"transactions": [], "ok": True}


# M-PESA (sandbox stubs)
@api.post("/mpesa/stk-push")
async def mpesa_stk(request: Request):
    body = await request.json()
    # MOCKED — no real Daraja credentials configured. Returns a synthetic CheckoutRequestID.
    return {
        "ok": True,
        "MerchantRequestID": str(uuid.uuid4()),
        "CheckoutRequestID": f"ws_CO_{uuid.uuid4().hex[:14]}",
        "ResponseCode": "0",
        "ResponseDescription": "Success (mock). Configure DARAJA_* env to enable real STK push.",
        "CustomerMessage": "Mock STK push accepted",
        "echo": body,
    }


@api.post("/mpesa/callback")
async def mpesa_callback(request: Request):
    body = await request.json()
    await db.mpesa_callbacks.insert_one({"at": datetime.now(timezone.utc).isoformat(), "body": body})
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


@api.get("/mpesa/query/{checkout_id}")
async def mpesa_query(checkout_id: str):
    return {"ok": True, "CheckoutRequestID": checkout_id, "ResultCode": "1032", "ResultDesc": "Pending (mock)"}


# Payment sources
@api.get("/payment-sources")
async def payment_sources(): return {"sources": [], "ok": True}


@api.post("/payment-sources")
async def payment_sources_create(request: Request):
    body = await request.json()
    return {"ok": True, "source": {**body, "id": str(uuid.uuid4())}}


# Payroll
@api.get("/payroll/employees")
async def payroll_employees(): return {"employees": [], "ok": True}


@api.get("/payroll/settings")
async def payroll_settings(): return {"settings": {}, "ok": True}


@api.post("/payroll/bulk-update-nssf")
async def payroll_nssf(): return _accepted()


@api.post("/payroll/bulk-update-sha")
async def payroll_sha(): return _accepted()


@api.post("/payroll/export-combined")
async def payroll_export_combined(): return _accepted()


@api.post("/payroll/export-cpc")
async def payroll_export_cpc(): return _accepted()


# Chat / OAuth / tRPC catch-all (the front-end probes these)
@api.post("/chat")
async def chat(request: Request):
    body = await request.json()
    return {"ok": True, "reply": "AI assistant not configured on this deployment.", "echo": body}


@api.get("/oauth/authorize")
async def oauth_auth(): return {"ok": False, "error": "oauth_not_configured"}


@api.get("/oauth/callback")
async def oauth_cb(): return {"ok": False, "error": "oauth_not_configured"}


app.include_router(api)


# Catch-all for unknown /api/* routes so we never 404 the front-end again.
# MUST be registered AFTER `app.include_router(api)` so specific handlers win.
@app.api_route("/api/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def api_fallback(full_path: str, request: Request):
    logger = logging.getLogger("fuelpro")
    logger.info("Unhandled %s /api/%s — returning safe stub", request.method, full_path)
    if request.method == "GET":
        return {"ok": True, "items": [], "stub": True, "path": full_path}
    return {"ok": True, "stub": True, "path": full_path}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
