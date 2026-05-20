"""S3-backed cloud storage for receipts, station photos, payroll exports.

Uses pre-signed URLs so the browser uploads/downloads directly from S3 — no
binary streaming through FastAPI. This scales to multi-GB files without
hitting the proxy/ingress request-size limits.

Required runtime config (Founder → Integration Keys):
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION (default us-east-1)
- AWS_S3_BUCKET

Files are namespaced by user id: `users/{user_id}/{category}/{uuid}_{filename}`
"""

from __future__ import annotations

import os
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import db, get_current_user, log, new_id, now_iso

router = APIRouter()


ALLOWED_CATEGORIES = {"receipts", "photos", "payroll", "documents", "logos", "misc"}
DEFAULT_REGION = "us-east-1"
MAX_FILENAME_LEN = 200
PRESIGN_EXPIRES_SEC = 900  # 15 min


def _s3_configured() -> bool:
    return bool(
        os.environ.get("AWS_ACCESS_KEY_ID")
        and os.environ.get("AWS_SECRET_ACCESS_KEY")
        and os.environ.get("AWS_S3_BUCKET")
    )


def _safe_filename(name: str) -> str:
    name = (name or "file").strip()[:MAX_FILENAME_LEN]
    # Keep alphanumerics, dot, dash, underscore. Replace everything else with -.
    return re.sub(r"[^A-Za-z0-9._-]+", "-", name) or "file"


def _build_key(user_id: str, category: str, filename: str) -> str:
    return f"users/{user_id}/{category}/{new_id()}_{_safe_filename(filename)}"


def _get_client():
    import boto3
    return boto3.client(
        "s3",
        region_name=os.environ.get("AWS_REGION", DEFAULT_REGION),
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


# ---------------------------------------------------------------------------
# Public config check
# ---------------------------------------------------------------------------
@router.get("/storage/config")
async def storage_config(user: dict = Depends(get_current_user)):
    return {
        "ok": True,
        "configured": _s3_configured(),
        "bucket": os.environ.get("AWS_S3_BUCKET") if _s3_configured() else None,
        "region": os.environ.get("AWS_REGION", DEFAULT_REGION),
        "categories": sorted(ALLOWED_CATEGORIES),
        "user_id": user["id"],
    }


# ---------------------------------------------------------------------------
# Pre-signed upload URL
# ---------------------------------------------------------------------------
class PresignUploadBody(BaseModel):
    filename: str = Field(min_length=1, max_length=MAX_FILENAME_LEN)
    content_type: str = Field(default="application/octet-stream", max_length=128)
    category: str = Field(default="misc")
    size: Optional[int] = None


@router.post("/storage/presign-upload")
async def presign_upload(body: PresignUploadBody, user: dict = Depends(get_current_user)):
    if not _s3_configured():
        raise HTTPException(
            status_code=503,
            detail="S3 storage is not configured. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET in Founder → Integration Keys.",
        )
    if body.category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {sorted(ALLOWED_CATEGORIES)}")

    bucket = os.environ["AWS_S3_BUCKET"]
    key = _build_key(user["id"], body.category, body.filename)

    try:
        client = _get_client()
        url = client.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": body.content_type},
            ExpiresIn=PRESIGN_EXPIRES_SEC,
        )
    except Exception as e:
        log.error("S3 presign-upload failed: %s", e)
        raise HTTPException(status_code=502, detail=f"S3 presign failed: {e}")

    # Pre-create a metadata row so listing is fast and we can attribute the
    # upload even before the browser PUT completes.
    await db.storage_files.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "key": key,
        "filename": _safe_filename(body.filename),
        "original_filename": body.filename,
        "category": body.category,
        "content_type": body.content_type,
        "size": body.size,
        "status": "pending",
        "created_at": now_iso(),
    })

    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user["id"], "action": "storage.presign_upload",
        "at": now_iso(), "meta": {"key": key, "category": body.category, "size": body.size},
    })

    return {
        "ok": True,
        "url": url,
        "method": "PUT",
        "key": key,
        "expires_in": PRESIGN_EXPIRES_SEC,
        "headers": {"Content-Type": body.content_type},
    }


# ---------------------------------------------------------------------------
# Pre-signed download URL
# ---------------------------------------------------------------------------
@router.get("/storage/presign-download")
async def presign_download(key: str, user: dict = Depends(get_current_user)):
    if not _s3_configured():
        raise HTTPException(status_code=503, detail="S3 storage is not configured.")
    # Authorization: only the owner of the key may download.
    if not key.startswith(f"users/{user['id']}/"):
        raise HTTPException(status_code=403, detail="Not authorized for this object")
    bucket = os.environ["AWS_S3_BUCKET"]
    try:
        client = _get_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=PRESIGN_EXPIRES_SEC,
        )
    except Exception as e:
        log.error("S3 presign-download failed: %s", e)
        raise HTTPException(status_code=502, detail=f"S3 presign failed: {e}")
    return {"ok": True, "url": url, "key": key, "expires_in": PRESIGN_EXPIRES_SEC}


# ---------------------------------------------------------------------------
# Confirm upload (called by frontend after a successful PUT)
# ---------------------------------------------------------------------------
class ConfirmUploadBody(BaseModel):
    key: str
    size: Optional[int] = None


@router.post("/storage/confirm-upload")
async def confirm_upload(body: ConfirmUploadBody, user: dict = Depends(get_current_user)):
    if not body.key.startswith(f"users/{user['id']}/"):
        raise HTTPException(status_code=403, detail="Not authorized for this object")
    update = {"status": "uploaded", "uploaded_at": now_iso()}
    if body.size is not None:
        update["size"] = body.size
    r = await db.storage_files.update_one({"key": body.key, "user_id": user["id"]}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Upload record not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# List user's files
# ---------------------------------------------------------------------------
@router.get("/storage/list")
async def storage_list(
    user: dict = Depends(get_current_user),
    category: Optional[str] = None,
    limit: int = 200,
):
    q: dict = {"user_id": user["id"]}
    if category:
        if category not in ALLOWED_CATEGORIES:
            raise HTTPException(status_code=400, detail="Unknown category")
        q["category"] = category
    rows = await db.storage_files.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"items": rows, "ok": True, "total": len(rows)}


# ---------------------------------------------------------------------------
# Delete a file
# ---------------------------------------------------------------------------
@router.delete("/storage/file")
async def storage_delete(key: str, user: dict = Depends(get_current_user)):
    if not _s3_configured():
        raise HTTPException(status_code=503, detail="S3 storage is not configured.")
    if not key.startswith(f"users/{user['id']}/"):
        raise HTTPException(status_code=403, detail="Not authorized for this object")
    bucket = os.environ["AWS_S3_BUCKET"]
    try:
        client = _get_client()
        client.delete_object(Bucket=bucket, Key=key)
    except Exception as e:
        log.error("S3 delete failed: %s", e)
        # Continue to drop the metadata row even if S3 delete failed — the
        # user can re-run the cleanup tool. We surface the error transparently.
        await db.audit_log.insert_one({
            "id": new_id(), "user_id": user["id"], "action": "storage.delete_failed",
            "at": now_iso(), "meta": {"key": key, "error": str(e)},
        })
        raise HTTPException(status_code=502, detail=f"S3 delete failed: {e}")
    await db.storage_files.delete_one({"key": key, "user_id": user["id"]})
    await db.audit_log.insert_one({
        "id": new_id(), "user_id": user["id"], "action": "storage.delete",
        "at": now_iso(), "meta": {"key": key},
    })
    return {"ok": True}
