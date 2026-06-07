/**
 * FuelPro WebSocket Server
 * Real-time bidirectional communication for instant sync
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = process.env.WS_PORT || 3001;

// Connected clients per station
const stations = new Map();

// Message types
const MSG_TYPES = {
  AUTH: 'auth',
  SYNC: 'sync',
  PUSH: 'push',
  PULL: 'pull',
  BROADCAST: 'broadcast',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
  SUCCESS: 'success'
};

// Station rooms for broadcasting
const rooms = new Map();

function broadcast(stationId, message, excludeWs = null) {
  const room = rooms.get(stationId);
  if (!room) return;
  
  const payload = JSON.stringify(message);
  room.forEach(ws => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function handleMessage(ws, data) {
  try {
    const message = JSON.parse(data);
    const { type, payload, id } = message;
    
    switch (type) {
      case MSG_TYPES.AUTH:
        handleAuth(ws, payload);
        send(ws, { type: MSG_TYPES.SUCCESS, id, payload: { authenticated: true } });
        break;
        
      case MSG_TYPES.PING:
        send(ws, { type: MSG_TYPES.PONG, id });
        break;
        
      case MSG_TYPES.PUSH:
        handlePush(ws, payload);
        break;
        
      case MSG_TYPES.BROADCAST:
        handleBroadcast(ws, payload);
        break;
        
      case MSG_TYPES.SYNC:
        handleSync(ws, payload);
        break;
        
      default:
        send(ws, { type: MSG_TYPES.ERROR, id, payload: { message: 'Unknown message type' } });
    }
  } catch (e) {
    console.error('[WS] Parse error:', e.message);
    send(ws, { type: MSG_TYPES.ERROR, payload: { message: 'Invalid JSON' } });
  }
}

function handleAuth(ws, payload) {
  const { stationId, userId, token } = payload;
  
  if (!stationId) {
    send(ws, { type: MSG_TYPES.ERROR, payload: { message: 'stationId required' } });
    return;
  }
  
  ws.stationId = stationId;
  ws.userId = userId;
  
  // Join station room
  if (!rooms.has(stationId)) {
    rooms.set(stationId, new Set());
  }
  rooms.get(stationId).add(ws);
  
  console.log(`[WS] Client joined station ${stationId} (${rooms.get(stationId).size} clients)`);
}

function handlePush(ws, { collection, record, operation }) {
  if (!ws.stationId) {
    send(ws, { type: MSG_TYPES.ERROR, payload: { message: 'Not authenticated' } });
    return;
  }
  
  // Broadcast to other clients in the same station
  broadcast(ws.stationId, {
    type: MSG_TYPES.SYNC,
    payload: {
      collection,
      operation,
      record,
      userId: ws.userId,
      timestamp: Date.now()
    }
  }, ws);
}

function handleBroadcast(ws, payload) {
  if (!ws.stationId) {
    send(ws, { type: MSG_TYPES.ERROR, payload: { message: 'Not authenticated' } });
    return;
  }
  
  broadcast(ws.stationId, {
    type: MSG_TYPES.BROADCAST,
    payload: {
      ...payload,
      userId: ws.userId,
      timestamp: Date.now()
    }
  });
}

function handleSync(ws, payload) {
  if (!ws.stationId) {
    send(ws, { type: MSG_TYPES.ERROR, payload: { message: 'Not authenticated' } });
    return;
  }
  
  // Request latest data from station
  const room = rooms.get(ws.stationId);
  if (room) {
    // Notify other clients to send their pending changes
    broadcast(ws.stationId, {
      type: MSG_TYPES.PULL,
      payload: {
        requesterId: ws.userId,
        collections: payload.collections
      }
    }, ws);
  }
}

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function handleClose(ws) {
  if (ws.stationId) {
    const room = rooms.get(ws.stationId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        rooms.delete(ws.stationId);
      } else {
        console.log(`[WS] Client left station ${ws.stationId} (${room.size} remaining)`);
      }
    }
  }
}

// Create HTTP server
const server = createServer();

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log(`[WS] New connection from ${req.socket.remoteAddress}`);
  
  // Set up heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  
  ws.on('message', (data) => handleMessage(ws, data.toString()));
  ws.on('close', () => handleClose(ws));
  ws.on('error', (err) => console.error('[WS] Error:', err.message));
  
  // Send welcome
  send(ws, { type: MSG_TYPES.SUCCESS, payload: { message: 'Connected to FuelPro WS' } });
});

// Heartbeat interval
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      handleClose(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

// Start server
server.listen(PORT, () => {
  console.log(`[WS] FuelPro WebSocket server running on port ${PORT}`);
});

export default server;