"""AI services backed by the Emergent LLM key.

Currently provides M-PESA inflow ↔ sales reconciliation.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Any

log = logging.getLogger("fuelpro.ai")


_RECONCILE_SYSTEM_MSG = (
    "You are a forensic accounting assistant. You match M-PESA inflow receipts "
    "to fuel-station sales records. Match strictly by AMOUNT plus DATE-TIME PROXIMITY "
    "(within 30 minutes), and only return high-confidence matches. Return ONLY valid JSON "
    "in the shape: {\"matches\":[{\"inflow_receipt\":\"\",\"sale_id\":\"\",\"confidence\":0.0,\"reason\":\"\"}],"
    "\"unmatched_inflows\":[\"...\"],\"unmatched_sales\":[\"...\"]}"
)


def _empty_reconciliation(inflows: list, sales: list) -> dict:
    return {
        "ok": True, "matches": [],
        "unmatched_inflows": [i.get("receipt") for i in inflows],
        "unmatched_sales": [s.get("id") for s in sales],
        "note": "Need at least one inflow and one sale to reconcile.",
    }


def _summarise_for_prompt(inflows: list, sales: list) -> tuple[list, list]:
    """Trim/normalise payload so we don't blow the LLM context window."""
    inflow_brief = [
        {"receipt": i.get("receipt"), "date": i.get("date"), "time": i.get("time"),
         "amount": i.get("paidIn") or i.get("amount"),
         "sender": i.get("senderName") or i.get("details")}
        for i in inflows[:50]
    ]
    sales_brief = [
        {"id": s.get("id"), "date": s.get("date"), "time": s.get("time"),
         "amount": s.get("amount") or s.get("total"),
         "method": s.get("paymentMethod"), "attendant": s.get("attendant")}
        for s in sales[:50]
    ]
    return inflow_brief, sales_brief


def _parse_llm_json(text: str) -> dict:
    """Strip markdown fencing, parse JSON, fall back to the first {...} block."""
    s = text.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.lower().startswith("json"):
            s = s[4:].strip()
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        import re
        m = re.search(r"\{.*\}", s, re.DOTALL)
        if not m:
            raise
        return json.loads(m.group(0))


async def _call_llm_for_reconciliation(api_key: str, inflow_brief: list, sales_brief: list) -> str:
    """Send the prompt to the LLM and return the raw reply text."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage  # local import — optional dep

    user_msg = (
        "Inflows (M-PESA):\n" + json.dumps(inflow_brief, ensure_ascii=False) +
        "\n\nSales (POS):\n" + json.dumps(sales_brief, ensure_ascii=False) +
        "\n\nReturn the JSON only — no commentary."
    )
    chat = (LlmChat(api_key=api_key, session_id=f"recon-{uuid.uuid4().hex[:10]}",
                    system_message=_RECONCILE_SYSTEM_MSG)
            .with_model("openai", "gpt-4o-mini"))
    reply = await chat.send_message(UserMessage(text=user_msg))
    return reply if isinstance(reply, str) else str(reply)


async def reconcile_mpesa_with_sales(
    inflows: list[dict[str, Any]],
    sales: list[dict[str, Any]],
) -> dict[str, Any]:
    """Use an LLM to match M-PESA inflows against sales records."""
    if not inflows or not sales:
        return _empty_reconciliation(inflows, sales)

    api_key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    if not api_key:
        return {"ok": False, "error": "EMERGENT_LLM_KEY not set"}

    inflow_brief, sales_brief = _summarise_for_prompt(inflows, sales)
    try:
        text = await _call_llm_for_reconciliation(api_key, inflow_brief, sales_brief)
    except ImportError as e:
        return {"ok": False, "error": f"emergentintegrations not available: {e}"}
    except Exception as e:
        log.exception("AI reconciliation failed")
        return {"ok": False, "error": str(e)}

    try:
        data = _parse_llm_json(text)
    except json.JSONDecodeError:
        return {"ok": False, "error": "LLM returned non-JSON", "raw": text[:400]}
    data["ok"] = True
    return data
