"""Realtime WebSocket sync with SECURE ticket-based authentication.

SECURITY FIXES:
- JWT no longer passed in query string (preventing proxy logs leakage)
- Implements ticket-based auth for WebSocket connections
- Enhanced connection limits per user
"""

from __future__ import annotations

import asyncio
import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from core import JWT_ALG, JWT_SECRET, log, now_iso, get_current_user

router = APIRouter()

# user_id -> set of WebSockets currently connected for that user
_connections: dict[str, set[WebSocket]] = {}
_lock = asyncio.Lock()

# Ticket-based auth for WebSocket (one-time use)
_ws_tickets: dict[str, tuple[str, datetime]] = {}  # ticket -> (user_id, expiry)
_TICKET_EXPIRY_SECONDS = 30

# Connection limits per user
MAX_CONNECTIONS_PER_USER = 10

def _decode_jwt(token: str) -> Optional[str]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except JWTError:
        return None

async def _register(user_id: str, ws: WebSocket) -> bool:
    """Register a WebSocket connection. Returns False if limit exceeded."""
    async with _lock:
        current = _connections.get(user_id, set())
        if len(current) >= MAX_CONNECTIONS_PER_USER:
            log.warning("WS connection limit exceeded for user=%s", user_id)
            return False
        _connections.setdefault(user_id, set()).add(ws)
        log.info("WS connect user=%s active=%d", user_id, len(_connections.get(user_id, [])))
        return True

async def _unregister(user_id: str, ws: WebSocket) -> None:
    async with _lock:
        s = _connections.get(user_id)
        if s:
            s.discard(ws)
            if not s:
                _connections.pop(user_id, None)
        log.info("WS disconnect user=%s remaining=%d", user_id, len(_connections.get(user_id, [])))

async def publish_to_user(user_id: str, event: dict[str, Any],
                          exclude: Optional[WebSocket] = None) -> int:
    """Send an event to every WebSocket the given user has open across devices."""
    payload = json.dumps({"at": now_iso(), **event}, default=str)
    delivered = 0
    dead: list[WebSocket] = []
    async with _lock:
        sockets = list(_connections.get(user_id, []))
    for ws in sockets:
        if exclude is not None and ws is exclude:
            continue
        try:
            await ws.send_text(payload)
            delivered += 1
        except Exception as e:
            log.warning("WS send failed for user=%s: %s — pruning socket", user_id, e)
            dead.append(ws)
    if dead:
        async with _lock:
            s = _connections.get(user_id)
            if s:
                for ws in dead:
                    s.discard(ws)
                if not s:
                    _connections.pop(user_id, None)
    return delivered

async def broadcast_all(event: dict[str, Any]) -> int:
    """Publish an event to every connected user."""
    async with _lock:
        user_ids = list(_connections.keys())
    total = 0
    for uid in user_ids:
        total += await publish_to_user(uid, event)
    return total

# ---------------------------------------------------------------------------
# Ticket-based WebSocket Auth (secure alternative to query param tokens)
# ---------------------------------------------------------------------------
@router.post("/ws/ticket")
async def create_ws_ticket(user: dict = Depends(get_current_user)):
    """Create a one-time WebSocket connection ticket.

    The frontend calls this before opening a WebSocket, then passes
    the ticket in the query string (tickets are single-use and expire
    in 30 seconds, making them safe to pass in URLs).
    """
    ticket = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(seconds=_TICKET_EXPIRY_SECONDS)
    _ws_tickets[ticket] = (user["id"], expiry)
    return {"ticket": ticket, "expires_in": _TICKET_EXPIRY_SECONDS}

@router.websocket("/ws/sync")
async def ws_sync(websocket: WebSocket, ticket: str = Query(default="")):
    """Per-user WebSocket with ticket-based authentication.

    The frontend should:
    1. POST /api/ws/ticket (with Bearer token) to get a ticket
    2. Open WebSocket to /api/ws/sync?ticket=<ticket>
    3. The ticket is consumed on first use and cannot be replayed
    """
    # Validate ticket
    if not ticket:
        await websocket.accept()
        await websocket.close(code=4401, reason="Missing ticket")
        return

    ticket_entry = _ws_tickets.pop(ticket, None)
    if not ticket_entry:
        await websocket.accept()
        await websocket.close(code=4401, reason="Invalid or expired ticket")
        return

    user_id, expiry = ticket_entry
    if datetime.now(timezone.utc) > expiry:
        await websocket.accept()
        await websocket.close(code=4401, reason="Ticket expired")
        return

    if not user_id:
        await websocket.accept()
        await websocket.close(code=4401, reason="Authentication required")
        return

    await websocket.accept()

    # Check connection limit
    if not await _register(user_id, websocket):
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "Maximum connections exceeded",
            "at": now_iso(),
        }))
        await websocket.close(code=4408, reason="Too many connections")
        return

    await websocket.send_text(json.dumps({"type": "hello", "user_id": user_id, "at": now_iso()}))

    # Server-side heartbeat task
    async def _heartbeat():
        try:
            while True:
                await asyncio.sleep(25)
                await websocket.send_text(json.dumps({"type": "ping", "at": now_iso()}))
        except Exception:
            pass

    hb = asyncio.create_task(_heartbeat())
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if isinstance(msg, dict) and msg.get("type"):
                    await publish_to_user(user_id, msg, exclude=websocket)
            except json.JSONDecodeError:
                continue
    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.warning("WS error user=%s: %s", user_id, e)
    finally:
        hb.cancel()
        await _unregister(user_id, websocket)

@router.get("/ws/stats")
async def ws_stats():
    """Public stats endpoint (no PII)."""
    async with _lock:
        users = len(_connections)
        total_sockets = sum(len(s) for s in _connections.values())
    return {"ok": True, "users_connected": users, "sockets_open": total_sockets}
