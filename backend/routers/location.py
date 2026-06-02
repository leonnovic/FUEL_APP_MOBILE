"""Location detection, country config, exchange rates, fuel prices, and GDPR endpoints."""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from core import ALLOWED_COLLECTIONS, db, get_current_user, log, now_iso
from services.shared import get_request_meta, write_audit_log

router = APIRouter(prefix="/location", tags=["location"])


class LocationResponse(BaseModel):
    country: str
    country_code: str
    timezone: str
    currency: str
    currency_symbol: str
    language: str
    region: Optional[str] = None
    city: Optional[str] = None
    latitude: float = 0.0
    longitude: float = 0.0
    ip: str = ""


# ---------------------------------------------------------------------------
# Country database — 40+ countries
# ---------------------------------------------------------------------------
COUNTRY_CONFIG: Dict[str, Dict[str, Any]] = {
    # East Africa
    "KE": {"country": "Kenya", "currency": "KES", "symbol": "Sh", "language": "en", "timezone": "Africa/Nairobi",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.16,
           "payment_methods": ["mpesa", "airtel_money", "card", "bank_transfer"],
           "regulatory_body": "EPRA", "fuel_price_source": "epra"},
    "UG": {"country": "Uganda", "currency": "UGX", "symbol": "USh", "language": "en", "timezone": "Africa/Kampala",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.18,
           "payment_methods": ["mtn_mobile_money", "airtel_money", "card", "bank_transfer"],
           "regulatory_body": "EPAU"},
    "TZ": {"country": "Tanzania", "currency": "TZS", "symbol": "Tsh", "language": "sw", "timezone": "Africa/Dar_es_Salaam",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.18,
           "payment_methods": ["mpesa", "tigopesa", "card", "bank_transfer"],
           "regulatory_body": "EWURA"},
    "RW": {"country": "Rwanda", "currency": "RWF", "symbol": "FRw", "language": "en", "timezone": "Africa/Kigali",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.18,
           "payment_methods": ["mtn_mobile_money", "card", "bank_transfer"],
           "regulatory_body": "RURA"},
    "ET": {"country": "Ethiopia", "currency": "ETB", "symbol": "Br", "language": "am", "timezone": "Africa/Addis_Ababa",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.15,
           "payment_methods": ["telebirr", "card", "bank_transfer"],
           "regulatory_body": "Ethiopian Energy Authority"},
    "SS": {"country": "South Sudan", "currency": "SSP", "symbol": "£", "language": "en", "timezone": "Africa/Juba",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.0,
           "payment_methods": ["card", "bank_transfer"]},
    # Southern & West Africa
    "ZA": {"country": "South Africa", "currency": "ZAR", "symbol": "R", "language": "en", "timezone": "Africa/Johannesburg",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.15,
           "payment_methods": ["snapscan", "zapper", "card", "eft", "instant_eft"],
           "regulatory_body": "DoE South Africa"},
    "NG": {"country": "Nigeria", "currency": "NGN", "symbol": "₦", "language": "en", "timezone": "Africa/Lagos",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.075,
           "payment_methods": ["flutterwave", "paystack", "card", "bank_transfer", "ussd"],
           "regulatory_body": "NMDPRA"},
    "GH": {"country": "Ghana", "currency": "GHS", "symbol": "₵", "language": "en", "timezone": "Africa/Accra",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.125,
           "payment_methods": ["mtn_mobile_money", "vodafone_cash", "card", "bank_transfer"],
           "regulatory_body": "NPA Ghana"},
    "ZM": {"country": "Zambia", "currency": "ZMW", "symbol": "ZK", "language": "en", "timezone": "Africa/Lusaka",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.16,
           "payment_methods": ["mtn_mobile_money", "airtel_money", "card"]},
    "ZW": {"country": "Zimbabwe", "currency": "ZWL", "symbol": "Z$", "language": "en", "timezone": "Africa/Harare",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.15,
           "payment_methods": ["ecocash", "onemoney", "card"]},
    "MZ": {"country": "Mozambique", "currency": "MZN", "symbol": "MT", "language": "pt", "timezone": "Africa/Maputo",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.17,
           "payment_methods": ["mpesa", "card", "bank_transfer"]},
    "SN": {"country": "Senegal", "currency": "XOF", "symbol": "CFA", "language": "fr", "timezone": "Africa/Dakar",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.18,
           "payment_methods": ["orange_money", "wave", "card"]},
    "CI": {"country": "Ivory Coast", "currency": "XOF", "symbol": "CFA", "language": "fr", "timezone": "Africa/Abidjan",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.18,
           "payment_methods": ["orange_money", "mtn_mobile_money", "card"]},
    "CM": {"country": "Cameroon", "currency": "XAF", "symbol": "CFA", "language": "fr", "timezone": "Africa/Douala",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.19,
           "payment_methods": ["mtn_mobile_money", "orange_money", "card"]},
    "MA": {"country": "Morocco", "currency": "MAD", "symbol": "DH", "language": "fr", "timezone": "Africa/Casablanca",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.20,
           "payment_methods": ["card", "cmi", "bank_transfer"]},
    "DZ": {"country": "Algeria", "currency": "DZD", "symbol": "DA", "language": "ar", "timezone": "Africa/Algiers",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.19,
           "payment_methods": ["card", "bank_transfer"]},
    "TN": {"country": "Tunisia", "currency": "TND", "symbol": "DT", "language": "ar", "timezone": "Africa/Tunis",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.19,
           "payment_methods": ["card", "bank_transfer"]},
    "EG": {"country": "Egypt", "currency": "EGP", "symbol": "E£", "language": "ar", "timezone": "Africa/Cairo",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.14,
           "payment_methods": ["fawry", "card", "bank_transfer"]},
    # North America
    "US": {"country": "United States", "currency": "USD", "symbol": "$", "language": "en", "timezone": "America/New_York",
           "fuel_unit": "gallon", "volume_unit": "gal", "distance_unit": "mi", "tax_rate": 0.0,
           "payment_methods": ["stripe", "ach", "card", "paypal", "apple_pay", "google_pay"],
           "regulatory_body": "EIA", "ccpa": True},
    "CA": {"country": "Canada", "currency": "CAD", "symbol": "CA$", "language": "en", "timezone": "America/Toronto",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.05,
           "payment_methods": ["stripe", "interac", "card", "paypal"],
           "regulatory_body": "NEB"},
    "MX": {"country": "Mexico", "currency": "MXN", "symbol": "MX$", "language": "es", "timezone": "America/Mexico_City",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.16,
           "payment_methods": ["card", "oxxo", "spei", "paypal"]},
    "BR": {"country": "Brazil", "currency": "BRL", "symbol": "R$", "language": "pt", "timezone": "America/Sao_Paulo",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.0,
           "payment_methods": ["pix", "boleto", "card", "stripe"]},
    # Europe (GDPR)
    "GB": {"country": "United Kingdom", "currency": "GBP", "symbol": "£", "language": "en", "timezone": "Europe/London",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "mi", "tax_rate": 0.20,
           "payment_methods": ["stripe", "faster_payments", "card", "paypal", "apple_pay"],
           "regulatory_body": "OFGEM", "gdpr": True},
    "IE": {"country": "Ireland", "currency": "EUR", "symbol": "€", "language": "en", "timezone": "Europe/Dublin",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.23,
           "payment_methods": ["stripe", "card", "sepa", "paypal"],
           "regulatory_body": "CRU", "gdpr": True},
    "DE": {"country": "Germany", "currency": "EUR", "symbol": "€", "language": "de", "timezone": "Europe/Berlin",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.19,
           "payment_methods": ["stripe", "sepa", "giropay", "card", "paypal"],
           "regulatory_body": "Bundesnetzagentur", "gdpr": True},
    "FR": {"country": "France", "currency": "EUR", "symbol": "€", "language": "fr", "timezone": "Europe/Paris",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.20,
           "payment_methods": ["stripe", "sepa", "card", "paypal"],
           "regulatory_body": "CRE", "gdpr": True},
    "NL": {"country": "Netherlands", "currency": "EUR", "symbol": "€", "language": "nl", "timezone": "Europe/Amsterdam",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.21,
           "payment_methods": ["ideal", "stripe", "sepa", "card"],
           "regulatory_body": "ACM", "gdpr": True},
    "ES": {"country": "Spain", "currency": "EUR", "symbol": "€", "language": "es", "timezone": "Europe/Madrid",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.21,
           "payment_methods": ["stripe", "sepa", "card", "bizum"],
           "regulatory_body": "CNMC", "gdpr": True},
    "SE": {"country": "Sweden", "currency": "SEK", "symbol": "kr", "language": "sv", "timezone": "Europe/Stockholm",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.25,
           "payment_methods": ["stripe", "swish", "card", "sepa"],
           "gdpr": True},
    "NO": {"country": "Norway", "currency": "NOK", "symbol": "kr", "language": "no", "timezone": "Europe/Oslo",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.25,
           "payment_methods": ["stripe", "vipps", "card"],
           "gdpr": True},
    # Asia-Pacific
    "IN": {"country": "India", "currency": "INR", "symbol": "₹", "language": "en", "timezone": "Asia/Kolkata",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.18,
           "payment_methods": ["upi", "razorpay", "paytm", "card", "netbanking"],
           "regulatory_body": "PPAC"},
    "SG": {"country": "Singapore", "currency": "SGD", "symbol": "S$", "language": "en", "timezone": "Asia/Singapore",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.09,
           "payment_methods": ["stripe", "paynow", "card", "grabpay"],
           "regulatory_body": "EMA"},
    "MY": {"country": "Malaysia", "currency": "MYR", "symbol": "RM", "language": "ms", "timezone": "Asia/Kuala_Lumpur",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.06,
           "payment_methods": ["fpx", "card", "grabpay", "touchngo"]},
    "AU": {"country": "Australia", "currency": "AUD", "symbol": "A$", "language": "en", "timezone": "Australia/Sydney",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.10,
           "payment_methods": ["stripe", "bpay", "card", "payid"],
           "regulatory_body": "ACCC"},
    "NZ": {"country": "New Zealand", "currency": "NZD", "symbol": "NZ$", "language": "en", "timezone": "Pacific/Auckland",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.15,
           "payment_methods": ["stripe", "card", "paypal"]},
    "JP": {"country": "Japan", "currency": "JPY", "symbol": "¥", "language": "ja", "timezone": "Asia/Tokyo",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.10,
           "payment_methods": ["stripe", "konbini", "card", "paypay"],
           "regulatory_body": "ANRE"},
    "AE": {"country": "UAE", "currency": "AED", "symbol": "د.إ", "language": "ar", "timezone": "Asia/Dubai",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.05,
           "payment_methods": ["stripe", "card", "paypal"]},
    "TH": {"country": "Thailand", "currency": "THB", "symbol": "฿", "language": "th", "timezone": "Asia/Bangkok",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.07,
           "payment_methods": ["promptpay", "card", "truemoney"]},
    "BD": {"country": "Bangladesh", "currency": "BDT", "symbol": "৳", "language": "bn", "timezone": "Asia/Dhaka",
           "fuel_unit": "litre", "volume_unit": "L", "distance_unit": "km", "tax_rate": 0.15,
           "payment_methods": ["bkash", "nagad", "card", "bank_transfer"]},
}

