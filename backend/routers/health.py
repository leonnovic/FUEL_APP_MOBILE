"""Health Watchdog — poll all integrations + DB every N minutes and emit
audit-log/broadcast entries when any service flips green→red or red→green.

Status model:
  ok      — service responded successfully
  not_configured — keys absent (expected mock mode, not a bug)
  degraded — service responded but with errors
  down    — service unreachable / timed out / threw
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from core import db, log, new_id, now_iso, require_founder
from services.shared import write_audit_log

router = APIRouter()

# In-memory cache of the latest health snapshot. The scheduler refreshes this
# every poll; the API endpoint returns it instantly without re-pinging.
_latest: dict[str, Any] = {
    "ts": None,
    "summary": "unknown",
    "services": {},
}


# ---------------------------------------------------------------------------
# Probes
# ---------------------------------------------------------------------------
async def _probe_mongo() -> dict[str, Any]:
    try:
        await asyncio.wait_for(db.command("ping"), timeout=3)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "down", "error": str(e)[:200]}


async def _probe_resend() -> dict[str, Any]:
    """Resend has no public ping endpoint we can call without a side-effect.
    Treat configured-with-key as 'ok' (best-effort) and key-absent as 'not_configured'."""
    key = os.environ.get("RESEND_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "")
    if not key:
        return {"status": "not_configured", "hint": "RESEND_API_KEY not set"}
    if not sender:
        return {"status": "degraded", "hint": "SENDER_EMAIL not set — verified sender required"}
    return {"status": "ok", "hint": "Configured (no side-effect ping available)"}


async def _probe_twilio() -> dict[str, Any]:
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    tok = os.environ.get("TWILIO_AUTH_TOKEN", "")
    frm = os.environ.get("TWILIO_FROM_NUMBER", "")
    if not (sid and tok):
        return {"status": "not_configured", "hint": "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set"}
    if not frm:
        return {"status": "degraded", "hint": "TWILIO_FROM_NUMBER not set"}
    # Try a real Twilio API health ping
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}.json",
                auth=(sid, tok),
            )
        if r.status_code == 200:
            return {"status": "ok"}
        return {"status": "degraded", "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"status": "down", "error": str(e)[:200]}


async def _probe_daraja() -> dict[str, Any]:
    from routers.mpesa import daraja
    if not daraja.configured():
        return {"status": "not_configured", "hint": "MPESA_CONSUMER_KEY / SECRET / PASSKEY not set"}
    try:
        tok = await asyncio.wait_for(daraja.token(), timeout=5)
        return {"status": "ok", "token_preview": tok[:6] + "…",
                "env": os.environ.get("MPESA_ENV", "sandbox")}
    except Exception as e:
        return {"status": "down", "error": str(e)[:200]}


async def _probe_stripe() -> dict[str, Any]:
    key = os.environ.get("STRIPE_API_KEY", "")
    if not key:
        return {"status": "not_configured", "hint": "STRIPE_API_KEY not set"}
    # Hit the Stripe Account endpoint as a cheap ping
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get("https://api.stripe.com/v1/account",
                            headers={"Authorization": f"Bearer {key}"})
        if r.status_code in (200, 401):
            # 401 means the key is malformed — surface that
            return ({"status": "ok"} if r.status_code == 200
                    else {"status": "degraded", "error": "Invalid API key"})
        return {"status": "degraded", "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"status": "down", "error": str(e)[:200]}


async def _probe_epra() -> dict[str, Any]:
    """Check that our fuel-price feed is reachable."""
    try:
        from services.epra import get_fuel_prices
        data = await asyncio.wait_for(get_fuel_prices("nairobi"), timeout=5)
        if data.get("ok"):
            return {"status": "ok", "source": data.get("source", "epra")}
        return {"status": "degraded", "error": "EPRA returned not-ok"}
    except Exception as e:
        return {"status": "down", "error": str(e)[:200]}


# ---------------------------------------------------------------------------
# Aggregate + summary
# ---------------------------------------------------------------------------
async def run_health_check() -> dict[str, Any]:
    """Run all probes in parallel, compute a summary, and cache the snapshot."""
    probes = {
        "mongo": _probe_mongo(),
        "resend": _probe_resend(),
        "twilio": _probe_twilio(),
        "daraja": _probe_daraja(),
        "stripe": _probe_stripe(),
        "epra": _probe_epra(),
    }
    results = await asyncio.gather(*probes.values(), return_exceptions=True)
    services: dict[str, Any] = {}
    for name, res in zip(probes.keys(), results):
        if isinstance(res, Exception):
            services[name] = {"status": "down", "error": str(res)[:200]}
        else:
            services[name] = res

    # Summary precedence: down > degraded > not_configured > ok
    statuses = [s.get("status", "down") for s in services.values()]
    if "down" in statuses:
        summary = "down"
    elif "degraded" in statuses:
        summary = "degraded"
    elif all(s == "not_configured" for s in statuses):
        summary = "not_configured"
    elif "not_configured" in statuses:
        summary = "partial"
    else:
        summary = "ok"

    snapshot = {
        "ts": now_iso(),
        "summary": summary,
        "services": services,
    }

    # Detect state changes vs previous snapshot — only audit-log when status flips
    prev_services = _latest.get("services", {})
    changes = []
    for name, info in services.items():
        prev = prev_services.get(name, {}).get("status")
        cur = info.get("status")
        if prev and prev != cur:
            changes.append({"service": name, "from": prev, "to": cur, "info": info})

    if changes:
        await write_audit_log(
            "founder", "founder.health_changed",
            meta={"changes": changes, "summary": summary},
        )
        log.info("Health watchdog: %s changes — %s", len(changes),
                 [f"{c['service']}:{c['from']}→{c['to']}" for c in changes])

    # Cache snapshot in memory + persist for cross-restart history
    _latest.update(snapshot)
    await db.health_snapshots.insert_one({"id": new_id(), **snapshot})

    return snapshot


async def watchdog_scheduler():
    """Long-running task that polls health every WATCHDOG_INTERVAL_SECONDS."""
    interval = int(os.environ.get("WATCHDOG_INTERVAL_SECONDS", "300"))  # default 5 min
    log.info("Health watchdog scheduler running every %s seconds", interval)
    # Initial poll right away so the dashboard has data immediately
    await asyncio.sleep(5)
    while True:
        try:
            await run_health_check()
        except Exception as e:
            log.warning("Health watchdog poll failed: %s", e)
        await asyncio.sleep(interval)


# ---------------------------------------------------------------------------
# API endpoints (founder-scope)
# ---------------------------------------------------------------------------
@router.get("/founder/health")
async def get_health(_=Depends(require_founder), refresh: bool = False):
    """Return the latest health snapshot. ?refresh=true forces a fresh probe."""
    if refresh or not _latest.get("ts"):
        await run_health_check()
    # Compute age so the UI can show "Updated X seconds ago"
    age = None
    if _latest.get("ts"):
        try:
            ts = datetime.fromisoformat(_latest["ts"].replace("Z", "+00:00"))
            age = int((datetime.now(timezone.utc) - ts).total_seconds())
        except Exception:
            age = None
    return {"ok": True, "snapshot": _latest, "age_seconds": age}


@router.get("/founder/health/history")
async def health_history(_=Depends(require_founder), limit: int = 100):
    rows = await db.health_snapshots.find({}, {"_id": 0}).sort("ts", -1).to_list(limit)
    return {"items": rows, "total": len(rows), "ok": True}
