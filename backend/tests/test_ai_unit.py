"""Unit tests for services/ai.py — JSON parsing, reconciliation helpers."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from services.ai import _empty_reconciliation, _parse_llm_json, _summarise_for_prompt


# ---------------------------------------------------------------------------
# _parse_llm_json
# ---------------------------------------------------------------------------
class TestParseLlmJson:
    def test_plain_json(self):
        result = _parse_llm_json('{"matches": [], "unmatched_inflows": []}')
        assert result == {"matches": [], "unmatched_inflows": []}

    def test_markdown_fenced_json(self):
        text = '```json\n{"matches": [1, 2]}\n```'
        result = _parse_llm_json(text)
        assert result == {"matches": [1, 2]}

    def test_markdown_fenced_no_lang(self):
        text = '```\n{"ok": true}\n```'
        result = _parse_llm_json(text)
        assert result == {"ok": True}

    def test_json_embedded_in_prose(self):
        text = 'Here is the result:\n{"matches": [{"id": "a"}]}\nDone.'
        result = _parse_llm_json(text)
        assert result["matches"] == [{"id": "a"}]

    def test_invalid_json_raises(self):
        with pytest.raises(json.JSONDecodeError):
            _parse_llm_json("this is not json at all")

    def test_whitespace_around_json(self):
        result = _parse_llm_json("   \n  {\"key\": \"value\"}  \n  ")
        assert result == {"key": "value"}


# ---------------------------------------------------------------------------
# _empty_reconciliation
# ---------------------------------------------------------------------------
class TestEmptyReconciliation:
    def test_empty_inflows(self):
        result = _empty_reconciliation([], [{"id": "s1"}])
        assert result["ok"] is True
        assert result["matches"] == []
        assert result["unmatched_sales"] == ["s1"]
        assert result["unmatched_inflows"] == []

    def test_empty_sales(self):
        result = _empty_reconciliation([{"receipt": "r1"}], [])
        assert result["unmatched_inflows"] == ["r1"]
        assert result["unmatched_sales"] == []

    def test_both_empty(self):
        result = _empty_reconciliation([], [])
        assert result["ok"] is True
        assert result["matches"] == []


# ---------------------------------------------------------------------------
# _summarise_for_prompt
# ---------------------------------------------------------------------------
class TestSummariseForPrompt:
    def test_basic_extraction(self):
        inflows = [
            {"receipt": "R001", "date": "2026-01-01", "time": "10:00",
             "paidIn": 1000, "senderName": "Alice"},
        ]
        sales = [
            {"id": "S001", "date": "2026-01-01", "time": "10:05",
             "amount": 1000, "paymentMethod": "mpesa", "attendant": "Bob"},
        ]
        ib, sb = _summarise_for_prompt(inflows, sales)
        assert len(ib) == 1
        assert ib[0]["receipt"] == "R001"
        assert ib[0]["amount"] == 1000
        assert sb[0]["id"] == "S001"

    def test_truncates_at_50(self):
        inflows = [{"receipt": f"R{i}"} for i in range(100)]
        sales = [{"id": f"S{i}"} for i in range(100)]
        ib, sb = _summarise_for_prompt(inflows, sales)
        assert len(ib) == 50
        assert len(sb) == 50

    def test_missing_fields_graceful(self):
        inflows = [{}]
        sales = [{}]
        ib, sb = _summarise_for_prompt(inflows, sales)
        assert ib[0]["receipt"] is None
        assert sb[0]["id"] is None

    def test_alternate_field_names(self):
        inflows = [{"receipt": "R1", "amount": 500, "details": "John"}]
        sales = [{"id": "S1", "total": 500}]
        ib, sb = _summarise_for_prompt(inflows, sales)
        assert ib[0]["amount"] == 500
        assert ib[0]["sender"] == "John"
        assert sb[0]["amount"] == 500