# ---------------------------------------------------------------------------
# Static exchange rates (USD base — approximate, used as live-API fallback)
# ---------------------------------------------------------------------------
EXCHANGE_RATES_USD: Dict[str, float] = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "CAD": 1.36, "AUD": 1.52,
    "JPY": 150.0, "CHF": 0.88, "NZD": 1.61, "SGD": 1.34, "HKD": 7.82,
    "SEK": 10.5, "NOK": 10.8,
    "KES": 129.0, "UGX": 3800.0, "TZS": 2530.0, "RWF": 1300.0, "ETB": 56.0,
    "NGN": 1550.0, "GHS": 15.5, "ZAR": 18.9, "MZN": 64.0, "ZMW": 27.5,
    "ZWL": 6200.0, "SSP": 1800.0, "XOF": 605.0, "XAF": 605.0,
    "MAD": 10.1, "DZD": 135.0, "TND": 3.11, "EGP": 47.0,
    "INR": 83.1, "MYR": 4.75, "THB": 35.5, "BDT": 110.0, "IDR": 15600.0,
    "PHP": 56.0, "VND": 24500.0, "KRW": 1330.0, "AED": 3.67,
    "BRL": 4.97, "MXN": 17.1, "ARS": 900.0, "COP": 3920.0, "CLP": 920.0,
}

