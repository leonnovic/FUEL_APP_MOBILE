"""Advanced Analytics Dashboard API.

Provides trend analysis, forecasting, anomaly detection, and KPI metrics
for fuel station operations.
"""

from __future__ import annotations

import statistics
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import db, get_current_user, log, now_iso

router = APIRouter()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class DateRange(BaseModel):
    from_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    to_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    station_id: Optional[str] = None

class ForecastRequest(BaseModel):
    metric: str = Field(pattern="^(sales|expenses|inventory)$")
    days_ahead: int = Field(default=7, ge=1, le=90)
    station_id: Optional[str] = None

# ---------------------------------------------------------------------------
# KPI Metrics
# ---------------------------------------------------------------------------
@router.post("/analytics/kpi")
async def get_kpi_metrics(body: DateRange, user: dict = Depends(get_current_user)):
    """Get key performance indicators for the date range."""
    query = {
        "user_id": user["id"],
        "date": {"$gte": body.from_date, "$lte": body.to_date},
    }
    if body.station_id:
        query["station_id"] = body.station_id

    # Sales metrics
    sales = await db.sync_sales.find(query, {"_id": 0}).to_list(10000)
    total_sales = sum(float(s.get("amount", 0) or s.get("total", 0)) for s in sales)
    sales_count = len(sales)
    avg_sale = total_sales / sales_count if sales_count > 0 else 0

    # Expense metrics
    expenses = await db.sync_expenses.find(query, {"_id": 0}).to_list(10000)
    total_expenses = sum(float(e.get("amount", 0)) for e in expenses)

    # Profit margin
    gross_profit = total_sales - total_expenses
    profit_margin = (gross_profit / total_sales * 100) if total_sales > 0 else 0

    # Fuel type breakdown
    fuel_breakdown: dict[str, dict[str, float]] = {}
    for sale in sales:
        fuel_type = sale.get("fuel_type", sale.get("fuelType", "Unknown"))
        amount = float(sale.get("amount", 0) or sale.get("total", 0))
        liters = float(sale.get("liters", 0) or sale.get("quantity_liters", 0))
        if fuel_type not in fuel_breakdown:
            fuel_breakdown[fuel_type] = {"sales": 0, "liters": 0, "count": 0}
        fuel_breakdown[fuel_type]["sales"] += amount
        fuel_breakdown[fuel_type]["liters"] += liters
        fuel_breakdown[fuel_type]["count"] += 1

    # Daily trend
    daily_sales: dict[str, float] = {}
    for sale in sales:
        date = sale.get("date", "")[:10]
        if date:
            daily_sales[date] = daily_sales.get(date, 0) + float(sale.get("amount", 0) or sale.get("total", 0))

    # Top performing day
    top_day = max(daily_sales.items(), key=lambda x: x[1]) if daily_sales else (None, 0)

    return {
        "ok": True,
        "period": {"from": body.from_date, "to": body.to_date},
        "kpis": {
            "total_sales": round(total_sales, 2),
            "total_expenses": round(total_expenses, 2),
            "gross_profit": round(gross_profit, 2),
            "profit_margin_pct": round(profit_margin, 2),
            "sales_count": sales_count,
            "avg_sale_value": round(avg_sale, 2),
            "transactions_per_day": round(sales_count / max(len(daily_sales), 1), 1),
            "top_day": {"date": top_day[0], "amount": round(top_day[1], 2)} if top_day[0] else None,
        },
        "fuel_breakdown": {
            ft: {
                "total_sales": round(v["sales"], 2),
                "total_liters": round(v["liters"], 2),
                "transaction_count": v["count"],
                "avg_price_per_liter": round(v["sales"] / v["liters"], 2) if v["liters"] > 0 else 0,
            }
            for ft, v in fuel_breakdown.items()
        },
        "daily_trend": [
            {"date": d, "sales": round(a, 2)}
            for d, a in sorted(daily_sales.items())
        ],
    }

