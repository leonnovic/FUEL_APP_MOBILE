"""Founder access + role management."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from jose import jwt
from pydantic import BaseModel, Field

from core import (
    ALLOWED_ROLES,
    FOUNDER_DEFAULT_PASSWORD,
    FOUNDER_EMAIL,
    JWT_ALG,
    JWT_SECRET,
    _hash_pw,
    _verify_pw,
    db,
    get_current_user,
    log,
    now_iso,
    require_founder,
)
from services.shared import write_audit_log

router = APIRouter()


class FounderLoginBody(BaseModel):
    password: str


class FounderChangePasswordBody(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class RoleChangeBody(BaseModel):
    role: str


async def ensure_founder_seeded():
    """Idempotent founder seed — called from server.py startup."""
    existing = await db.founder.find_one({"id": "founder"}, {"_id": 0})
    if existing:
        return
    await db.founder.insert_one({
        "id": "founder",
        "email": FOUNDER_EMAIL,
        "password_hash": _hash_pw(FOUNDER_DEFAULT_PASSWORD),
        "created_at": now_iso(),
        "password_set_by_user": False,
    })
    log.info("Founder access seeded (default password from FOUNDER_DEFAULT_PASSWORD env)")


@router.post("/founder/login")
async def founder_login(body: FounderLoginBody, request: Request):
    """Founder access verification. Rate-limited per IP — counts only FAILED
    attempts so a successful login resets the counter (testing-agent feedback)."""
    import os
    ip = request.client.host if request.client else "anonymous"
    limit = int(os.environ.get("FOUNDER_LOGIN_MAX_PER_HOUR", "20"))
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    attempts = await db.founder_login_log.count_documents(
        {"ip": ip, "at": {"$gt": one_hour_ago}, "success": {"$ne": True}},
    )
    if attempts >= limit:
        await asyncio.sleep(0.5)
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    founder = await db.founder.find_one({"id": "founder"}, {"_id": 0})
    if not founder or not _verify_pw(body.password, founder.get("password_hash", "")):
        await db.founder_login_log.insert_one({"ip": ip, "at": now_iso(), "success": False})
        await asyncio.sleep(0.4)
        raise HTTPException(status_code=401, detail="Invalid founder password")

    # Successful login — drop prior failed-attempt rows for this IP
    await db.founder_login_log.delete_many({"ip": ip, "success": {"$ne": True}})
    await db.founder_login_log.insert_one({"ip": ip, "at": now_iso(), "success": True})

    exp = datetime.now(timezone.utc) + timedelta(hours=4)
    token = jwt.encode({"sub": "founder", "exp": exp, "scope": "founder"},
                       JWT_SECRET, algorithm=JWT_ALG)
    await write_audit_log("founder", "founder.login", meta={"ip": ip})
    return {
        "ok": True, "token": token,
        "must_change_password": not founder.get("password_set_by_user", False),
    }


@router.post("/founder/change-password")
async def founder_change_password(body: FounderChangePasswordBody, _=Depends(require_founder)):
    founder = await db.founder.find_one({"id": "founder"}, {"_id": 0})
    if not founder or not _verify_pw(body.current_password, founder.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Current password is wrong")
    await db.founder.update_one(
        {"id": "founder"},
        {"$set": {"password_hash": _hash_pw(body.new_password),
                  "password_set_by_user": True, "updated_at": now_iso()}},
    )
    await write_audit_log("founder", "founder.password_changed")
    return {"ok": True}


@router.get("/founder/users")
async def founder_list_users(_=Depends(require_founder)):
    rows = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(2000)
    return {"users": rows, "ok": True, "total": len(rows)}


@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, body: RoleChangeBody,
                            caller: dict = Depends(get_current_user)):
    """Owner can change a user's role (replaces invite-based downgrade)."""
    if body.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {sorted(ALLOWED_ROLES)}")
    if caller.get("role") not in {"owner"}:
        raise HTTPException(status_code=403, detail="Only owners can change roles")

    target = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # ── Last-owner safety: don't allow the only remaining owner to demote
    # themselves (or anyone else) into a non-owner role. The product would
    # otherwise have zero owners, locking everyone out of role-management.
    if target.get("role") == "owner" and body.role != "owner":
        owner_count = await db.users.count_documents({"role": "owner"})
        if owner_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the last remaining owner. Promote another user to 'owner' first.",
            )

    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": body.role, "updated_at": now_iso()}},
    )
    await write_audit_log(
        caller["id"], "user.role_changed",
        meta={"target_user_id": user_id, "old_role": target.get("role"), "new_role": body.role},
    )
    return {"ok": True, "user_id": user_id, "role": body.role}


@router.get("/users")
async def list_team_users(caller: dict = Depends(get_current_user)):
    """Lists all users — owner/manager only — for the Role Management UI."""
    if caller.get("role") not in {"owner", "manager"}:
        raise HTTPException(status_code=403, detail="Only owners/managers can list users")
    rows = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return {"users": rows, "ok": True}
