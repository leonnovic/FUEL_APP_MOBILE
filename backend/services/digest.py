"""Daily Reconciliation Digest — scheduled background task.

Once a day (default 07:00 in the user's saved timezone, fallback Africa/Nairobi)
we compute a per-user summary of yesterday's M-PESA inflows vs sales and email
it via Resend. Falls back to logging if Resend isn't configured.

Owners can also trigger an on-demand preview via `POST /api/digest/preview`.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

log = logging.getLogger("fuelpro.digest")


def _yesterday_iso(tz_offset_minutes: int = 180) -> tuple[str, str]:
    """Return (date_str, friendly_label) for 'yesterday' in user's timezone.
    180 minutes default = UTC+3 (Africa/Nairobi).
    """
    user_now = datetime.now(timezone.utc) + timedelta(minutes=tz_offset_minutes)
    y = user_now - timedelta(days=1)
    return y.date().isoformat(), y.strftime("%A, %d %B %Y")


async def build_digest_for_user(db, user: dict, *, override_date: str | None = None) -> dict[str, Any]:
    """Pull the user's data for `override_date` (default: yesterday) and run AI reconciliation."""
    from services.ai import reconcile_mpesa_with_sales

    if override_date:
        try:
            dt = datetime.fromisoformat(override_date).date()
            date_str = dt.isoformat()
            friendly = dt.strftime("%A, %d %B %Y")
        except ValueError:
            date_str, friendly = _yesterday_iso()
    else:
        date_str, friendly = _yesterday_iso()

    user_id = user["id"]

    # Pull yesterday's items from the per-user sync collections
    sales_rows = await db.sync_sales.find({"user_id": user_id}, {"_id": 0}).to_list(2000)
    inflows_doc = await db.user_data.find_one({"user_id": user_id}, {"_id": 0})
    inflows = []
    if inflows_doc and isinstance(inflows_doc.get("data"), dict):
        inflows = inflows_doc["data"].get("mpesaInflows", []) or []

    # Filter to yesterday
    sales = [s for s in sales_rows if str(s.get("date", "")).startswith(date_str)]
    yest_inflows = [i for i in inflows if str(i.get("date", "")).startswith(date_str)]

    total_sales = sum(float(s.get("amount") or s.get("total") or 0) for s in sales)
    total_inflow = sum(float(i.get("paidIn") or i.get("amount") or 0) for i in yest_inflows)

    if not sales and not yest_inflows:
        return {
            "ok": True, "user_id": user_id, "date": date_str, "label": friendly,
            "sales_count": 0, "inflows_count": 0, "matched": 0,
            "total_sales_kes": 0.0, "total_inflow_kes": 0.0,
            "skipped": "no_activity",
        }

    recon = await reconcile_mpesa_with_sales(yest_inflows, sales)
    matches = recon.get("matches", []) if recon.get("ok") else []
    unmatched_inflows = recon.get("unmatched_inflows", [])
    unmatched_sales = recon.get("unmatched_sales", [])

    return {
        "ok": True, "user_id": user_id, "user_email": user.get("email"),
        "user_name": user.get("name", ""),
        "date": date_str, "label": friendly,
        "sales_count": len(sales), "inflows_count": len(yest_inflows),
        "matched": len(matches),
        "unmatched_inflows": unmatched_inflows,
        "unmatched_sales": unmatched_sales,
        "total_sales_kes": round(total_sales, 2),
        "total_inflow_kes": round(total_inflow, 2),
        "delta_kes": round(total_sales - total_inflow, 2),
        "ai_ok": recon.get("ok", False),
        "ai_error": recon.get("error") if not recon.get("ok") else None,
    }