# ---------------------------------------------------------------------------
# Regional fuel price estimates (approximate, for UX orientation only)
# ---------------------------------------------------------------------------
FUEL_PRICE_ESTIMATES: Dict[str, Dict[str, float]] = {
    "KE": {"petrol": 176.0, "diesel": 163.0, "kerosene": 144.0},
    "UG": {"petrol": 5200.0, "diesel": 4800.0},
    "TZ": {"petrol": 3100.0, "diesel": 2900.0},
    "RW": {"petrol": 1400.0, "diesel": 1200.0},
    "ET": {"petrol": 62.0, "diesel": 57.0},
    "NG": {"petrol": 600.0, "diesel": 800.0},
    "GH": {"petrol": 14.0, "diesel": 15.0},
    "ZA": {"petrol": 21.0, "diesel": 20.0},
    "EG": {"petrol": 10.75, "diesel": 9.25},
    "MA": {"petrol": 14.5, "diesel": 12.0},
    "US": {"regular": 3.4, "premium": 3.9, "diesel": 3.8},
    "CA": {"regular": 1.65, "diesel": 1.80},
    "MX": {"magna": 21.0, "premium": 23.0, "diesel": 21.5},
    "BR": {"gasoline": 5.8, "ethanol": 3.5, "diesel": 6.1},
    "GB": {"petrol": 1.55, "diesel": 1.60},
    "DE": {"petrol_e10": 1.75, "diesel": 1.68},
    "FR": {"sp95_e10": 1.78, "diesel": 1.71},
    "NL": {"euro95": 1.93, "diesel": 1.74},
    "ES": {"gasoline_95": 1.68, "diesel": 1.57},
    "SE": {"bensin_95": 16.5, "diesel": 18.5},
    "NO": {"bensin_95": 20.0, "diesel": 22.0},
    "IN": {"petrol": 96.0, "diesel": 89.0},
    "SG": {"ron92": 2.63, "ron98": 2.93, "diesel": 2.06},
    "MY": {"ron95": 2.05, "ron97": 3.47, "diesel": 2.15},
    "AU": {"unleaded_91": 1.85, "premium_98": 2.10, "diesel": 2.00},
    "NZ": {"91_petrol": 2.40, "98_petrol": 2.70, "diesel": 1.90},
    "JP": {"regular": 170.0, "premium": 181.0, "diesel": 155.0},
    "AE": {"special_95": 2.89, "super_98": 2.98, "diesel": 2.68},
    "TH": {"gasohol_91": 35.0, "gasohol_e20": 33.0, "diesel_b7": 29.5},
    "BD": {"octane": 108.0, "diesel": 109.0},
    "ZM": {"petrol": 30.0, "diesel": 28.0},
    "ZW": {"petrol": 1.55, "diesel": 1.60},
}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/detect", response_model=LocationResponse)
async def detect_location(request: Request):
    """Detect user location from IP, honouring X-Forwarded-For from Vercel edge."""
    xff = request.headers.get("x-forwarded-for", "")
    client_ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "127.0.0.1")
    is_private = client_ip in ("127.0.0.1", "::1", "localhost") or client_ip.startswith(("10.", "192.168.", "172."))
    if is_private:
        client_ip = "8.8.8.8"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"https://ipapi.co/{client_ip}/json/",
                headers={"Accept": "application/json", "User-Agent": "FuelPro/2.0"},
            )
            if resp.status_code == 200:
                data = resp.json()
                cc = (data.get("country_code") or "US").upper()
                config = COUNTRY_CONFIG.get(cc, COUNTRY_CONFIG["US"])
                log.info("Location detected: ip=%s cc=%s", client_ip, cc)
                return LocationResponse(
                    country=config["country"],
                    country_code=cc,
                    timezone=config["timezone"],
                    currency=config["currency"],
                    currency_symbol=config["symbol"],
                    language=config["language"],
                    region=data.get("region"),
                    city=data.get("city"),
                    latitude=float(data.get("latitude") or 0),
                    longitude=float(data.get("longitude") or 0),
                    ip=client_ip,
                )
    except Exception as exc:
        log.warning("Location detection failed ip=%s: %s", client_ip, exc)

    cfg = COUNTRY_CONFIG["US"]
    return LocationResponse(
        country=cfg["country"], country_code="US",
        timezone=cfg["timezone"], currency=cfg["currency"],
        currency_symbol=cfg["symbol"], language=cfg["language"],
        ip=client_ip,
    )


