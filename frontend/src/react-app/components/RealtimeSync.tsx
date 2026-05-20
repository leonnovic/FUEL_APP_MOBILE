import { useEffect, useRef } from 'react';

/**
 * Mounts a singleton WebSocket to `/api/ws/sync` whenever a FuelPro JWT is
 * present in localStorage. The server fans out events from other devices on
 * the same account (`sync.updated`, `user-data.updated`) and founder
 * broadcasts (`founder.broadcast`). The component is fire-and-forget — it
 * dispatches DOM `CustomEvent`s so feature modules (FuelContext, sync
 * engine, broadcast toast) can react without coupling to this file.
 *
 * Auto-reconnects with exponential back-off (1s → 30s cap). Heart-beats are
 * sent server-side every 25s so idle ingress sockets don't get reaped.
 */

const API_BASE = (
  (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

function wsBase(): string {
  return API_BASE.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
}

export default function RealtimeSync() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectMs = useRef<number>(1000);
  const closedByUs = useRef<boolean>(false);

  useEffect(() => {
    const connect = () => {
      const token = localStorage.getItem('fuelpro_jwt') || '';
      if (!token) {
        // Retry later — user might log in.
        setTimeout(connect, 5000);
        return;
      }
      try {
        const url = `${wsBase()}/api/ws/sync?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectMs.current = 1000;
          // eslint-disable-next-line no-console
          console.debug('[RealtimeSync] connected');
        };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data?.type === 'ping') return;
            window.dispatchEvent(new CustomEvent('fuelpro:realtime', { detail: data }));
            if (data?.type === 'founder.broadcast') {
              window.dispatchEvent(new CustomEvent('fuelpro:broadcast', { detail: data }));
            }
          } catch {
            /* ignore non-JSON frames */
          }
        };
        ws.onerror = () => {
          /* swallow — onclose handles reconnect */
        };
        ws.onclose = () => {
          wsRef.current = null;
          if (closedByUs.current) return;
          const delay = Math.min(reconnectMs.current, 30000);
          reconnectMs.current = Math.min(reconnectMs.current * 2, 30000);
          setTimeout(connect, delay);
        };
      } catch {
        setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      closedByUs.current = true;
      try { wsRef.current?.close(); } catch { /* */ }
    };
  }, []);

  return null;
}
