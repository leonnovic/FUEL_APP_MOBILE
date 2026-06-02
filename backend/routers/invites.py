"""Team invites: create, list, accept (multi-user roles)."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from core import (
    ASSIGNABLE_ROLES,
    PUBLIC_BACKEND_URL,
    TokenResponse,
    _hash_pw,
    _make_token,
    _user_doc_to_out,
    db,
    get_current_user,
    new_id,
    now_iso,
)

router = APIRouter()


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "staff"
    station_id: Optional[str] = None


class InviteAccept(BaseModel):
    code: str
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


def _check_inviter_permissions(user: dict, role: str) -> None:
    if user.get("role") not in {"owner", "manager"}:
        raise HTTPException(status_code=403, detail="Only owners/managers can invite teammates")
    if role not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"Invite role must be one of {sorted(ASSIGNABLE_ROLES)}")


async def _check_invite_collisions(target_email: str) -> None:
    """Reject if target email already has an account or a live pending invite."""
    if await db.users.find_one({"email": target_email}, {"_id": 0}):
        raise HTTPException(
            status_code=409,
            detail=("That email already has a FuelPro account. Ask them to sign in directly — "
                    "invite-based role changes are disabled for existing users."),
        )
    pending = await db.invites.find_one({"email": target_email, "status": "pending"}, {"_id": 0})
    if not pending:
        return
    if datetime.fromisoformat(pending["expires_at"]) >= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=409,
            detail=("A pending invite already exists for that email. Copy the existing link or "
                    "wait until it expires."),
        )
    # Stale pending — expire and let the new one through.
    await db.invites.update_one({"id": pending["id"]}, {"$set": {"status": "expired"}})


async def _persist_invite(body: "InviteCreate", target_email: str, user: dict) -> tuple[str, str]:
    """Insert the invite row + audit-log entry. Returns (invite_id, code)."""
    code = secrets.token_urlsafe(16)
    invite_id = new_id()
    now = datetime.now(timezone.utc)
    await db.invites.insert_one({
        "id": invite_id, "code": code,
        "email": target_email,
        "role": body.role,
        "station_id": body.station_id,
        "invited_by_user_id": user["id"],
        "invited_by_name": user.get("name", user["email"]),
        "status": "pending",
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=14)).isoformat(),
    })
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user["id"], "action": "invite.created",
        "at": now.isoformat(),
        "meta": {"invited_email": body.email, "role": body.role, "invite_id": invite_id},
    })
    return invite_id, code


async def _send_invite_email(body: "InviteCreate", code: str, user: dict) -> tuple[dict, str]:
    from services.notifications import invite_email_html, send_email
    public_url = (PUBLIC_BACKEND_URL or "").rstrip("/")
    accept_url = f"{public_url}/#/join/{code}" if public_url else f"/#/join/{code}"
    result = await send_email(
        to=body.email,
        subject=f"You're invited to FuelPro as {body.role}",
        html=invite_email_html(
            inviter=user.get("name", user["email"]),
            station=body.station_id or "FuelPro",
            accept_url=accept_url,
            role=body.role,
        ),
        text=f"{user.get('name', user['email'])} invited you to FuelPro as {body.role}. Accept: {accept_url}",
    )
    return result, accept_url


@router.post("/invites")
async def create_invite(body: InviteCreate, user: dict = Depends(get_current_user)):
    _check_inviter_permissions(user, body.role)
    target_email = body.email.lower().strip()
    await _check_invite_collisions(target_email)
    invite_id, code = await _persist_invite(body, target_email, user)
    email_result, accept_url = await _send_invite_email(body, code, user)
    return {
        "ok": True, "invite_id": invite_id, "code": code, "accept_url": accept_url,
        "email_delivery": email_result,
    }


@router.get("/invites")
async def list_invites(user: dict = Depends(get_current_user)):
    rows = await db.invites.find({"invited_by_user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"items": rows, "ok": True}


@router.get("/invites/{code}")
async def get_invite(code: str):
    inv = await db.invites.find_one({"code": code}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invite not found")
    if inv.get("status") != "pending":
        raise HTTPException(status_code=410, detail=f"Invite {inv.get('status')}")
    if datetime.fromisoformat(inv["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite expired")
    return {"email": inv["email"], "role": inv["role"],
            "station_id": inv.get("station_id"),
            "invited_by_name": inv.get("invited_by_name")}


@router.post("/invites/accept", response_model=TokenResponse)
async def accept_invite(body: InviteAccept):
    inv = await db.invites.find_one({"code": body.code}, {"_id": 0})
    if not inv or inv.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Invalid invite")
    if datetime.fromisoformat(inv["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite expired")

    email = inv["email"]
    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=409,
            detail="That email already has a FuelPro account. Please sign in instead.",
        )

    user_doc = {
        "id": new_id(),
        "email": email, "name": body.name.strip(),
        "password_hash": _hash_pw(body.password),
        "role": inv["role"], "tier": "free",
        "subscription_status": "trial",
        "trial_started_at": now.isoformat(),
        "trial_ends_at": (now + timedelta(days=14)).isoformat(),
        "created_at": now.isoformat(), "updated_at": now.isoformat(),
        "invited_by": inv.get("invited_by_user_id"),
    }
    await db.users.insert_one(user_doc)
    await db.invites.update_one({"code": body.code}, {"$set": {"status": "accepted", "accepted_at": now.isoformat()}})
    await db.audit_log.insert_one({
        "id": new_id(),
        "user_id": inv.get("invited_by_user_id"),
        "action": "invite.accepted",
        "at": now.isoformat(),
        "meta": {"new_user_email": email, "role": inv["role"]},
    })
    return TokenResponse(token=_make_token(user_doc["id"]), user=await _user_doc_to_out(user_doc))
