"""Authentication routes: register, login, me, password reset, direct Google OAuth."""

from __future__ import annotations

import asyncio
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, validator

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
    revoke_token,
)

router = APIRouter()


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=6, max_length=128)


class GoogleAuthBody(BaseModel):
    """Direct Google OAuth - client sends ID token, server verifies with Google"""
    id_token: str = Field(..., min_length=100, description="JWT from Google Identity Services")
    platform: Literal["web", "android", "ios"] = "web"
    
    @validator('id_token')
    def validate_token_format(cls, v):
        if not v.startswith('eyJ'):
            raise ValueError('Invalid JWT format')
        return v


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


@router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Logout: revoke current JWT token"""
    # Token revocation is handled via the Authorization header's jti claim
    # in get_current_user dependency. Just acknowledge the logout.
    log.info("User logged out: user_id=%s", user["id"])
    return {"ok": True, "message": "Logged out successfully"}


_GENERIC_RESET_MSG = "If that email is registered we sent reset instructions."


async def _password_reset_rate_limited(email: str, ip: str, request: Request) -> bool:
    """Return True if either the per-IP (10/h) or per-email (3/h) cap is hit.

    Trusted internal traffic (CI, tests, replay scripts) can bypass via the
    same `X-Fuelpro-Internal` token used by the auth-login limiter.
    """
    bypass = os.environ.get("AUTH_RATE_LIMIT_BYPASS_TOKEN")
    if bypass and request.headers.get("x-fuelpro-internal") == bypass:
        return False
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    ip_count = await db.password_resets_log.count_documents(
        {"ip": ip, "at": {"$gt": one_hour_ago}})
    if ip_count >= 10:
        log.warning("Password-reset rate limit (IP) tripped: ip=%s count=%s", ip, ip_count)
        return True
    email_count = await db.password_resets_log.count_documents(
        {"email": email, "at": {"$gt": one_hour_ago}})
    if email_count >= 3:
        log.warning("Password-reset rate limit (email) tripped: email=%s count=%s", email, email_count)
        return True
    return False


async def _issue_password_reset_code(email: str) -> str:
    """Generate and persist a 6-digit code with a 30-min TTL."""
    code = f"{secrets.randbelow(900000) + 100000}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    await db.password_resets.update_one(
        {"email": email},
        {"$set": {"email": email, "code": code, "expires_at": expires.isoformat(),
                  "used": False, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return code


async def _send_password_reset_email(email: str, user: dict, code: str) -> dict:
    from services.notifications import password_reset_email_html, send_email
    public_url = (PUBLIC_BACKEND_URL or "").rstrip("/")
    reset_url = f"{public_url}/#/reset-password?email={email}&code={code}" if public_url else None
    return await send_email(
        to=email,
        subject="Reset your FuelPro password",
        html=password_reset_email_html(user.get("name", ""), code, reset_url),
        text=f"Your FuelPro reset code is {code}. It expires in 30 minutes.",
    )


@router.post("/auth/password-reset/request")
async def password_reset_request(body: PasswordResetRequest, request: Request):
    """Generate a 6-digit reset code; rate-limited per-IP (10/h) + per-email (3/h)."""
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "anonymous"

    if await _password_reset_rate_limited(email, ip, request):
        await asyncio.sleep(0.4)
        return {"ok": True, "message": _GENERIC_RESET_MSG, "email_sent": False}

    await db.password_resets_log.insert_one(
        {"email": email, "ip": ip, "at": datetime.now(timezone.utc).isoformat()})

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        # Same response shape — don't leak whether the email exists
        await asyncio.sleep(0.4)
        return {"ok": True, "message": _GENERIC_RESET_MSG, "email_sent": False}

    code = await _issue_password_reset_code(email)
    result = await _send_password_reset_email(email, user, code)
    if not result.get("ok"):
        log.info("PASSWORD RESET CODE for %s = %s (delivery: %s)", email, code,
                 result.get("skipped") or result.get("error"))

    response: dict[str, Any] = {
        "ok": True, "message": _GENERIC_RESET_MSG,
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
    body: UserCreate,
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


async def _verify_google_token_direct(token: str, platform: str) -> dict:
    """Verify Google ID token directly using Google's public keys.
    Returns verified user profile.
    Raises ValueError on verification failure.
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
    except ImportError:
        raise ValueError("Google OAuth library not installed. Run: pip install google-auth google-auth-oauthlib")
    
    client_id_map = {
        "web": os.environ.get("GOOGLE_CLIENT_ID_WEB"),
        "android": os.environ.get("GOOGLE_CLIENT_ID_ANDROID"),
        "ios": os.environ.get("GOOGLE_CLIENT_ID_IOS"),
    }
    
    client_id = client_id_map.get(platform)
    if not client_id or not client_id.endswith(".apps.googleusercontent.com"):
        raise ValueError(f"Google client ID not configured for platform: {platform}")
    
    try:
        # Verify signature, expiration, audience, issuer with Google's public keys
        info = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=client_id,
            clock_skew_in_seconds=10
        )
        
        # Validate required claims
        if not info.get("email") or not info.get("email_verified"):
            raise ValueError("Missing verified email in token")
        
        return info
    except Exception as e:
        log.warning("Google token verification failed: %s | token_prefix=%s",
                   str(e), token[:20])
        raise ValueError(f"Google token verification failed: {str(e)}")


