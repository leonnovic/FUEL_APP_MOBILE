"""Extra OAuth providers — Apple Sign-In and Microsoft Sign-In.

Both flows are server-side ID-token verification:
- Frontend uses the provider's JS SDK (Sign in with Apple / MSAL.js) to obtain
  an `id_token` (JWT signed by the provider). The frontend POSTs the token to
  these endpoints. We verify the signature using the provider's JWKS, validate
  audience/issuer, then upsert the FuelPro user and return our JWT.

Required runtime config (set via /api/founder/integrations):
- APPLE_CLIENT_ID — your Apple Service ID (e.g. com.fuelpro.signin.web)
- MICROSOFT_CLIENT_ID — Azure AD application (client) ID
- MICROSOFT_TENANT — tenant id, "common", "consumers", or "organizations"
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, HTTPException
from jose import JWTError, jwk, jwt
from jose.utils import base64url_decode
from pydantic import BaseModel

from core import (
    TokenResponse,
    _make_token,
    _user_doc_to_out,
    db,
    log,
    new_id,
    now_iso,
)

router = APIRouter()

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
MICROSOFT_JWKS_URL_TEMPLATE = (
    "https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys"
)
MICROSOFT_ISSUER_TEMPLATE_V2 = "https://login.microsoftonline.com/{tenant}/v2.0"

# Tiny in-memory JWKS cache (provider keys rotate ~weekly)
_JWKS_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_JWKS_TTL_SECONDS = 3600


async def _fetch_jwks(url: str) -> list[dict[str, Any]]:
    cached = _JWKS_CACHE.get(url)
    if cached and (time.time() - cached[0]) < _JWKS_TTL_SECONDS:
        return cached[1]
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(url)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"JWKS fetch failed: {r.status_code}")
        keys = r.json().get("keys", [])
    _JWKS_CACHE[url] = (time.time(), keys)
    return keys


def _select_key(keys: list[dict[str, Any]], kid: str) -> Optional[dict[str, Any]]:
    for k in keys:
        if k.get("kid") == kid:
            return k
    return None


def _extract_kid(token: str) -> str:
    """Extract the `kid` (key id) from the JWT header. Raises 401 on any
    parse error or if kid is missing."""
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token header: {e}")
    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token missing key id (kid)")
    return kid


async def _resolve_signing_key(jwks_url: str, kid: str) -> dict[str, Any]:
    """Look up the JWKS entry matching `kid`. Refreshes the cache once on miss
    so that newly-rotated keys are picked up without a server restart."""
    keys = await _fetch_jwks(jwks_url)
    key_data = _select_key(keys, kid)
    if key_data:
        return key_data
    _JWKS_CACHE.pop(jwks_url, None)
    keys = await _fetch_jwks(jwks_url)
    key_data = _select_key(keys, kid)
    if not key_data:
        raise HTTPException(status_code=401, detail="Signing key not found in provider JWKS")
    return key_data


def _verify_signature(token: str, key_data: dict[str, Any]) -> None:
    """Cryptographically verify the JWT signature against the JWKS key."""
    public_key = jwk.construct(key_data)
    message, encoded_sig = token.rsplit(".", 1)
    decoded_sig = base64url_decode(encoded_sig.encode())
    if not public_key.verify(message.encode(), decoded_sig):
        raise HTTPException(status_code=401, detail="Token signature invalid")


def _parse_claims(token: str) -> dict[str, Any]:
    try:
        return jwt.get_unverified_claims(token)
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Claims parse error: {e}")


def _validate_claims(claims: dict[str, Any], audience: str, issuer: str) -> None:
    """Check exp, iss, aud against caller-supplied expectations."""
    exp = claims.get("exp")
    if exp and int(time.time()) > exp:
        raise HTTPException(status_code=401, detail="Token expired")
    iss = claims.get("iss")
    if issuer and iss and not (iss == issuer or iss.startswith(issuer)):
        raise HTTPException(status_code=401, detail=f"Unexpected issuer: {iss}")
    aud = claims.get("aud")
    if audience and aud and audience not in (aud if isinstance(aud, list) else [aud]):
        raise HTTPException(status_code=401, detail=f"Unexpected audience: {aud}")


async def _verify_jwt(token: str, jwks_url: str, audience: str, issuer: str) -> dict[str, Any]:
    """Verify a JWT against the given JWKS + audience + issuer. Returns the
    parsed claims on success, raises HTTPException(401) on any failure."""
    kid = _extract_kid(token)
    key_data = await _resolve_signing_key(jwks_url, kid)
    _verify_signature(token, key_data)
    claims = _parse_claims(token)
    _validate_claims(claims, audience, issuer)
    return claims


async def _upsert_oauth_user(email: str, name: str, provider: str,
                              picture: Optional[str] = None) -> dict[str, Any]:
    email = (email or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="OAuth profile missing email")
    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "auth_methods": list(set((existing.get("auth_methods") or []) + [provider])),
                **({f"{provider}_picture": picture} if picture else {}),
                f"last_{provider}_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }},
        )
        return await db.users.find_one({"email": email}, {"_id": 0})

    user_doc = {
        "id": new_id(),
        "email": email,
        "name": name or email.split("@")[0],
        "password_hash": "",
        "role": "owner",
        "tier": "free",
        "subscription_status": "trial",
        "trial_started_at": now.isoformat(),
        "trial_ends_at": (now + timedelta(days=14)).isoformat(),
        "auth_methods": [provider],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    if picture:
        user_doc[f"{provider}_picture"] = picture
    await db.users.insert_one(user_doc)
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user_doc["id"], "action": "user.register",
        "at": now.isoformat(), "meta": {"provider": provider, "email": email},
    })
    return user_doc


# ---------------------------------------------------------------------------
# Apple Sign-In
# ---------------------------------------------------------------------------
class AppleAuthBody(BaseModel):
    id_token: str
    # Apple only returns name on FIRST sign-in. Frontend should send it from
    # the user.name object when present.
    name: Optional[str] = None


@router.post("/auth/apple", response_model=TokenResponse)
async def apple_signin(body: AppleAuthBody):
    client_id = os.environ.get("APPLE_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(
            status_code=503,
            detail="Apple Sign-In is not configured. Set APPLE_CLIENT_ID in Founder → Integration Keys.",
        )
    claims = await _verify_jwt(
        body.id_token, APPLE_JWKS_URL, audience=client_id, issuer=APPLE_ISSUER,
    )
    email = claims.get("email")
    if not email:
        # Apple supports "hide my email" → email_hidden = true; the relay
        # address is still returned in `email`. If empty, fail loudly.
        raise HTTPException(status_code=400, detail="Apple token did not include an email")
    user = await _upsert_oauth_user(email, body.name or "", "apple")
    log.info("Apple sign-in: %s", email)
    return TokenResponse(token=_make_token(user["id"]), user=await _user_doc_to_out(user))


# ---------------------------------------------------------------------------
# Microsoft (Azure AD) Sign-In
# ---------------------------------------------------------------------------
class MicrosoftAuthBody(BaseModel):
    id_token: str


@router.post("/auth/microsoft", response_model=TokenResponse)
async def microsoft_signin(body: MicrosoftAuthBody):
    client_id = os.environ.get("MICROSOFT_CLIENT_ID", "")
    tenant = os.environ.get("MICROSOFT_TENANT", "common")
    if not client_id:
        raise HTTPException(
            status_code=503,
            detail="Microsoft Sign-In is not configured. Set MICROSOFT_CLIENT_ID in Founder → Integration Keys.",
        )
    jwks_url = MICROSOFT_JWKS_URL_TEMPLATE.format(tenant=tenant)
    # 'common' / 'consumers' / 'organizations' resolve to specific tenant ids
    # in the issued token, so we accept any login.microsoftonline.com issuer
    # rather than pinning to a specific tenant URL.
    claims = await _verify_jwt(
        body.id_token, jwks_url, audience=client_id,
        issuer="https://login.microsoftonline.com/",
    )
    email = claims.get("email") or claims.get("preferred_username")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Microsoft token did not include an email")
    name = claims.get("name") or ""
    user = await _upsert_oauth_user(email, name, "microsoft")
    log.info("Microsoft sign-in: %s (issuer ok: %s)", email, claims.get("iss"))
    return TokenResponse(token=_make_token(user["id"]), user=await _user_doc_to_out(user))


@router.get("/auth/oauth-providers")
async def list_oauth_providers():
    """Public endpoint — tells the frontend which OAuth providers are configured."""
    return {
        "ok": True,
        "google": True,  # Emergent-managed, always available
        "apple": bool(os.environ.get("APPLE_CLIENT_ID")),
        "microsoft": bool(os.environ.get("MICROSOFT_CLIENT_ID")),
        "apple_client_id": os.environ.get("APPLE_CLIENT_ID") or None,
        "microsoft_client_id": os.environ.get("MICROSOFT_CLIENT_ID") or None,
        "microsoft_tenant": os.environ.get("MICROSOFT_TENANT", "common"),
    }
