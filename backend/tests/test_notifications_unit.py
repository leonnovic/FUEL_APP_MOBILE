"""Unit tests for services/notifications.py — email templates, no-key fallbacks, phone normalisation."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from services.notifications import (
    invite_email_html,
    password_reset_email_html,
    send_email,
    send_sms,
)


# ---------------------------------------------------------------------------
# password_reset_email_html
# ---------------------------------------------------------------------------
class TestPasswordResetEmailHtml:
    def test_contains_code(self):
        html = password_reset_email_html("Alice", "123456")
        assert "123456" in html

    def test_contains_name(self):
        html = password_reset_email_html("Bob", "999999")
        assert "Bob" in html

    def test_escapes_html_in_name(self):
        html = password_reset_email_html("<script>alert(1)</script>", "000000")
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_escapes_html_in_code(self):
        html = password_reset_email_html("Test", "<b>bold</b>")
        assert "&lt;b&gt;" in html

    def test_includes_reset_url_when_provided(self):
        html = password_reset_email_html("User", "111111", reset_url="https://app.fuelpro.app/reset?t=abc")
        assert "https://app.fuelpro.app/reset?t=abc" in html
        assert "Reset your password" in html

    def test_no_cta_without_url(self):
        html = password_reset_email_html("User", "111111")
        assert "Reset your password" not in html

    def test_fallback_name(self):
        html = password_reset_email_html("", "123456")
        assert "there" in html


# ---------------------------------------------------------------------------
# invite_email_html
# ---------------------------------------------------------------------------
class TestInviteEmailHtml:
    def test_contains_inviter(self):
        html = invite_email_html("Alice", "Shell Station", "https://example.com/accept", "staff")
        assert "Alice" in html

    def test_contains_station(self):
        html = invite_email_html("Alice", "Shell Station", "https://example.com/accept", "staff")
        assert "Shell Station" in html

    def test_contains_role(self):
        html = invite_email_html("Bob", "Total", "https://x.com", "manager")
        assert "manager" in html

    def test_contains_accept_link(self):
        url = "https://app.fuelpro.app/accept?code=abc123"
        html = invite_email_html("C", "S", url, "auditor")
        assert url in html

    def test_escapes_html(self):
        html = invite_email_html("<b>Bad</b>", "<script>x</script>", "url", "staff")
        assert "&lt;b&gt;Bad&lt;/b&gt;" in html
        assert "&lt;script&gt;" in html
        assert "<script>x</script>" not in html


# ---------------------------------------------------------------------------
# send_email (no-key path)
# ---------------------------------------------------------------------------
class TestSendEmailNoKey:
    @pytest.mark.asyncio
    async def test_skips_when_no_api_key(self):
        with patch.dict(os.environ, {"RESEND_API_KEY": ""}, clear=False):
            result = await send_email("test@example.com", "Subject", text="Body")
            assert result["ok"] is False
            assert result["skipped"] == "no_key"

    @pytest.mark.asyncio
    async def test_skips_with_list_recipients(self):
        with patch.dict(os.environ, {"RESEND_API_KEY": ""}, clear=False):
            result = await send_email(
                ["a@example.com", "b@example.com"],
                "Subject",
                html="<p>Hello</p>",
            )
            assert result["ok"] is False
            assert result["skipped"] == "no_key"


# ---------------------------------------------------------------------------
# send_sms (no-key path + phone normalisation)
# ---------------------------------------------------------------------------
class TestSendSmsNoKey:
    @pytest.mark.asyncio
    async def test_skips_when_no_credentials(self):
        with patch.dict(os.environ, {
            "TWILIO_ACCOUNT_SID": "",
            "TWILIO_AUTH_TOKEN": "",
            "TWILIO_FROM_NUMBER": "",
        }, clear=False):
            result = await send_sms("+254712345678", "Hello")
            assert result["ok"] is False
            assert result["skipped"] == "no_key"

    @pytest.mark.asyncio
    async def test_skips_with_partial_creds(self):
        with patch.dict(os.environ, {
            "TWILIO_ACCOUNT_SID": "ACfake",
            "TWILIO_AUTH_TOKEN": "",
            "TWILIO_FROM_NUMBER": "+1234567890",
        }, clear=False):
            result = await send_sms("+254712345678", "Test")
            assert result["ok"] is False
            assert result["skipped"] == "no_key"