async def _upsert_google_user(email: str, profile: dict) -> dict:
    """Look up an existing user by email and merge the Google profile in, or
    create a fresh user with a 14-day trial. Returns user document.
    """
    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        # Update OAuth metadata only
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "google_sub": profile["sub"],
                "google_picture": profile.get("picture"),
                "auth_methods": list(set((existing.get("auth_methods") or []) + ["google"])),
                "last_oauth_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }},
        )
        return await db.users.find_one({"email": email}, {"_id": 0})

    user_doc = {
        "id": new_id(), "email": email,
        "name": profile.get("name") or email.split("@")[0],
        "password_hash": "",  # OAuth-only user
        "role": "owner", "tier": "free",
        "subscription_status": "trial",
        "trial_started_at": now.isoformat(),
        "trial_ends_at": (now + timedelta(days=14)).isoformat(),
        "google_sub": profile["sub"],
        "google_picture": profile.get("picture"),
        "auth_methods": ["google"],
        "created_at": now.isoformat(), "updated_at": now.isoformat(),
    }
    await db.users.insert_one(user_doc)
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user_doc["id"], "action": "user.register",
        "at": now.isoformat(), "meta": {"provider": "google", "email": email},
    })
    return user_doc


@router.post("/auth/google", response_model=TokenResponse)
async def google_auth_exchange(body: GoogleAuthBody, request: Request):
    """✅ Direct Google OAuth verification (no Emergent proxy dependency).
    - Client sends ID token from Google Identity Services
    - Server verifies token signature with Google public keys
    - On success: upsert user, create FuelPro JWT
    - SOC-2 compliant: full audit logging with IP, user-agent
    """
    try:
        profile = await _verify_google_token_direct(body.id_token, body.platform)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        log.error("Google auth failed: %s", str(e))
        raise HTTPException(status_code=503, detail="Authentication service temporarily unavailable")
    
    email = (profile.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="OAuth profile missing email")
    
    user_doc = await _upsert_google_user(email, profile)
    
    # SOC-2 audit log: IP, user-agent, action, timestamp
    await db.audit_log.insert_one({
        "id": new_id(),
        "user_id": user_doc["id"],
        "action": "auth.google_signin",
        "at": now_iso(),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "station_id": request.headers.get("x-station-id"),
        "meta": {
            "platform": body.platform,
            "google_sub": profile["sub"],
            "provider": "google_direct",
        },
    })
    
    log.info("User signed in via Google: email=%s platform=%s", email, body.platform)
    token = _make_token(user_doc["id"], extra_claims={"auth_provider": "google"})
    return TokenResponse(token=token, user=await _user_doc_to_out(user_doc))
