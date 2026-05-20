import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

/**
 * Small "Active devices" badge — counts open WebSocket connections for the
 * current user. Polls /api/identity/me/devices every 20s and reacts to
 * realtime 'hello' events from the WS layer.
 */

const API_BASE = (
  (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

export default function ActiveDevicesBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const fetchCount = async () => {
      const token = localStorage.getItem('fuelpro_jwt') || '';
      if (!token) { setCount(null); return; }
      try {
        const r = await fetch(`${API_BASE}/api/identity/me/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) { setCount(null); return; }
        const d = await r.json();
        setCount(d.count ?? 0);
      } catch { /* no-op */ }
    };
    fetchCount();
    timer = setInterval(fetchCount, 20_000);
    const onRealtime = (e: Event) => {
      const ce = e as CustomEvent<{ type?: string }>;
      if (ce.detail?.type === 'hello' || ce.detail?.type === 'ping') fetchCount();
    };
    window.addEventListener('fuelpro:realtime', onRealtime as EventListener);
    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener('fuelpro:realtime', onRealtime as EventListener);
    };
  }, []);

  if (count === null || count < 1) return null;

  const label = count === 1 ? '1 device live' : `${count} devices live`;
  return (
    <span
      data-testid="active-devices-badge"
      title={label}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <Smartphone size={11} />
      {count}
    </span>
  );
}
