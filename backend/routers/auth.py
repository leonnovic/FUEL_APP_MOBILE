"""Authentication routes: register, login, me, password reset, Google OAuth."""

from __future__ import annotations

import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from core import (
    IS_PRODUCTION,
    PUBLIC_BACKEND_URL,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
    _hash_pw,
    _make_token,
    _user_doc_to_out,
    _verify_pw,
    db,
    get_current_user,
    log,
    new_id,
    now_iso,
)

router = APIRouter()


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=6, max_length=128)


class GoogleAuthBody(BaseModel):
    session_id: str


@router.post("/auth/register", response_model=TokenResponse)
async def register(body: UserCreate):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=14)
    user = {
        "id": new_id(),
        "email": email,
        "name": body.name.strip(),
        "password_hash": _hash_pw(body.password),
        "role": "owner",
        "tier": "free",
        "subscription_status": "trial",
        "trial_started_at": now.isoformat(),
        "trial_ends_at": trial_end.isoformat(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.users.insert_one(user)
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user["id"], "action": "user.register",
        "at": now.isoformat(), "meta": {"email": email},
    })
    out = await _user_doc_to_out(user)
    return TokenResponse(token=_make_token(user["id"]), user=out)


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not _verify_pw(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    out = await _user_doc_to_out(user)
    return TokenResponse(token=_make_token(user["id"]), user=out)


@router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return await _user_doc_to_out(user)


@router.post("/auth/password-reset/request")
async def password_reset_request(body: PasswordResetRequest, request: Request):
    """Generate a 6-digit reset code; rate-limited per-IP (10/h) + per-email (3/h)."""
    from services.notifications import password_reset_email_html, send_email

    email = body.email.lower().strip()
    ip = (request.client.host if request.client else "anonymous")
    now = datetime.now(timezone.utc)
    one_hour_ago = (now - timedelta(hours=1)).isoformat()

    ip_count = await db.password_resets_log.count_documents({"ip": ip, "at": {"$gt": one_hour_ago}})
    if ip_count >= 10:
        log.warning("Password-reset rate limit (IP) tripped: ip=%s count=%s", ip, ip_count)
        await asyncio.sleep(0.4)
        return {"ok": True, "message": "If that email is registered we sent reset instructions."}
    email_count = await db.password_resets_log.count_documents({"email": email, "at": {"$gt": one_hour_ago}})
    if email_count >= 3:
        log.warning("Password-reset rate limit (email) tripped: email=%s count=%s", email, email_count)
        await asyncio.sleep(0.4)
        return {"ok": True, "message": "If that email is registered we sent reset instructions."}

    await db.password_resets_log.insert_one({"email": email, "ip": ip, "at": now.isoformat()})

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        await asyncio.sleep(0.4)
        return {"ok": True, "message": "If that email is registered we sent reset instructions."}

    code = f"{secrets.randbelow(900000) + 100000}"
    expires = now + timedelta(minutes=30)
    await db.password_resets.update_one(
        {"email": email},
        {"$set": {"email": email, "code": code, "expires_at": expires.isoformat(),
                  "used": False, "created_at": now.isoformat()}},
        upsert=True,
    )

    public_url = (PUBLIC_BACKEND_URL or "").rstrip("/")
    reset_url = f"{public_url}/#/reset-password?email={email}&code={code}" if public_url else None
    result = await send_email(
        to=email,
        subject="Reset your FuelPro password",
        html=password_reset_email_html(user.get("name", ""), code, reset_url),
        text=f"Your FuelPro reset code is {code}. It expires in 30 minutes.",
    )
    if not result.get("ok"):
        log.info("PASSWORD RESET CODE for %s = %s (delivery: %s)", email, code,
                 result.get("skipped") or result.get("error"))
    response: dict[str, Any] = {
        "ok": True,
        "message": "If that email is registered we sent reset instructions.",
        "email_sent": result.get("ok", False),
    }
    if not IS_PRODUCTION:
        response["delivery"] = result
    return response


@router.post("/auth/password-reset/confirm", response_model=TokenResponse)
async def password_reset_confirm(body: PasswordResetConfirm):
    email = body.email.lower().strip()
    rec = await db.password_resets.find_one({"email": email}, {"_id": 0})
    if not rec or rec.get("used") or rec.get("code") != body.code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset code expired")

    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": _hash_pw(body.new_password), "updated_at": now_iso()}},
    )
    await db.password_resets.update_one({"email": email}, {"$set": {"used": True}})
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user_doc["id"], "action": "auth.password_reset",
        "at": now_iso(), "meta": {},
    })
    return TokenResponse(token=_make_token(user_doc["id"]), user=await _user_doc_to_out(user_doc))