def render_digest_html(d: dict[str, Any]) -> str:
    safe_name = (d.get("user_name") or "there").replace("<", "&lt;")
    badge_color = "#22c55e" if d["matched"] >= max(d["sales_count"], d["inflows_count"]) else "#f59e0b"

    rows = ""
    if d.get("skipped") == "no_activity":
        rows = (
            "<tr><td style=\"padding:18px;color:#a3a3a3;text-align:center\">"
            "No M-PESA or sales activity yesterday."
            "</td></tr>"
        )
    else:
        def kv(label: str, value: str, accent: str = "#e5e5e5") -> str:
            return (
                f"<tr><td style=\"padding:8px 0;color:#a3a3a3;font-size:13px\">{label}</td>"
                f"<td style=\"padding:8px 0;color:{accent};font-size:14px;text-align:right;font-weight:700\">{value}</td></tr>"
            )
        rows = (
            kv("Sales recorded", f"{d['sales_count']}")
            + kv("M-PESA inflows", f"{d['inflows_count']}")
            + kv("AI-matched", f"<span style=\"color:{badge_color}\">{d['matched']}</span>")
            + kv("Total sales", f"Ksh {d['total_sales_kes']:,.2f}")
            + kv("Total M-PESA", f"Ksh {d['total_inflow_kes']:,.2f}")
            + kv("Delta (sales − inflow)", f"Ksh {d['delta_kes']:,.2f}",
                  "#22c55e" if d["delta_kes"] >= 0 else "#ef4444")
        )

    unmatched_section = ""
    if d.get("unmatched_inflows"):
        items = "".join(
            f"<li style=\"padding:4px 0;color:#fbbf24;font-family:monospace;font-size:12px\">{r}</li>"
            for r in d["unmatched_inflows"][:10]
        )
        unmatched_section += (
            f"<div style=\"margin-top:20px\"><h3 style=\"color:#fbbf24;font-size:13px;margin:0 0 6px\">"
            f"⚠ Inflows without a matching sale</h3>"
            f"<ul style=\"margin:0;padding-left:18px\">{items}</ul></div>"
        )
    if d.get("unmatched_sales"):
        items = "".join(
            f"<li style=\"padding:4px 0;color:#f87171;font-family:monospace;font-size:12px\">{r}</li>"
            for r in d["unmatched_sales"][:10]
        )
        unmatched_section += (
            f"<div style=\"margin-top:14px\"><h3 style=\"color:#f87171;font-size:13px;margin:0 0 6px\">"
            f"⚠ Sales without a matching inflow</h3>"
            f"<ul style=\"margin:0;padding-left:18px\">{items}</ul></div>"
        )

    return (
        f"<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a0a0a;"
        f"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;padding:40px 0\">"
        f"<tr><td align=\"center\">"
        f"<table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#171717;border:1px solid #262626;"
        f"border-radius:14px;padding:36px\">"
        f"<tr><td>"
        f"<h1 style=\"margin:0;font-size:22px;color:#f59e0b\">FuelPro Daily Digest</h1>"
        f"<p style=\"margin:4px 0 24px;color:#a3a3a3;font-size:13px\">{d['label']}</p>"
        f"<p style=\"margin:0 0 18px\">Good morning {safe_name},</p>"
        f"<p style=\"margin:0 0 18px\">Here's how yesterday looked at your station:</p>"
        f"<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">"
        f"{rows}"
        f"</table>"
        f"{unmatched_section}"
        f"<p style=\"margin-top:32px;color:#737373;font-size:11px;text-align:center\">"
        f"Sent by FuelPro · AI reconciliation runs once a day · "
        f"Reply STOP to unsubscribe</p>"
        f"</td></tr></table></td></tr></table>"
    )


async def send_digest_to_user(db, user: dict, *, override_date: str | None = None) -> dict[str, Any]:
    import uuid as _uuid
    from services.notifications import send_email
    d = await build_digest_for_user(db, user, override_date=override_date)

    subject = (
        f"FuelPro Digest · {d['label']} · {d['matched']}/{max(d['sales_count'], d['inflows_count']) or 0} matched"
        if d.get("skipped") != "no_activity"
        else f"FuelPro Digest · {d['label']} · No activity"
    )

    html = render_digest_html(d)
    delivery = await send_email(
        to=user["email"],
        subject=subject,
        html=html,
        text=f"Sales: {d.get('sales_count', 0)} · Inflows: {d.get('inflows_count', 0)} · Matched: {d.get('matched', 0)}",
    )

    # Store the digest in Mongo so the UI can preview it
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.daily_digests.update_one(
        {"user_id": user["id"], "date": d["date"]},
        {"$set": {**d, "delivery": delivery, "sent_at": now_iso}},
        upsert=True,
    )
    # Audit trail (parity with ai.reconcile_mpesa + auth.password_reset)
    await db.audit_log.insert_one({
        "id": str(_uuid.uuid4()),
        "user_id": user["id"],
        "action": "digest.send",
        "at": now_iso,
        "meta": {
            "date": d["date"],
            "delivery_ok": delivery.get("ok", False),
            "delivery_skipped": delivery.get("skipped"),
            "matched": d.get("matched", 0),
            "sales_count": d.get("sales_count", 0),
            "inflows_count": d.get("inflows_count", 0),
        },
    })
    return {"digest": d, "delivery": delivery}


async def run_daily_digest_for_all(db) -> dict[str, int]:
    """Iterate every active user and send their digest. Called by the scheduler."""
    sent = 0
    skipped = 0
    failed = 0
    cursor = db.users.find({}, {"_id": 0})
    async for user in cursor:
        try:
            r = await send_digest_to_user(db, user)
            if r["delivery"].get("ok"):
                sent += 1
            else:
                skipped += 1
        except Exception as e:
            failed += 1
            log.exception("Digest failed for user %s: %s", user.get("email"), e)
    log.info("Daily digest: sent=%d skipped=%d failed=%d", sent, skipped, failed)
    return {"sent": sent, "skipped": skipped, "failed": failed}


# ── Scheduler ────────────────────────────────────────────────────────────────
async def digest_scheduler(db, target_hour_utc: int | None = None):
    """Fire `run_daily_digest_for_all` once per day at `target_hour_utc` (UTC).
    Defaults to 04:00 UTC = 07:00 Africa/Nairobi.
    """
    target_hour = (
        int(os.environ.get("DIGEST_HOUR_UTC", "4")) if target_hour_utc is None else target_hour_utc
    )
    log.info("Digest scheduler started — firing daily at %02d:00 UTC", target_hour)
    while True:
        now = datetime.now(timezone.utc)
        next_run = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
        wait = (next_run - now).total_seconds()
        log.info("Digest: next run at %s (in %.0fs)", next_run.isoformat(), wait)
        try:
            await asyncio.sleep(wait)
            await run_daily_digest_for_all(db)
        except asyncio.CancelledError:
            log.info("Digest scheduler cancelled")
            return
        except Exception as e:
            log.exception("Digest scheduler error: %s", e)
            await asyncio.sleep(300)
