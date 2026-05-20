"""Misc graceful stubs for endpoints the frontend touches but aren't yet built out.

Kept separate from feature routers so deletion is easy when each is implemented properly.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from core import db, get_current_user, new_id

router = APIRouter()


@router.get("/communication/contacts")
async def comm_contacts(): return {"contacts": [], "ok": True}


@router.post("/communication/contacts")
async def comm_contacts_create(request: Request):
    return {"ok": True, "contact": {**(await request.json()), "id": new_id()}}


@router.get("/communication/messages")
async def comm_messages(): return {"messages": [], "ok": True}


@router.post("/communication/send-message")
async def comm_send(request: Request):
    return {"ok": True, "status": "queued_local", "id": new_id(), "echo": await request.json()}


@router.get("/communication/templates")
async def comm_templates(): return {"templates": [], "ok": True}


@router.post("/communication/templates")
async def comm_templates_create(request: Request):
    return {"ok": True, "template": {**(await request.json()), "id": new_id()}}


@router.get("/documents")
async def docs_list(): return {"documents": [], "ok": True}


@router.get("/documents/folders")
async def docs_folders(): return {"folders": [], "ok": True}


@router.post("/documents/upload")
async def docs_upload(): return {"ok": True, "uploaded": False, "note": "upload pipeline not configured"}


@router.post("/documents/organize-all")
async def docs_organize(): return {"ok": True, "accepted": True}


@router.get("/live-transactions")
async def live_tx(): return {"transactions": [], "ok": True}


@router.get("/payment-sources")
async def payment_sources(): return {"sources": [], "ok": True}


@router.post("/payment-sources")
async def payment_sources_create(request: Request):
    return {"ok": True, "source": {**(await request.json()), "id": new_id()}}


@router.get("/payroll/employees")
async def payroll_employees(user: dict = Depends(get_current_user)):
    rows = await db.sync_employees.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return {"employees": rows, "ok": True}


@router.get("/payroll/settings")
async def payroll_settings(): return {"settings": {}, "ok": True}


@router.post("/payroll/bulk-update-nssf")
async def payroll_nssf(): return {"ok": True, "accepted": True}


@router.post("/payroll/bulk-update-sha")
async def payroll_sha(): return {"ok": True, "accepted": True}


@router.post("/payroll/export-combined")
async def payroll_export_combined(): return {"ok": True, "accepted": True}


@router.post("/payroll/export-cpc")
async def payroll_export_cpc(): return {"ok": True, "accepted": True}


@router.post("/chat")
async def chat(request: Request):
    return {"ok": True, "reply": "AI assistant not configured.", "echo": await request.json()}


@router.get("/oauth/authorize")
async def oauth_auth(): return {"ok": False, "error": "oauth_not_configured"}


@router.get("/oauth/callback")
async def oauth_cb(): return {"ok": False, "error": "oauth_not_configured"}
