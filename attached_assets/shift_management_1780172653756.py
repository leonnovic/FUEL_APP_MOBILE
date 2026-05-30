"""Shift Management & Handover System.

Tracks attendant shifts, cash handovers, and variance reporting.
Supports shift start/end, cash reconciliation, and handover notes.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import db, get_current_user, log, new_id, now_iso

router = APIRouter()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class ShiftStart(BaseModel):
    station_id: str = Field(min_length=1, max_length=128)
    attendant_id: str = Field(min_length=1, max_length=128)
    opening_cash: float = Field(ge=0)
    fuel_readings: dict[str, float] = Field(default_factory=dict)
    notes: Optional[str] = Field(default=None, max_length=1000)

class ShiftEnd(BaseModel):
    shift_id: str = Field(min_length=1, max_length=128)
    closing_cash: float = Field(ge=0)
    fuel_readings: dict[str, float] = Field(default_factory=dict)
    total_sales: float = Field(ge=0)
    total_expenses: float = Field(default=0, ge=0)
    notes: Optional[str] = Field(default=None, max_length=1000)

class ShiftHandover(BaseModel):
    shift_id: str = Field(min_length=1, max_length=128)
    recipient_attendant_id: str = Field(min_length=1, max_length=128)
    handover_notes: Optional[str] = Field(default=None, max_length=2000)
    discrepancies: list[dict[str, Any]] = Field(default_factory=list)

class ShiftFilter(BaseModel):
    station_id: Optional[str] = None
    attendant_id: Optional[str] = None
    status: Optional[str] = None  # "active", "closed", "handed_over"
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=500)

# ---------------------------------------------------------------------------
# Shift Operations
# ---------------------------------------------------------------------------
@router.post("/shifts/start")
async def start_shift(body: ShiftStart, user: dict = Depends(get_current_user)):
    """Start a new shift. Automatically closes any existing active shift for the attendant."""
    now = now_iso()

    # Check if attendant already has an active shift
    existing = await db.shifts.find_one({
        "user_id": user["id"],
        "attendant_id": body.attendant_id,
        "status": "active",
    })

    if existing:
        # Auto-close the existing shift
        await db.shifts.update_one(
            {"id": existing["id"]},
            {"$set": {
                "status": "auto_closed",
                "closed_at": now,
                "auto_close_reason": "New shift started",
                "updated_at": now,
            }},
        )
        log.info("Auto-closed existing shift %s for attendant %s", existing["id"], body.attendant_id)

    shift = {
        "id": new_id(),
        "user_id": user["id"],
        "station_id": body.station_id,
        "attendant_id": body.attendant_id,
        "opening_cash": body.opening_cash,
        "fuel_readings_open": body.fuel_readings,
        "closing_cash": None,
        "fuel_readings_close": None,
        "total_sales": 0,
        "total_expenses": 0,
        "cash_variance": None,
        "fuel_variance": {},
        "status": "active",
        "started_at": now,
        "closed_at": None,
        "handed_over_at": None,
        "notes": body.notes,
        "handover_notes": None,
        "discrepancies": [],
        "created_at": now,
        "updated_at": now,
    }

    await db.shifts.insert_one(shift)

    await db.audit_log.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "action": "shift.started",
        "at": now,
        "meta": {
            "shift_id": shift["id"],
            "station_id": body.station_id,
            "attendant_id": body.attendant_id,
        },
    })

    return {"ok": True, "shift": shift}

@router.post("/shifts/end")
async def end_shift(body: ShiftEnd, user: dict = Depends(get_current_user)):
    """End an active shift with cash and fuel reconciliation."""
    now = now_iso()

    shift = await db.shifts.find_one({
        "id": body.shift_id,
        "user_id": user["id"],
        "status": "active",
    })

    if not shift:
        raise HTTPException(status_code=404, detail="Active shift not found")

    # Calculate variances
    cash_variance = body.closing_cash - shift["opening_cash"] - body.total_sales + body.total_expenses

    fuel_variance = {}
    for fuel_type, close_reading in body.fuel_readings.items():
        open_reading = shift.get("fuel_readings_open", {}).get(fuel_type, 0)
        fuel_variance[fuel_type] = round(close_reading - open_reading, 2)

    update = {
        "closing_cash": body.closing_cash,
        "fuel_readings_close": body.fuel_readings,
        "total_sales": body.total_sales,
        "total_expenses": body.total_expenses,
        "cash_variance": round(cash_variance, 2),
        "fuel_variance": fuel_variance,
        "status": "closed",
        "closed_at": now,
        "notes": body.notes or shift.get("notes"),
        "updated_at": now,
    }

    await db.shifts.update_one({"id": body.shift_id}, {"$set": update})

    # Refresh shift data
    shift = await db.shifts.find_one({"id": body.shift_id}, {"_id": 0})

    await db.audit_log.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "action": "shift.ended",
        "at": now,
        "meta": {
            "shift_id": body.shift_id,
            "cash_variance": cash_variance,
            "fuel_variance": fuel_variance,
        },
    })

    return {"ok": True, "shift": shift}

@router.post("/shifts/handover")
async def handover_shift(body: ShiftHandover, user: dict = Depends(get_current_user)):
    """Record a shift handover from one attendant to another."""
    now = now_iso()

    shift = await db.shifts.find_one({
        "id": body.shift_id,
        "user_id": user["id"],
    })

    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    if shift["status"] == "active":
        raise HTTPException(status_code=400, detail="Cannot handover an active shift. End it first.")

    await db.shifts.update_one(
        {"id": body.shift_id},
        {"$set": {
            "status": "handed_over",
            "handed_over_at": now,
            "recipient_attendant_id": body.recipient_attendant_id,
            "handover_notes": body.handover_notes,
            "discrepancies": body.discrepancies,
            "updated_at": now,
        }},
    )

    await db.audit_log.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "action": "shift.handed_over",
        "at": now,
        "meta": {
            "shift_id": body.shift_id,
            "recipient_attendant_id": body.recipient_attendant_id,
        },
    })

    return {"ok": True, "shift_id": body.shift_id, "status": "handed_over"}

@router.get("/shifts")
async def list_shifts(
    station_id: Optional[str] = None,
    attendant_id: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    """List shifts with filtering and pagination."""
    limit = min(max(limit, 1), 500)
    query = {"user_id": user["id"]}

    if station_id:
        query["station_id"] = station_id
    if attendant_id:
        query["attendant_id"] = attendant_id
    if status:
        query["status"] = status
    if from_date or to_date:
        query["started_at"] = {}
        if from_date:
            query["started_at"]["$gte"] = from_date
        if to_date:
            query["started_at"]["$lte"] = to_date

    rows = await db.shifts.find(
        query, {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)

    return {
        "items": rows,
        "ok": True,
        "total": len(rows),
    }

@router.get("/shifts/{shift_id}")
async def get_shift(shift_id: str, user: dict = Depends(get_current_user)):
    """Get a single shift by ID."""
    shift = await db.shifts.find_one(
        {"id": shift_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    return {"shift": shift, "ok": True}

@router.get("/shifts/{shift_id}/variance")
async def get_shift_variance(shift_id: str, user: dict = Depends(get_current_user)):
    """Get detailed variance report for a shift."""
    shift = await db.shifts.find_one(
        {"id": shift_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    # Get sales during shift period
    sales = await db.sync_sales.find({
        "user_id": user["id"],
        "date": {
            "$gte": shift["started_at"][:10],
            "$lte": (shift["closed_at"] or now_iso())[:10],
        },
    }, {"_id": 0}).to_list(1000)

    # Get expenses during shift period
    expenses = await db.sync_expenses.find({
        "user_id": user["id"],
        "date": {
            "$gte": shift["started_at"][:10],
            "$lte": (shift["closed_at"] or now_iso())[:10],
        },
    }, {"_id": 0}).to_list(1000)

    return {
        "ok": True,
        "shift_id": shift_id,
        "cash_variance": shift.get("cash_variance"),
        "fuel_variance": shift.get("fuel_variance"),
        "total_sales_recorded": sum(float(s.get("amount", 0)) for s in sales),
        "total_expenses_recorded": sum(float(e.get("amount", 0)) for e in expenses),
        "sales_count": len(sales),
        "expenses_count": len(expenses),
    }

@router.get("/shifts/summary/daily")
async def daily_shift_summary(
    date: Optional[str] = None,
    station_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Get daily shift summary with aggregated metrics."""
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = {
        "user_id": user["id"],
        "started_at": {"$regex": f"^{target_date}"},
    }
    if station_id:
        query["station_id"] = station_id

    shifts = await db.shifts.find(query, {"_id": 0}).to_list(100)

    total_sales = sum(s.get("total_sales", 0) for s in shifts)
    total_expenses = sum(s.get("total_expenses", 0) for s in shifts)
    total_variance = sum(s.get("cash_variance", 0) or 0 for s in shifts)

    return {
        "ok": True,
        "date": target_date,
        "station_id": station_id,
        "shifts_count": len(shifts),
        "total_sales": round(total_sales, 2),
        "total_expenses": round(total_expenses, 2),
        "net_cash": round(total_sales - total_expenses, 2),
        "total_variance": round(total_variance, 2),
        "shifts": [
            {
                "id": s["id"],
                "attendant_id": s["attendant_id"],
                "status": s["status"],
                "started_at": s["started_at"],
                "cash_variance": s.get("cash_variance"),
            }
            for s in shifts
        ],
    }
