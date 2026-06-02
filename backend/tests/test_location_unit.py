"""Unit tests for routers/location.py — country config, exchange rates, data integrity."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Set env vars before importing any module that transitively imports core
for k, v in {
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "fuelpro_test",
    "JWT_SECRET": "test-secret",
}.items():
    os.environ.setdefault(k, v)

from routers.location import (
    COUNTRY_CONFIG,
    EXCHANGE_RATES_USD,
    FUEL_PRICE_ESTIMATES,
    LocationResponse,
)


# ---------------------------------------------------------------------------
# COUNTRY_CONFIG integrity
# ---------------------------------------------------------------------------
class TestCountryConfig:
    REQUIRED_KEYS = {"country", "currency", "symbol", "language", "timezone"}

    def test_has_entries(self):
        assert len(COUNTRY_CONFIG) >= 30

    def test_every_entry_has_required_keys(self):
        for cc, cfg in COUNTRY_CONFIG.items():
            for key in self.REQUIRED_KEYS:
                assert key in cfg, f"{cc} missing '{key}'"

    def test_country_codes_are_two_letter_uppercase(self):
        for cc in COUNTRY_CONFIG:
            assert len(cc) == 2, f"Country code {cc!r} is not 2 chars"
            assert cc == cc.upper(), f"Country code {cc!r} is not uppercase"

    def test_kenya_config(self):
        ke = COUNTRY_CONFIG["KE"]
        assert ke["country"] == "Kenya"
        assert ke["currency"] == "KES"
        assert ke["symbol"] == "Sh"
        assert "mpesa" in ke["payment_methods"]
        assert ke.get("regulatory_body") == "EPRA"

    def test_us_config(self):
        us = COUNTRY_CONFIG["US"]
        assert us["country"] == "United States"
        assert us["currency"] == "USD"
        assert us["fuel_unit"] == "gallon"
        assert us.get("ccpa") is True

    def test_gdpr_countries(self):
        gdpr_codes = {cc for cc, cfg in COUNTRY_CONFIG.items() if cfg.get("gdpr")}
        assert "GB" in gdpr_codes
        assert "DE" in gdpr_codes
        assert "FR" in gdpr_codes
        assert "KE" not in gdpr_codes

    def test_all_have_payment_methods(self):
        for cc, cfg in COUNTRY_CONFIG.items():
            methods = cfg.get("payment_methods", [])
            assert len(methods) >= 1, f"{cc} has no payment methods"

    def test_all_have_fuel_unit(self):
        for cc, cfg in COUNTRY_CONFIG.items():
            unit = cfg.get("fuel_unit", "litre")
            assert unit in ("litre", "gallon"), f"{cc} has unexpected fuel_unit: {unit}"


# ---------------------------------------------------------------------------
# EXCHANGE_RATES_USD
# ---------------------------------------------------------------------------
class TestExchangeRates:
    def test_usd_is_1(self):
        assert EXCHANGE_RATES_USD["USD"] == 1.0

    def test_has_major_currencies(self):
        for curr in ("EUR", "GBP", "KES", "NGN", "ZAR", "INR", "JPY"):
            assert curr in EXCHANGE_RATES_USD

    def test_all_rates_positive(self):
        for curr, rate in EXCHANGE_RATES_USD.items():
            assert rate > 0, f"{curr} rate is not positive: {rate}"

    def test_eur_less_than_one(self):
        assert EXCHANGE_RATES_USD["EUR"] < 1.0

    def test_kes_greater_than_100(self):
        assert EXCHANGE_RATES_USD["KES"] > 100

    def test_all_country_currencies_have_rates(self):
        for cc, cfg in COUNTRY_CONFIG.items():
            curr = cfg["currency"]
            assert curr in EXCHANGE_RATES_USD, (
                f"Currency {curr} for {cc} ({cfg['country']}) missing from EXCHANGE_RATES_USD"
            )


# ---------------------------------------------------------------------------
# FUEL_PRICE_ESTIMATES
# ---------------------------------------------------------------------------
class TestFuelPriceEstimates:
    def test_has_entries(self):
        assert len(FUEL_PRICE_ESTIMATES) >= 10

    def test_all_prices_positive(self):
        for cc, prices in FUEL_PRICE_ESTIMATES.items():
            for fuel, price in prices.items():
                assert price > 0, f"{cc}/{fuel} price is not positive: {price}"

    def test_kenya_prices(self):
        ke = FUEL_PRICE_ESTIMATES["KE"]
        assert "petrol" in ke
        assert "diesel" in ke

    def test_us_uses_gallons(self):
        us = FUEL_PRICE_ESTIMATES["US"]
        assert "regular" in us or "petrol" in us


# ---------------------------------------------------------------------------
# LocationResponse model
# ---------------------------------------------------------------------------
class TestLocationResponse:
    def test_valid_response(self):
        resp = LocationResponse(
            country="Kenya",
            country_code="KE",
            timezone="Africa/Nairobi",
            currency="KES",
            currency_symbol="Sh",
            language="en",
        )
        assert resp.country == "Kenya"
        assert resp.latitude == 0.0
        assert resp.ip == ""

    def test_optional_fields(self):
        resp = LocationResponse(
            country="US",
            country_code="US",
            timezone="America/New_York",
            currency="USD",
            currency_symbol="$",
            language="en",
            region="California",
            city="San Francisco",
            latitude=37.7749,
            longitude=-122.4194,
            ip="8.8.8.8",
        )
        assert resp.region == "California"
        assert resp.city == "San Francisco"
        assert resp.latitude == 37.7749


# ---------------------------------------------------------------------------
# Currency conversion logic (unit test the math, not the endpoint)
# ---------------------------------------------------------------------------
class TestCurrencyConversionLogic:
    def test_usd_to_kes(self):
        usd_amount = 100.0
        kes_rate = EXCHANGE_RATES_USD["KES"]
        converted = usd_amount * kes_rate
        assert converted > 10000  # 100 USD > 10k KES

    def test_eur_to_gbp(self):
        eur_rate = EXCHANGE_RATES_USD["EUR"]
        gbp_rate = EXCHANGE_RATES_USD["GBP"]
        rate = gbp_rate / eur_rate
        assert 0.5 < rate < 1.5  # reasonable EUR/GBP range

    def test_round_trip_conversion(self):
        amount = 1000.0
        kes_rate = EXCHANGE_RATES_USD["KES"]
        usd_rate = EXCHANGE_RATES_USD["USD"]
        # USD -> KES -> USD
        in_kes = amount * kes_rate / usd_rate
        back_to_usd = in_kes * usd_rate / kes_rate
        assert abs(back_to_usd - amount) < 0.01