@router.get("/config/{country_code}")
async def get_location_config(country_code: str):
    """Country-specific config: payment methods, units, compliance, regulatory body."""
    cc = country_code.upper()
    config = COUNTRY_CONFIG.get(cc, COUNTRY_CONFIG["US"])
    return {
        "country": config["country"],
        "country_code": cc,
        "currency": config["currency"],
        "currency_symbol": config["symbol"],
        "timezone": config["timezone"],
        "language": config["language"],
        "fuel_unit": config.get("fuel_unit", "litre"),
        "volume_unit": config.get("volume_unit", "L"),
        "distance_unit": config.get("distance_unit", "km"),
        "tax_rate": config.get("tax_rate", 0.0),
        "payment_methods": config.get("payment_methods", ["card"]),
        "regulatory_body": config.get("regulatory_body", ""),
        "fuel_price_source": config.get("fuel_price_source", "local_api"),
        "gdpr_applicable": config.get("gdpr", False),
        "ccpa_applicable": config.get("ccpa", False),
        "compliance_required": config.get("gdpr", False) or config.get("ccpa", False),
    }


@router.get("/countries")
async def list_countries():
    """List all supported countries."""
    return {
        "countries": [
            {
                "code": cc,
                "name": cfg["country"],
                "currency": cfg["currency"],
                "currency_symbol": cfg["symbol"],
                "timezone": cfg["timezone"],
                "language": cfg["language"],
                "gdpr": cfg.get("gdpr", False),
                "ccpa": cfg.get("ccpa", False),
            }
            for cc, cfg in sorted(COUNTRY_CONFIG.items(), key=lambda x: x[1]["country"])
        ],
        "total": len(COUNTRY_CONFIG),
        "ok": True,
    }


