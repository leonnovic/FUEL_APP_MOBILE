"""Notifications: Resend email + Twilio SMS, both with graceful no-key fallback.

These services read env vars at every call so users can paste keys into
/app/backend/.env without restarting the backend (load_dotenv is called on
the first import; for hot reload, just `supervisorctl restart backend`).
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Optional

import httpx

log = logging.getLogger("fuelpro.notifications")


# ── Resend (email) ──────────────────────────────────────────────────────────────
async def send_email(
    to: str | list[str],
    subject: str,
    *,
    html: Optional[str] = None,
    text: Optional[str] = None,
) -> dict[str, Any]:
    """Send a transactional email via Resend.

    Returns:
        {"ok": True, "id": "..."}                — real send
        {"ok": False, "skipped": "no_key", ...} — missing creds, graceful no-op
        {"ok": False, "error": "..."}           — API call failed
    """
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sender_email = os.environ.get("SENDER_EMAIL", "").strip() or "onboarding@resend.dev"
    sender_name = os.environ.get("SENDER_NAME", "").strip() or "FuelPro"

    recipients = [to] if isinstance(to, str) else to

    if not api_key:
        log.info("send_email skipped — RESEND_API_KEY not set (subject=%r, to=%s)", subject, recipients)
        return {
            "ok": False, "skipped": "no_key",
            "message": "Set RESEND_API_KEY in /app/backend/.env to enable real emails",
        }

    if not html and not text:
        return {"ok": False, "error": "either html or text body is required"}

    try:
        import resend
        resend.api_key = api_key
        params: dict[str, Any] = {
            "from": f"{sender_name} <{sender_email}>",
            "to": recipients,
            "subject": subject,
        }
        if html:
            params["html"] = html
        if text:
            params["text"] = text
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"ok": True, "id": result.get("id")}
    except Exception as e:
        log.exception("Resend send failed")
        return {"ok": False, "error": str(e)}


# ── Twilio (SMS) ────────────────────────────────────────────────────────────────
async def send_sms(to: str, body: str) -> dict[str, Any]:
    """Send an SMS via Twilio.

    Returns the same shape as send_email.
    """
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "").strip()

    if not (sid and token and from_number):
        log.info("send_sms skipped — Twilio creds incomplete (to=%s)", to)
        return {
            "ok": False, "skipped": "no_key",
            "message": "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in /app/backend/.env",
        }

    if not to.startswith("+"):
        # Defensive normalisation for Kenyan numbers
        digits = "".join(c for c in to if c.isdigit())
        if digits.startswith("0") and len(digits) == 10:
            to = f"+254{digits[1:]}"
        elif digits.startswith("254") and len(digits) == 12:
            to = f"+{digits}"
        elif len(digits) >= 9:
            to = f"+{digits}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    data = {"From": from_number, "To": to, "Body": body[:1500]}
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(url, data=data, auth=(sid, token))
        if r.status_code >= 400:
            return {"ok": False, "error": r.text, "status_code": r.status_code}
        j = r.json()
        return {"ok": True, "sid": j.get("sid"), "status": j.get("status")}
    except Exception as e:
        log.exception("Twilio send failed")
        return {"ok": False, "error": str(e)}


# ── HTML templates ──────────────────────────────────────────────────────────────
def password_reset_email_html(name: str, code: str, reset_url: Optional[str] = None) -> str:
    safe_name = (name or "there").replace("<", "&lt;").replace(">", "&gt;")
    safe_code = (code or "").replace("<", "&lt;").replace(">", "&gt;")
    cta = (
        f'<a href="{reset_url}" style="display:inline-block;background:#f59e0b;color:#000;'
        f'padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">'
        f'Reset your password</a>'
    ) if reset_url else ""
    return (
        f"<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a0a0a;"
        f"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;padding:40px 0\">"
        f"<tr><td align=\"center\">"
        f"<table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#171717;border:1px solid #262626;"
        f"border-radius:14px;padding:36px\">"
        f"<tr><td><h1 style=\"margin:0 0 8px;font-size:22px;color:#f59e0b\">FuelPro</h1>"
        f"<p style=\"margin:0 0 20px;color:#a3a3a3;font-size:13px\">Password reset request</p>"
        f"<p>Hi {safe_name},</p>"
        f"<p>Use the code below to reset your FuelPro password. It expires in 30 minutes.</p>"
        f"<div style=\"background:#000;border:1px solid #f59e0b;border-radius:10px;padding:18px;"
        f"text-align:center;font-size:28px;font-weight:800;letter-spacing:6px;color:#f59e0b;margin:18px 0\">"
        f"{safe_code}</div>"
        f"<p style=\"text-align:center;margin:24px 0\">{cta}</p>"
        f"<p style=\"color:#737373;font-size:12px;margin-top:24px\">Didn't request this? You can safely ignore this email.</p>"
        f"</td></tr></table></td></tr></table>"
    )


def invite_email_html(inviter: str, station: str, accept_url: str, role: str) -> str:
    safe_inviter = (inviter or "").replace("<", "&lt;").replace(">", "&gt;")
    safe_station = (station or "").replace("<", "&lt;").replace(">", "&gt;")
    return (
        f"<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#0a0a0a;"
        f"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;padding:40px 0\">"
        f"<tr><td align=\"center\">"
        f"<table width=\"560\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#171717;border:1px solid #262626;"
        f"border-radius:14px;padding:36px\">"
        f"<tr><td><h1 style=\"margin:0 0 8px;font-size:22px;color:#f59e0b\">You're invited to FuelPro</h1>"
        f"<p style=\"margin:0 0 20px;color:#a3a3a3;font-size:13px\">Join {safe_station} as <b>{role}</b></p>"
        f"<p>{safe_inviter} has invited you to collaborate on their FuelPro station.</p>"
        f"<p style=\"text-align:center;margin:28px 0\">"
        f"<a href=\"{accept_url}\" style=\"display:inline-block;background:#f59e0b;color:#000;"
        f"padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700\">Accept invite</a>"
        f"</p>"
        f"<p style=\"color:#737373;font-size:12px;margin-top:24px\">If you weren't expecting this, you can ignore the email.</p>"
        f"</td></tr></table></td></tr></table>"
    )
