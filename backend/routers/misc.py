"""Misc graceful stubs for endpoints the frontend touches but aren't yet built out.

Kept separate from feature routers so deletion is easy when each is implemented properly.
All mutating endpoints require authentication.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from core import db, get_current_user, new_id

router = APIRouter()


@router.get("/communication/contacts")
async def comm_contacts(_user: dict = Depends(get_current_user)):
    return {"contacts": [], "ok": True}


@router.post("/communication/contacts")
async def comm_contacts_create(request: Request, _user: dict = Depends(get_current_user)):
    return {"ok": True, "contact": {**(await request.json()), "id": new_id()}}


@router.get("/communication/messages")
async def comm_messages(_user: dict = Depends(get_current_user)):
    return {"messages": [], "ok": True}


@router.post("/communication/send-message")
async def comm_send(request: Request, _user: dict = Depends(get_current_user)):
    return {"ok": True, "status": "queued_local", "id": new_id(), "echo": await request.json()}


@router.get("/communication/templates")
async def comm_templates(_user: dict = Depends(get_current_user)):
    return {"templates": [], "ok": True}


@router.post("/communication/templates")
async def comm_templates_create(request: Request, _user: dict = Depends(get_current_user)):
    return {"ok": True, "template": {**(await request.json()), "id": new_id()}}


@router.get("/documents")
async def docs_list(_user: dict = Depends(get_current_user)):
    return {"documents": [], "ok": True}


@router.get("/documents/folders")
async def docs_folders(_user: dict = Depends(get_current_user)):
    return {"folders": [], "ok": True}


@router.post("/documents/upload")
async def docs_upload(_user: dict = Depends(get_current_user)):
    return {"ok": True, "uploaded": False, "note": "upload pipeline not configured"}


@router.post("/documents/organize-all")
async def docs_organize(_user: dict = Depends(get_current_user)):
    return {"ok": True, "accepted": True}


@router.get("/live-transactions")
async def live_tx(_user: dict = Depends(get_current_user)):
    return {"transactions": [], "ok": True}


@router.get("/payment-sources")
async def payment_sources(_user: dict = Depends(get_current_user)):
    return {"sources": [], "ok": True}


@router.post("/payment-sources")
async def payment_sources_create(request: Request, _user: dict = Depends(get_current_user)):
    return {"ok": True, "source": {**(await request.json()), "id": new_id()}}


@router.get("/payroll/employees")
async def payroll_employees(user: dict = Depends(get_current_user)):
    rows = await db.sync_employees.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return {"employees": rows, "ok": True}


@router.get("/payroll/settings")
async def payroll_settings(_user: dict = Depends(get_current_user)):
    return {"settings": {}, "ok": True}


@router.post("/payroll/bulk-update-nssf")
async def payroll_nssf(_user: dict = Depends(get_current_user)):
    return {"ok": True, "accepted": True}


@router.post("/payroll/bulk-update-sha")
async def payroll_sha(_user: dict = Depends(get_current_user)):
    return {"ok": True, "accepted": True}


@router.post("/payroll/export-combined")
async def payroll_export_combined(_user: dict = Depends(get_current_user)):
    return {"ok": True, "accepted": True}


@router.post("/payroll/export-cpc")
async def payroll_export_cpc(_user: dict = Depends(get_current_user)):
    return {"ok": True, "accepted": True}


@router.post("/chat")
async def chat(request: Request, _user: dict = Depends(get_current_user)):
    return {"ok": True, "reply": "AI assistant not configured.", "echo": await request.json()}


@router.get("/oauth/authorize")
async def oauth_auth(): return {"ok": False, "error": "oauth_not_configured"}


@router.get("/oauth/callback")
async def oauth_cb(): return {"ok": False, "error": "oauth_not_configured"}
