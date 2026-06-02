"""Unit tests for routers/features.py — Pydantic model validation for loyalty, bulk import, price alerts."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

for k, v in {
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "fuelpro_test",
    "JWT_SECRET": "test-secret",
}.items():
    os.environ.setdefault(k, v)

from routers.features import (
    BulkImportBody,
    LoyaltyConfig,
    LoyaltyStamp,
    PriceAlertPrefs,
)


# ---------------------------------------------------------------------------
# LoyaltyConfig
# ---------------------------------------------------------------------------
class TestLoyaltyConfig:
    def test_defaults(self):
        cfg = LoyaltyConfig()
        assert cfg.stamps_required == 10
        assert cfg.min_purchase_amount == 500.0
        assert cfg.reward_description == "1 free fuel-up"
        assert cfg.currency == "KES"
        assert cfg.enabled is True

    def test_custom_values(self):
        cfg = LoyaltyConfig(stamps_required=5, min_purchase_amount=100.0, currency="USD")
        assert cfg.stamps_required == 5
        assert cfg.min_purchase_amount == 100.0
        assert cfg.currency == "USD"

    def test_stamps_required_min(self):
        with pytest.raises(Exception):
            LoyaltyConfig(stamps_required=1)

    def test_stamps_required_max(self):
        with pytest.raises(Exception):
            LoyaltyConfig(stamps_required=51)

    def test_min_purchase_zero_ok(self):
        cfg = LoyaltyConfig(min_purchase_amount=0.0)
        assert cfg.min_purchase_amount == 0.0

    def test_reward_description_max_length(self):
        with pytest.raises(Exception):
            LoyaltyConfig(reward_description="x" * 201)


# ---------------------------------------------------------------------------
# LoyaltyStamp
# ---------------------------------------------------------------------------
class TestLoyaltyStamp:
    def test_valid(self):
        s = LoyaltyStamp(phone="0712345678", amount=1000.0)
        assert s.phone == "0712345678"
        assert s.amount == 1000.0
        assert s.fuel_type is None
        assert s.note is None

    def test_with_optional_fields(self):
        s = LoyaltyStamp(phone="254712345678", amount=500.0, fuel_type="diesel", note="Regular customer")
        assert s.fuel_type == "diesel"
        assert s.note == "Regular customer"

    def test_zero_amount_rejected(self):
        with pytest.raises(Exception):
            LoyaltyStamp(phone="0712345678", amount=0)

    def test_negative_amount_rejected(self):
        with pytest.raises(Exception):
            LoyaltyStamp(phone="0712345678", amount=-100)

    def test_short_phone_rejected(self):
        with pytest.raises(Exception):
            LoyaltyStamp(phone="12345", amount=100)


# ---------------------------------------------------------------------------
# BulkImportBody
# ---------------------------------------------------------------------------
class TestBulkImportBody:
    def test_valid_append(self):
        body = BulkImportBody(items=[{"col": "val"}])
        assert body.mode == "append"
        assert len(body.items) == 1

    def test_replace_mode(self):
        body = BulkImportBody(items=[{"a": 1}], mode="replace")
        assert body.mode == "replace"

    def test_empty_items_rejected(self):
        with pytest.raises(Exception):
            BulkImportBody(items=[])

    def test_invalid_mode_rejected(self):
        with pytest.raises(Exception):
            BulkImportBody(items=[{"a": 1}], mode="delete")


# ---------------------------------------------------------------------------
# PriceAlertPrefs
# ---------------------------------------------------------------------------
class TestPriceAlertPrefs:
    def test_defaults(self):
        prefs = PriceAlertPrefs()
        assert prefs.enabled is True
        assert prefs.regions == ["nairobi"]
        assert prefs.channels == ["email"]
        assert prefs.threshold_kes == 0.5

    def test_custom_values(self):
        prefs = PriceAlertPrefs(
            enabled=False,
            regions=["nairobi", "mombasa"],
            channels=["email", "push"],
            threshold_kes=2.0,
        )
        assert prefs.enabled is False
        assert len(prefs.regions) == 2
        assert prefs.threshold_kes == 2.0

    def test_zero_threshold_allowed(self):
        prefs = PriceAlertPrefs(threshold_kes=0.0)
        assert prefs.threshold_kes == 0.0

    def test_negative_threshold_rejected(self):
        with pytest.raises(Exception):
            PriceAlertPrefs(threshold_kes=-1.0)
