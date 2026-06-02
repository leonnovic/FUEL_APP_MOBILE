"""Unit tests for services/epra.py — RSS parsing, baseline data, caching."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from services.epra import BASELINE, _CACHE, _PRICE_RE, _parse_rss_for_prices


# ---------------------------------------------------------------------------
# BASELINE structure
# ---------------------------------------------------------------------------
class TestBaseline:
    def test_has_required_keys(self):
        assert BASELINE["ok"] is True
        assert BASELINE["currency"] == "KES"
        assert "valid_from" in BASELINE
        assert "valid_to" in BASELINE

    def test_has_all_towns(self):
        expected_towns = {"nairobi", "mombasa", "kisumu", "nakuru", "eldoret", "lodwar"}
        assert set(BASELINE["prices"].keys()) == expected_towns

    def test_each_town_has_fuel_types(self):
        for town, prices in BASELINE["prices"].items():
            assert "petrol" in prices, f"{town} missing petrol"
            assert "diesel" in prices, f"{town} missing diesel"
            assert "kerosene" in prices, f"{town} missing kerosene"
            for fuel, price in prices.items():
                assert isinstance(price, (int, float)), f"{town}/{fuel} not numeric"
                assert price > 0, f"{town}/{fuel} should be positive"

    def test_nairobi_prices_are_reasonable(self):
        n = BASELINE["prices"]["nairobi"]
        assert 100 < n["petrol"] < 300
        assert 100 < n["diesel"] < 300
        assert 100 < n["kerosene"] < 300


# ---------------------------------------------------------------------------
# Price regex
# ---------------------------------------------------------------------------
class TestPriceRegex:
    def test_matches_petrol(self):
        m = _PRICE_RE.search("Super Petrol Ksh 176.58 per litre")
        assert m is not None
        assert m.group("fuel").lower() == "petrol"
        assert m.group("amt") == "176.58"

    def test_matches_diesel(self):
        m = _PRICE_RE.search("Diesel: 168.06")
        assert m is not None
        assert m.group("fuel").lower() == "diesel"

    def test_matches_kerosene(self):
        m = _PRICE_RE.search("Kerosene at 156.04 per litre")
        assert m is not None
        assert m.group("fuel").lower() == "kerosene"

    def test_no_match_without_price(self):
        m = _PRICE_RE.search("Petrol availability is limited")
        assert m is None

    def test_case_insensitive(self):
        m = _PRICE_RE.search("PETROL costs 180.00")
        assert m is not None


# ---------------------------------------------------------------------------
# _parse_rss_for_prices
# ---------------------------------------------------------------------------
class TestParseRssForPrices:
    SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>EPRA</title>
        <item>
          <title>Maximum Pump Prices for January 2026</title>
          <description>
            Super Petrol Ksh 180.50 per litre in Nairobi.
            Diesel Ksh 170.25 per litre. Kerosene Ksh 158.00.
          </description>
          <pubDate>Wed, 15 Jan 2026 10:00:00 GMT</pubDate>
          <link>https://www.epra.go.ke/prices</link>
        </item>
      </channel>
    </rss>"""

    def test_parses_valid_rss(self):
        result = _parse_rss_for_prices(self.SAMPLE_RSS)
        assert result is not None
        assert result["ok"] is True
        assert result["source"] == "epra_rss"
        assert "nairobi" in result["prices"]
        assert result["prices"]["nairobi"]["petrol"] == 180.50
        assert result["prices"]["nairobi"]["diesel"] == 170.25
        assert result["prices"]["nairobi"]["kerosene"] == 158.00

    def test_adjusts_other_towns_by_delta(self):
        result = _parse_rss_for_prices(self.SAMPLE_RSS)
        assert result is not None
        base_n = BASELINE["prices"]["nairobi"]
        for town in ("mombasa", "kisumu", "nakuru", "eldoret", "lodwar"):
            if town in result["prices"]:
                for fuel in ("petrol", "diesel", "kerosene"):
                    expected = round(
                        result["prices"]["nairobi"][fuel]
                        + (BASELINE["prices"][town][fuel] - base_n[fuel]),
                        2,
                    )
                    assert result["prices"][town][fuel] == expected

    def test_returns_none_for_empty_feed(self):
        empty_rss = '<?xml version="1.0"?><rss><channel></channel></rss>'
        assert _parse_rss_for_prices(empty_rss) is None

    def test_returns_none_for_no_prices_in_entry(self):
        rss = """<?xml version="1.0"?>
        <rss version="2.0"><channel>
          <item>
            <title>EPRA Announces New Regulations</title>
            <description>No price data here.</description>
          </item>
        </channel></rss>"""
        assert _parse_rss_for_prices(rss) is None

    def test_needs_at_least_two_fuel_types(self):
        rss = """<?xml version="1.0"?>
        <rss version="2.0"><channel>
          <item>
            <title>Price Update</title>
            <description>Petrol is now 180.00 per litre.</description>
          </item>
        </channel></rss>"""
        assert _parse_rss_for_prices(rss) is None

    def test_includes_epra_link(self):
        result = _parse_rss_for_prices(self.SAMPLE_RSS)
        assert result is not None
        assert result["epra_link"] == "https://www.epra.go.ke/prices"
        assert "Maximum Pump Prices" in result["epra_announcement"]
