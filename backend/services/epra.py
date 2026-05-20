"""EPRA Kenya fuel-price RSS parser with in-memory caching."""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import feedparser
import httpx

log = logging.getLogger("fuelpro.epra")

# Curated baseline used while the network call is in flight or if EPRA is unreachable.
BASELINE = {
    "ok": True, "source": "fuelpro_baseline", "currency": "KES",
    "valid_from": "2026-01-15", "valid_to": "2026-02-14",
    "prices": {
        "nairobi":  {"petrol": 176.58, "diesel": 168.06, "kerosene": 156.04},
        "mombasa":  {"petrol": 173.31, "diesel": 164.80, "kerosene": 152.78},
        "kisumu":   {"petrol": 179.10, "diesel": 170.58, "kerosene": 158.56},
        "nakuru":   {"petrol": 177.21, "diesel": 168.69, "kerosene": 156.67},
        "eldoret":  {"petrol": 179.97, "diesel": 171.45, "kerosene": 159.43},
        "lodwar":   {"petrol": 195.34, "diesel": 186.82, "kerosene": 174.80},
    },
}

_CACHE: dict[str, Any] = {"data": None, "fetched_at": None}
_CACHE_TTL = timedelta(hours=6)


_PRICE_RE = re.compile(r"(?P<fuel>petrol|diesel|kerosene)[^0-9]{0,40}(?P<amt>\d{2,3}\.\d{2})", re.I)


def _parse_rss_for_prices(feed_text: str) -> Optional[dict[str, Any]]:
    """Try to extract fuel prices from the EPRA RSS feed.

    The EPRA feed format is loosely structured — entries are press releases
    containing prose like "Super Petrol Ksh 176.58 per litre". We grep with
    a tolerant regex; if we can't pull at least 2 distinct fuel→price pairs
    we return None so the caller can fall back to the baseline.
    """
    feed = feedparser.parse(feed_text)
    if not feed.entries:
        return None

    for entry in feed.entries[:5]:
        title = entry.get("title", "")
        summary = entry.get("summary", "") + " " + entry.get("description", "")
        published = entry.get("published_parsed")
        blob = f"{title} {summary}"
        hits = {m.group("fuel").lower(): float(m.group("amt")) for m in _PRICE_RE.finditer(blob)}
        if len(hits) >= 2:
            now = datetime.now(timezone.utc)
            valid_from = (datetime(*published[:6], tzinfo=timezone.utc) if published else now).date().isoformat()
            valid_to = (now + timedelta(days=30)).date().isoformat()
            prices = {
                "nairobi": {
                    "petrol":   hits.get("petrol",   BASELINE["prices"]["nairobi"]["petrol"]),
                    "diesel":   hits.get("diesel",   BASELINE["prices"]["nairobi"]["diesel"]),
                    "kerosene": hits.get("kerosene", BASELINE["prices"]["nairobi"]["kerosene"]),
                },
            }
            # Replicate Nairobi pricing to other towns adjusted by the baseline deltas
            base_n = BASELINE["prices"]["nairobi"]
            for town, p in BASELINE["prices"].items():
                if town == "nairobi":
                    continue
                prices[town] = {
                    fuel: round(prices["nairobi"][fuel] + (p[fuel] - base_n[fuel]), 2)
                    for fuel in ("petrol", "diesel", "kerosene")
                }
            return {
                "ok": True, "source": "epra_rss", "currency": "KES",
                "valid_from": valid_from, "valid_to": valid_to,
                "prices": prices,
                "epra_announcement": title,
                "epra_link": entry.get("link"),
            }
    return None


async def get_fuel_prices(region: str = "nairobi") -> dict[str, Any]:
    """Return EPRA prices, preferring fresh RSS data and falling back to baseline."""
    now = datetime.now(timezone.utc)
    if _CACHE["data"] and _CACHE["fetched_at"] and now - _CACHE["fetched_at"] < _CACHE_TTL:
        return {**_CACHE["data"], "region": region, "fetched_at": _CACHE["fetched_at"].isoformat(), "cached": True}

    rss_url = os.environ.get("EPRA_RSS_URL", "https://www.epra.go.ke/rss-feed/").strip()
    parsed: Optional[dict[str, Any]] = None
    fetch_error: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as c:
            r = await c.get(rss_url, headers={"User-Agent": "FuelPro/1.0 (+https://fuelpro.app)"})
        if r.status_code == 200 and r.text:
            parsed = _parse_rss_for_prices(r.text)
        else:
            fetch_error = f"HTTP {r.status_code}"
    except Exception as e:
        fetch_error = str(e)
        log.info("EPRA RSS fetch failed (%s) — using baseline", fetch_error)

    data = parsed or {**BASELINE, "source": f"baseline_fallback ({fetch_error})" if fetch_error else "baseline_fallback"}
    _CACHE["data"] = data
    _CACHE["fetched_at"] = now
    return {**data, "region": region, "fetched_at": now.isoformat(), "cached": False}
