"""Location detection and country-specific configuration service."""

from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from core import log

router = APIRouter(prefix="/api/location", tags=["location"])


class LocationResponse(BaseModel):
    country: str
    country_code: str
    timezone: str
    currency: str
    language: str


# Country configuration for 20+ countries
COUNTRY_CONFIG = {
    "KE": {"country": "Kenya", "currency": "KES", "symbol": "Sh", "language": "en", "timezone": "Africa/Nairobi"},
    "UG": {"country": "Uganda", "currency": "UGX", "symbol": "USh", "language": "en", "timezone": "Africa/Kampala"},
    "TZ": {"country": "Tanzania", "currency": "TZS", "symbol": "Tsh", "language": "en", "timezone": "Africa/Dar_es_Salaam"},
    "RW": {"country": "Rwanda", "currency": "RWF", "symbol": "FRw", "language": "en", "timezone": "Africa/Kigali"},
    "ZA": {"country": "South Africa", "currency": "ZAR", "symbol": "R", "language": "en", "timezone": "Africa/Johannesburg"},
    "NG": {"country": "Nigeria", "currency": "NGN", "symbol": "₦", "language": "en", "timezone": "Africa/Lagos"},
    "GH": {"country": "Ghana", "currency": "GHS", "symbol": "₵", "language": "en", "timezone": "Africa/Accra"},
    "ET": {"country": "Ethiopia", "currency": "ETB", "symbol": "Br", "language": "en", "timezone": "Africa/Addis_Ababa"},
    "US": {"country": "United States", "currency": "USD", "symbol": "$", "language": "en", "timezone": "America/New_York"},
    "CA": {"country": "Canada", "currency": "CAD", "symbol": "$", "language": "en", "timezone": "America/Toronto"},
    "GB": {"country": "United Kingdom", "currency": "GBP", "symbol": "£", "language": "en", "timezone": "Europe/London"},
    "IE": {"country": "Ireland", "currency": "EUR", "symbol": "€", "language": "en", "timezone": "Europe/Dublin"},
    "DE": {"country": "Germany", "currency": "EUR", "symbol": "€", "language": "en", "timezone": "Europe/Berlin"},
    "FR": {"country": "France", "currency": "EUR", "symbol": "€", "language": "fr", "timezone": "Europe/Paris"},
    "IN": {"country": "India", "currency": "INR", "symbol": "₹", "language": "en", "timezone": "Asia/Kolkata"},
    "BD": {"country": "Bangladesh", "currency": "BDT", "symbol": "৳", "language": "en", "timezone": "Asia/Dhaka"},
    "AU": {"country": "Australia", "currency": "AUD", "symbol": "$", "language": "en", "timezone": "Australia/Sydney"},
    "NZ": {"country": "New Zealand", "currency": "NZD", "symbol": "$", "language": "en", "timezone": "Pacific/Auckland"},
    "SG": {"country": "Singapore", "currency": "SGD", "symbol": "$", "language": "en", "timezone": "Asia/Singapore"},
    "MY": {"country": "Malaysia", "currency": "MYR", "symbol": "RM", "language": "en", "timezone": "Asia/Kuala_Lumpur"},
    "TH": {"country": "Thailand", "currency": "THB", "symbol": "฿", "language": "en", "timezone": "Asia/Bangkok"},
}


@router.get("/detect", response_model=LocationResponse)
async def detect_location(request: Request):
    """Detect user location from IP address using free geolocation API.
    Falls back to US if detection fails.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    try:
        # Use free IP geolocation service
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(
                f"https://ipapi.co/{client_ip}/json/",
                headers={"Accept": "application/json"}
            )
            if response.status_code == 200:
                data = response.json()
                cc = data.get("country_code", "US").upper()
                config = COUNTRY_CONFIG.get(cc, COUNTRY_CONFIG["US"])
                
                log.info("Location detected: ip=%s country_code=%s", client_ip, cc)
                
                return LocationResponse(
                    country=config["country"],
                    country_code=cc,
                    timezone=config["timezone"],
                    currency=config["currency"],
                    language=config["language"],
                )
    except Exception as e:
        log.warning("Location detection failed for ip=%s: %s", client_ip, e)
    
    # Fallback to default (US)
    config = COUNTRY_CONFIG["US"]
    return LocationResponse(
        country=config["country"],
        country_code="US",
        timezone=config["timezone"],
        currency=config["currency"],
        language=config["language"],
    )


@router.get("/config/{country_code}")
async def get_location_config(country_code: str):
    """Get country-specific configuration: payment methods, pricing, compliance."""
    cc = country_code.upper()
    config = COUNTRY_CONFIG.get(cc, COUNTRY_CONFIG["US"])
    
    # Country-specific payment methods
    payment_methods = {
        "KE": ["mpesa", "card", "bank_transfer"],
        "UG": ["mtn_mobile_money", "airtel_money", "card"],
        "TZ": ["tigopesa", "card", "bank_transfer"],
        "ZA": ["snapscan", "card", "eft"],
        "NG": ["flutterwave", "paystack", "card"],
        "US": ["stripe", "ach", "card"],
        "GB": ["stripe", "faster_payments", "card"],
        "IN": ["razorpay", "upi", "card"],
    }
    
    return {
        "country": config["country"],
        "country_code": cc,
        "currency": config["currency"],
        "currency_symbol": config["symbol"],
        "timezone": config["timezone"],
        "language": config["language"],
        "payment_methods": payment_methods.get(cc, ["card", "bank_transfer"]),
        "fuel_price_source": "local_api",
        "compliance_required": cc in {"GB", "US", "DE", "FR"}  # GDPR/CCPA regions
    }


@router.get("/currencies")
async def get_supported_currencies():
    """Get list of all supported currencies and conversion rates."""
    currencies = {}
    for cc, config in COUNTRY_CONFIG.items():
        curr = config["currency"]
        if curr not in currencies:
            currencies[curr] = {
                "code": curr,
                "symbol": config["symbol"],
                "countries": []
            }
        currencies[curr]["countries"].append(cc)
    
    return {
        "supported": list(currencies.keys()),
        "details": currencies,
        "note": "Use /api/convert for real-time exchange rates"
    }
