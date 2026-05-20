"""Realtime WebSocket sync.

Frontend opens a WS to `/api/ws/sync?token=<JWT>`. The server validates the
JWT, registers the connection in the per-user set, and forwards broadcast
events (sync.write, audit, broadcast). Heart-beat pings every 25s keep the
connection alive through ingress timeouts.

Broadcaster is exposed via `publish_to_user(user_id, event)` so other routers
(sync, founder ops, digest) can push events without coupling to the WS layer.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from core import JWT_ALG, JWT_SECRET, log, now_iso

router = APIRouter()


# user_id -> set of WebSockets currently connected for that user
_connections: dict[str, set[WebSocket]] = {}
_lock = asyncio.Lock()


def _decode_jwt(token: str) -> Optional[str]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except JWTError:
        return None


async def _register(user_id: str, ws: WebSocket) -> None:
    async with _lock:
        _connections.setdefault(user_id, set()).add(ws)
    log.info("WS connect user=%s active=%d", user_id, len(_connections.get(user_id, [])))


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
    """Send an event to every WebSocket the given user has open across devices.
    Returns the number of sockets the event was successfully delivered to.

    `exclude` (optional) lets the caller skip a specific socket — typically
    the originating client, so the sender doesn't receive its own echo.

    Other routers should call this with `await publish_to_user(uid, {...})`.
    Failure to deliver to one socket does not prevent delivery to others; dead
    sockets are pruned eagerly.
    """
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
    """Publish an event to every connected user. Returns the total delivery count."""
    async with _lock:
        user_ids = list(_connections.keys())
    total = 0
    for uid in user_ids:
        total += await publish_to_user(uid, event)
    return total


@router.websocket("/ws/sync")
async def ws_sync(websocket: WebSocket, token: str = Query(default="")):
    """Per-user WebSocket. Token is the FuelPro JWT issued at /auth/login.
    Browser native `WebSocket` API can't set headers, so we pass it as a query
    string. Verify, register, then heartbeat + relay messages until disconnect.
    """
    user_id = _decode_jwt(token)
    if not user_id:
        # Accept first so the close frame actually carries our 4401 code
        # (Starlette short-circuits to HTTP 403 if we close before accepting).
        await websocket.accept()
        await websocket.close(code=4401, reason="Invalid or missing token")
        return
    await websocket.accept()
    await _register(user_id, websocket)
    await websocket.send_text(json.dumps({"type": "hello", "user_id": user_id, "at": now_iso()}))

    # Server-side heartbeat task (ingresses kill idle WS after ~30s otherwise)
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
            # Fan out to this user's OTHER sockets so multi-device state stays
            # in sync. Sender is excluded so it doesn't receive its own echo.
            try:
                msg = json.loads(data)
                if isinstance(msg, dict) and msg.get("type"):
                    await publish_to_user(user_id, msg, exclude=websocket)
            except json.JSONDecodeError:
                # ignore non-JSON
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