@router.get("/currencies")
async def get_supported_currencies():
    """All supported currencies with symbols and country mappings."""
    currencies: Dict[str, Any] = {}
    for cc, cfg in COUNTRY_CONFIG.items():
        curr = cfg["currency"]
        if curr not in currencies:
            currencies[curr] = {"code": curr, "symbol": cfg["symbol"], "countries": []}
        currencies[curr]["countries"].append(cc)
    return {
        "supported": sorted(currencies.keys()),
        "details": currencies,
        "total": len(currencies),
        "ok": True,
    }


@router.get("/exchange-rates")
async def get_exchange_rates(base: str = "USD"):
    """Live exchange rates via open.er-api.com; falls back to static table."""
    base = base.upper()
    if base not in EXCHANGE_RATES_USD:
        raise HTTPException(400, f"Unsupported base: {base}. See /api/location/currencies for valid codes.")

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                f"https://open.er-api.com/v6/latest/{base}",
                headers={"Accept": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("result") == "success":
                    return {
                        "base": base,
                        "rates": data.get("rates", {}),
                        "source": "open.er-api.com",
                        "updated": data.get("time_last_update_utc"),
                        "ok": True,
                    }
    except Exception:
        pass

    base_rate = EXCHANGE_RATES_USD.get(base, 1.0)
    converted = {curr: round(rate / base_rate, 6) for curr, rate in EXCHANGE_RATES_USD.items()}
    return {
        "base": base,
        "rates": converted,
        "source": "static_fallback",
        "ok": True,
        "note": "Live rates temporarily unavailable; using cached rates.",
    }


@router.get("/convert")
async def convert_currency(amount: float, from_currency: str = "USD", to_currency: str = "KES"):
    """Convert an amount between two currencies."""
    frm, to = from_currency.upper(), to_currency.upper()
    if frm not in EXCHANGE_RATES_USD:
        raise HTTPException(400, f"Unknown currency: {frm}")
    if to not in EXCHANGE_RATES_USD:
        raise HTTPException(400, f"Unknown currency: {to}")
    usd = amount / EXCHANGE_RATES_USD[frm]
    return {
        "from": frm, "to": to, "amount": amount,
        "converted": round(usd * EXCHANGE_RATES_USD[to], 4),
        "rate": round(EXCHANGE_RATES_USD[to] / EXCHANGE_RATES_USD[frm], 6),
        "ok": True,
    }


@router.get("/fuel-prices/{country_code}")
async def get_fuel_prices(country_code: str):
    """Latest fuel prices for a country. Kenya uses EPRA live feed; others use regional estimates."""
    cc = country_code.upper()
    config = COUNTRY_CONFIG.get(cc)
    if not config:
        raise HTTPException(404, f"Country not supported: {cc}")

    currency = config["currency"]
    unit = config.get("fuel_unit", "litre")

    if cc == "KE":
        try:
            from services.epra import get_fuel_prices as _epra
            data = await _epra("nairobi")
            if data.get("ok"):
                return {"country_code": cc, "currency": currency, "unit": unit,
                        "prices": data.get("prices", {}), "source": data.get("source", "epra"),
                        "updated": data.get("updated"), "ok": True}
        except Exception:
            pass

    prices = FUEL_PRICE_ESTIMATES.get(cc, {"petrol": 0, "diesel": 0})
    return {
        "country_code": cc,
        "currency": currency,
        "unit": unit,
        "prices": prices,
        "source": "regional_estimate",
        "note": "Approximate prices for orientation — connect a local price feed for live data.",
        "ok": True,
    }


@router.get("/payment-methods/{country_code}")
async def get_payment_methods(country_code: str):
    """Payment methods with rich metadata for a country."""
    cc = country_code.upper()
    config = COUNTRY_CONFIG.get(cc, COUNTRY_CONFIG["US"])
    methods = config.get("payment_methods", ["card"])

    method_meta: Dict[str, Dict[str, Any]] = {
        "mpesa":            {"name": "M-PESA",              "type": "mobile_money"},
        "card":             {"name": "Credit / Debit Card",  "type": "card"},
        "stripe":           {"name": "Stripe",               "type": "card_processor"},
        "paypal":           {"name": "PayPal",               "type": "digital_wallet"},
        "apple_pay":        {"name": "Apple Pay",            "type": "digital_wallet"},
        "google_pay":       {"name": "Google Pay",           "type": "digital_wallet"},
        "mtn_mobile_money": {"name": "MTN Mobile Money",     "type": "mobile_money"},
        "airtel_money":     {"name": "Airtel Money",         "type": "mobile_money"},
        "tigopesa":         {"name": "Tigo Pesa",            "type": "mobile_money"},
        "flutterwave":      {"name": "Flutterwave",          "type": "payment_gateway"},
        "paystack":         {"name": "Paystack",             "type": "payment_gateway"},
        "upi":              {"name": "UPI",                  "type": "bank_transfer"},
        "razorpay":         {"name": "Razorpay",             "type": "payment_gateway"},
        "sepa":             {"name": "SEPA Direct Debit",    "type": "bank_transfer"},
        "ach":              {"name": "ACH Transfer",         "type": "bank_transfer"},
        "bkash":            {"name": "bKash",                "type": "mobile_money"},
        "paynow":           {"name": "PayNow",               "type": "instant_transfer"},
        "pix":              {"name": "PIX",                  "type": "instant_transfer"},
        "ideal":            {"name": "iDEAL",                "type": "bank_transfer"},
        "orange_money":     {"name": "Orange Money",         "type": "mobile_money"},
        "wave":             {"name": "Wave",                 "type": "mobile_money"},
        "ecocash":          {"name": "EcoCash",              "type": "mobile_money"},
        "snapscan":         {"name": "SnapScan",             "type": "qr_payment"},
        "eft":              {"name": "EFT",                  "type": "bank_transfer"},
        "telebirr":         {"name": "Telebirr",             "type": "mobile_money"},
        "fawry":            {"name": "Fawry",                "type": "payment_gateway"},
        "grabpay":          {"name": "GrabPay",              "type": "digital_wallet"},
        "touchngo":         {"name": "Touch 'n Go",          "type": "digital_wallet"},
        "konbini":          {"name": "Konbini",              "type": "cash_at_store"},
        "paypay":           {"name": "PayPay",               "type": "digital_wallet"},
        "swish":            {"name": "Swish",                "type": "instant_transfer"},
        "vipps":            {"name": "Vipps",                "type": "instant_transfer"},
        "bank_transfer":    {"name": "Bank Transfer",        "type": "bank_transfer"},
        "interac":          {"name": "Interac",              "type": "bank_transfer"},
        "promptpay":        {"name": "PromptPay",            "type": "instant_transfer"},
        "vodafone_cash":    {"name": "Vodafone Cash",        "type": "mobile_money"},
        "onemoney":         {"name": "OneMoney",             "type": "mobile_money"},
        "faster_payments":  {"name": "Faster Payments",      "type": "bank_transfer"},
        "giropay":          {"name": "giropay",              "type": "bank_transfer"},
        "bizum":            {"name": "Bizum",                "type": "instant_transfer"},
        "paytm":            {"name": "Paytm",                "type": "digital_wallet"},
        "netbanking":       {"name": "Net Banking",          "type": "bank_transfer"},
        "ussd":             {"name": "USSD",                 "type": "ussd"},
        "fpx":              {"name": "FPX",                  "type": "bank_transfer"},
        "bpay":             {"name": "BPAY",                 "type": "bank_transfer"},
        "payid":            {"name": "PayID",                "type": "instant_transfer"},
        "truemoney":        {"name": "TrueMoney",            "type": "digital_wallet"},
        "nagad":            {"name": "Nagad",                "type": "mobile_money"},
        "oxxo":             {"name": "OXXO",                 "type": "cash_at_store"},
        "spei":             {"name": "SPEI",                 "type": "bank_transfer"},
        "boleto":           {"name": "Boleto",               "type": "cash_at_store"},
        "cmi":              {"name": "CMI",                  "type": "card_processor"},
        "zapper":           {"name": "Zapper",               "type": "qr_payment"},
        "instant_eft":      {"name": "Instant EFT",          "type": "bank_transfer"},
    }

    enriched = [{"id": m, **method_meta.get(m, {"name": m.replace("_", " ").title(), "type": "other"})}
                for m in methods]
    return {"country_code": cc, "country": config["country"], "currency": config["currency"],
            "methods": enriched, "ok": True}


# ---------------------------------------------------------------------------
# GDPR / CCPA Compliance
# ---------------------------------------------------------------------------

@router.post("/gdpr/export")
async def gdpr_data_export(request: Request, user: dict = Depends(get_current_user)):
    """GDPR Art. 20 / CCPA: Export all personal data for the authenticated user as JSON."""
    uid = user["id"]
    export: Dict[str, Any] = {"user_id": uid, "exported_at": now_iso(), "data": {}}

    named_collections = [
        "users", "audit_log", "user_data", "subscriptions",
        "payment_transactions", "storage_files", "push_subscriptions",
        "identity_links", "daily_digests",
    ]
    for col_name in named_collections:
        try:
            query = {"id": uid} if col_name == "users" else {"user_id": uid}
            docs = await db[col_name].find(query, {"_id": 0}).to_list(1000)
            export["data"][col_name] = docs
        except Exception:
            export["data"][col_name] = []

    for col_name in ALLOWED_COLLECTIONS:
        try:
            docs = await db[f"sync_{col_name}"].find({"user_id": uid}, {"_id": 0}).to_list(5000)
            if docs:
                export["data"][f"sync_{col_name}"] = docs
        except Exception:
            pass

    req_meta = get_request_meta(request)
    await write_audit_log(
        uid, "gdpr.data_export",
        meta={"record_count": sum(len(v) for v in export["data"].values() if isinstance(v, list))},
        **req_meta,
    )
    log.info("GDPR export: user_id=%s", uid)
    return {"ok": True, "export": export}


@router.delete("/gdpr/delete")
async def gdpr_data_delete(request: Request, user: dict = Depends(get_current_user)):
    """GDPR Art. 17 / CCPA: Right to erasure. Anonymises account and purges personal data."""
    uid = user["id"]
    log.warning("GDPR delete: user_id=%s ip=%s", uid, request.client.host if request.client else "unknown")

    await db.users.update_one(
        {"id": uid},
        {"$set": {
            "email": f"deleted_{uid[:8]}@erased.fuelpro.app",
            "name": "Deleted User",
            "password_hash": "",
            "google_sub": None,
            "google_picture": None,
            "phone": None,
            "deleted_at": now_iso(),
            "is_deleted": True,
        }},
    )

    for col_name in ALLOWED_COLLECTIONS:
        try:
            await db[f"sync_{col_name}"].delete_many({"user_id": uid})
        except Exception:
            pass

    for col_name in ["user_data", "push_subscriptions", "identity_links", "daily_digests", "storage_files"]:
        try:
            await db[col_name].delete_many({"user_id": uid})
        except Exception:
            pass

    req_meta = get_request_meta(request)
    await write_audit_log(
        uid, "gdpr.data_deleted",
        meta={"permanent": True},
        **req_meta,
    )
    return {"ok": True, "message": "All personal data has been deleted. This action is irreversible."}
