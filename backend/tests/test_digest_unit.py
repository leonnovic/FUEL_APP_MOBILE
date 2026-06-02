"""Unit tests for services/digest.py — date helpers, HTML rendering."""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from services.digest import _yesterday_iso, render_digest_html


# ---------------------------------------------------------------------------
# _yesterday_iso
# ---------------------------------------------------------------------------
class TestYesterdayIso:
    def test_returns_tuple(self):
        date_str, label = _yesterday_iso()
        assert isinstance(date_str, str)
        assert isinstance(label, str)

    def test_date_format_is_iso(self):
        date_str, _ = _yesterday_iso()
        datetime.fromisoformat(date_str)

    def test_label_contains_day_name(self):
        _, label = _yesterday_iso()
        days = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
        assert any(d in label for d in days)

    def test_utc_plus_3_default(self):
        date_str_default, _ = _yesterday_iso()
        date_str_nairobi, _ = _yesterday_iso(tz_offset_minutes=180)
        assert date_str_default == date_str_nairobi

    def test_different_offsets_may_differ(self):
        date_utc, _ = _yesterday_iso(tz_offset_minutes=0)
        date_far_east, _ = _yesterday_iso(tz_offset_minutes=720)
        # These may or may not differ depending on current time, but both should be valid
        datetime.fromisoformat(date_utc)
        datetime.fromisoformat(date_far_east)


# ---------------------------------------------------------------------------
# render_digest_html
# ---------------------------------------------------------------------------
class TestRenderDigestHtml:
    def _make_digest(self, **overrides) -> dict:
        base = {
            "user_name": "Test User",
            "label": "Monday, 01 January 2026",
            "sales_count": 15,
            "inflows_count": 12,
            "matched": 10,
            "total_sales_kes": 150000.00,
            "total_inflow_kes": 120000.00,
            "delta_kes": 30000.00,
            "unmatched_inflows": [],
            "unmatched_sales": [],
        }
        base.update(overrides)
        return base

    def test_contains_user_name(self):
        html = render_digest_html(self._make_digest())
        assert "Test User" in html

    def test_contains_date_label(self):
        html = render_digest_html(self._make_digest())
        assert "Monday, 01 January 2026" in html

    def test_contains_sales_count(self):
        html = render_digest_html(self._make_digest(sales_count=25))
        assert "25" in html

    def test_contains_total_amounts(self):
        html = render_digest_html(self._make_digest(
            total_sales_kes=250000.00,
            total_inflow_kes=200000.00,
        ))
        assert "250,000.00" in html
        assert "200,000.00" in html

    def test_no_activity_message(self):
        html = render_digest_html(self._make_digest(skipped="no_activity"))
        assert "No M-PESA or sales activity yesterday" in html

    def test_unmatched_inflows_section(self):
        html = render_digest_html(self._make_digest(
            unmatched_inflows=["R001", "R002"],
        ))
        assert "R001" in html
        assert "Inflows without a matching sale" in html

    def test_unmatched_sales_section(self):
        html = render_digest_html(self._make_digest(
            unmatched_sales=["S001"],
        ))
        assert "S001" in html
        assert "Sales without a matching inflow" in html

    def test_positive_delta_green(self):
        html = render_digest_html(self._make_digest(delta_kes=5000.00))
        assert "#22c55e" in html

    def test_negative_delta_red(self):
        html = render_digest_html(self._make_digest(delta_kes=-3000.00))
        assert "#ef4444" in html

    def test_escapes_html_in_name(self):
        html = render_digest_html(self._make_digest(user_name="<script>alert(1)</script>"))
        assert "<script>" not in html

    def test_fallback_name(self):
        html = render_digest_html(self._make_digest(user_name=None))
        assert "there" in html

    def test_truncates_unmatched_at_10(self):
        many = [f"R{i:03d}" for i in range(20)]
        html = render_digest_html(self._make_digest(unmatched_inflows=many))
        assert "R009" in html
        assert "R010" not in html