# ---------------------------------------------------------------------------
# Trend Analysis
# ---------------------------------------------------------------------------
@router.post("/analytics/trends")
async def get_trends(body: DateRange, user: dict = Depends(get_current_user)):
    """Get trend analysis with moving averages and growth rates."""
    query = {
        "user_id": user["id"],
        "date": {"$gte": body.from_date, "$lte": body.to_date},
    }
    if body.station_id:
        query["station_id"] = body.station_id

    sales = await db.sync_sales.find(query, {"_id": 0}).to_list(10000)

    # Group by date
    daily: dict[str, float] = {}
    for s in sales:
        date = s.get("date", "")[:10]
        if date:
            daily[date] = daily.get(date, 0) + float(s.get("amount", 0) or s.get("total", 0))

    sorted_dates = sorted(daily.keys())
    values = [daily[d] for d in sorted_dates]

    if len(values) < 2:
        return {
            "ok": True,
            "trend": "insufficient_data",
            "message": "Need at least 2 days of data for trend analysis",
        }

    # Moving averages
    ma_3 = []
    ma_7 = []
    for i in range(len(values)):
        if i >= 2:
            ma_3.append(round(statistics.mean(values[i-2:i+1]), 2))
        if i >= 6:
            ma_7.append(round(statistics.mean(values[i-6:i+1]), 2))

    # Growth rate (day-over-day)
    growth_rates = []
    for i in range(1, len(values)):
        if values[i-1] > 0:
            growth = ((values[i] - values[i-1]) / values[i-1]) * 100
            growth_rates.append(round(growth, 2))

    avg_growth = round(statistics.mean(growth_rates), 2) if growth_rates else 0

    # Trend direction
    if avg_growth > 5:
        trend = "strongly_up"
    elif avg_growth > 0:
        trend = "slightly_up"
    elif avg_growth > -5:
        trend = "slightly_down"
    else:
        trend = "strongly_down"

    # Volatility (standard deviation)
    volatility = round(statistics.stdev(values) if len(values) > 1 else 0, 2)

    return {
        "ok": True,
        "trend": trend,
        "avg_daily_growth_pct": avg_growth,
        "volatility": volatility,
        "moving_averages": {
            "ma_3": ma_3,
            "ma_7": ma_7,
        },
        "growth_rates": growth_rates,
        "data_points": [
            {"date": d, "value": round(daily[d], 2)}
            for d in sorted_dates
        ],
    }

# ---------------------------------------------------------------------------
# Simple Forecasting (Moving Average + Trend)
# ---------------------------------------------------------------------------
@router.post("/analytics/forecast")
async def get_forecast(body: ForecastRequest, user: dict = Depends(get_current_user)):
    """Generate simple forecasts based on historical data."""
    # Get last 30 days of data
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)

    query = {
        "user_id": user["id"],
        "date": {
            "$gte": start_date.strftime("%Y-%m-%d"),
            "$lte": end_date.strftime("%Y-%m-%d"),
        },
    }
    if body.station_id:
        query["station_id"] = body.station_id

    if body.metric == "sales":
        collection = db.sync_sales
        value_field = "amount"
    elif body.metric == "expenses":
        collection = db.sync_expenses
        value_field = "amount"
    else:
        collection = db.sync_inventory
        value_field = "quantity_liters"

    items = await collection.find(query, {"_id": 0}).to_list(10000)

    # Group by date
    daily: dict[str, float] = {}
    for item in items:
        date = item.get("date", "")[:10]
        if date:
            val = float(item.get(value_field, 0) or item.get("total", 0))
            daily[date] = daily.get(date, 0) + val

    sorted_dates = sorted(daily.keys())
    values = [daily[d] for d in sorted_dates]

    if len(values) < 7:
        return {
            "ok": True,
            "forecast": "insufficient_data",
            "message": "Need at least 7 days of data for forecasting",
        }

    # Calculate trend (linear regression on last 14 days)
    n = min(14, len(values))
    recent_values = values[-n:]
    x_mean = (n - 1) / 2
    y_mean = statistics.mean(recent_values)

    numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(recent_values))
    denominator = sum((i - x_mean) ** 2 for i in range(n))
    slope = numerator / denominator if denominator != 0 else 0

    # 7-day moving average as base
    ma_7 = statistics.mean(values[-7:])

    # Generate forecast
    forecasts = []
    for i in range(1, body.days_ahead + 1):
        forecast_value = ma_7 + (slope * i)
        forecast_value = max(forecast_value, 0)  # No negative forecasts
        date = (end_date + timedelta(days=i)).strftime("%Y-%m-%d")
        forecasts.append({
            "date": date,
            "forecast": round(forecast_value, 2),
            "confidence": max(0, round(100 - (i * 5), 2)),  # Decreasing confidence
        })

    return {
        "ok": True,
        "metric": body.metric,
        "historical_avg_7d": round(ma_7, 2),
        "trend_slope": round(slope, 4),
        "trend_direction": "up" if slope > 0 else "down" if slope < 0 else "flat",
        "forecast": forecasts,
    }

# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------
@router.post("/analytics/anomalies")
async def detect_anomalies(body: DateRange, user: dict = Depends(get_current_user)):
    """Detect anomalies in sales data using Z-score method."""
    query = {
        "user_id": user["id"],
        "date": {"$gte": body.from_date, "$lte": body.to_date},
    }
    if body.station_id:
        query["station_id"] = body.station_id

    sales = await db.sync_sales.find(query, {"_id": 0}).to_list(10000)

    # Group by date
    daily: dict[str, float] = {}
    for s in sales:
        date = s.get("date", "")[:10]
        if date:
            daily[date] = daily.get(date, 0) + float(s.get("amount", 0) or s.get("total", 0))

    values = list(daily.values())

    if len(values) < 7:
        return {
            "ok": True,
            "anomalies": [],
            "message": "Need at least 7 days of data for anomaly detection",
        }

    mean = statistics.mean(values)
    stdev = statistics.stdev(values) if len(values) > 1 else 0

    anomalies = []
    if stdev > 0:
        for date, value in daily.items():
            z_score = (value - mean) / stdev
            if abs(z_score) > 2:  # More than 2 standard deviations
                anomalies.append({
                    "date": date,
                    "value": round(value, 2),
                    "expected": round(mean, 2),
                    "z_score": round(z_score, 2),
                    "severity": "high" if abs(z_score) > 3 else "medium",
                    "direction": "spike" if z_score > 0 else "drop",
                })

    return {
        "ok": True,
        "mean": round(mean, 2),
        "stdev": round(stdev, 2),
        "anomaly_count": len(anomalies),
        "anomalies": sorted(anomalies, key=lambda x: abs(x["z_score"]), reverse=True),
    }

# ---------------------------------------------------------------------------
# Attendant Performance
# ---------------------------------------------------------------------------
@router.post("/analytics/attendants")
async def get_attendant_performance(body: DateRange, user: dict = Depends(get_current_user)):
    """Get performance metrics for each attendant."""
    query = {
        "user_id": user["id"],
        "date": {"$gte": body.from_date, "$lte": body.to_date},
    }
    if body.station_id:
        query["station_id"] = body.station_id

    sales = await db.sync_sales.find(query, {"_id": 0}).to_list(10000)

    attendant_stats: dict[str, dict[str, Any]] = {}
    for sale in sales:
        attendant = sale.get("attendant", "Unknown")
        amount = float(sale.get("amount", 0) or sale.get("total", 0))
        liters = float(sale.get("liters", 0) or sale.get("quantity_liters", 0))

        if attendant not in attendant_stats:
            attendant_stats[attendant] = {
                "total_sales": 0,
                "total_liters": 0,
                "transaction_count": 0,
                "dates": set(),
            }

        attendant_stats[attendant]["total_sales"] += amount
        attendant_stats[attendant]["total_liters"] += liters
        attendant_stats[attendant]["transaction_count"] += 1
        attendant_stats[attendant]["dates"].add(sale.get("date", "")[:10])

    # Calculate rankings
    ranked = []
    for attendant, stats in attendant_stats.items():
        days_active = len(stats["dates"])
        ranked.append({
            "attendant": attendant,
            "total_sales": round(stats["total_sales"], 2),
            "total_liters": round(stats["total_liters"], 2),
            "transaction_count": stats["transaction_count"],
            "days_active": days_active,
            "avg_sale": round(stats["total_sales"] / stats["transaction_count"], 2) if stats["transaction_count"] > 0 else 0,
            "avg_daily_sales": round(stats["total_sales"] / max(days_active, 1), 2),
        })

    ranked.sort(key=lambda x: x["total_sales"], reverse=True)

    return {
        "ok": True,
        "attendants": ranked,
        "top_performer": ranked[0] if ranked else None,
    }