@router.post("/auth/quick-start", response_model=TokenResponse)
async def auth_quick_start(request: Request):
    """Create a brand-new guest account in microseconds — no OAuth redirect, no
    email/password required. The user lands on the app with a 14-day trial and
    can rename / claim the account later via Profile → "Convert guest to real
    account" (binds email + password to this same user_id).

    This is the path the Founder explicitly requested over the
    `auth.emergentagent.com` redirect for instant try-out flows.
    """
    now = datetime.now(timezone.utc)
    uid = new_id()
    # Friendly synthetic email + name so audit_log entries are still readable.
    email = f"guest_{uid[:8]}@guest.fuelpro.app"
    name = f"Guest {uid[:6].upper()}"
    user_doc = {
        "id": uid,
        "email": email,
        "name": name,
        "password_hash": "",
        "role": "owner",
        "tier": "free",
        "subscription_status": "trial",
        "trial_started_at": now.isoformat(),
        "trial_ends_at": (now + timedelta(days=14)).isoformat(),
        "auth_methods": ["quick_start"],
        "is_guest": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.users.insert_one(user_doc)
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": uid, "action": "user.quick_start",
        "at": now.isoformat(),
        "meta": {"ip": request.client.host if request.client else None},
    })
    log.info("Quick-start guest user created: %s", email)
    return TokenResponse(token=_make_token(uid), user=await _user_doc_to_out(user_doc))


@router.post("/auth/claim-guest")
async def auth_claim_guest(
    body: RegisterBody,
    request: Request,
    user: dict = Depends(get_current_user),
):
    """Convert a guest account into a fully registered email/password account.
    Same user_id is preserved — all stations / sales / sync data stays intact.
    """
    if not user.get("is_guest"):
        raise HTTPException(status_code=400, detail="Only guest accounts can claim an email")
    email = body.email.lower().strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if await db.users.find_one({"email": email, "id": {"$ne": user["id"]}}, {"_id": 0}):
        raise HTTPException(status_code=409, detail="Email already registered")
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "email": email,
            "name": body.name or email.split("@")[0],
            "password_hash": _hash_pw(body.password),
            "is_guest": False,
            "auth_methods": list(set((user.get("auth_methods") or []) + ["email"])),
            "claimed_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }},
    )
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user["id"], "action": "user.claim_guest",
        "at": now.isoformat(), "meta": {"email": email},
    })
    refreshed = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return TokenResponse(token=_make_token(user["id"]), user=await _user_doc_to_out(refreshed))


@router.post("/auth/google", response_model=TokenResponse)
async def google_auth_exchange(body: GoogleAuthBody):
    """Exchange Emergent-managed Google OAuth session_id for a FuelPro JWT."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail=f"OAuth exchange failed: {r.text}")
        profile = r.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OAuth server unreachable: {e}")

    email = (profile.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="OAuth profile missing email")

    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "google_picture": profile.get("picture"),
                "auth_methods": list(set((existing.get("auth_methods") or []) + ["google"])),
                "last_oauth_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }},
        )
        user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    else:
        user_doc = {
            "id": new_id(),
            "email": email,
            "name": profile.get("name") or email.split("@")[0],
            "password_hash": "",
            "role": "owner", "tier": "free",
            "subscription_status": "trial",
            "trial_started_at": now.isoformat(),
            "trial_ends_at": (now + timedelta(days=14)).isoformat(),
            "google_picture": profile.get("picture"),
            "auth_methods": ["google"],
            "created_at": now.isoformat(), "updated_at": now.isoformat(),
        }
        await db.users.insert_one(user_doc)
        await db.audit_log.insert_one({
            "id": new_id(), "user_id": user_doc["id"], "action": "user.register",
            "at": now.isoformat(), "meta": {"provider": "google", "email": email},
        })

    return TokenResponse(token=_make_token(user_doc["id"]), user=await _user_doc_to_out(user_doc))
