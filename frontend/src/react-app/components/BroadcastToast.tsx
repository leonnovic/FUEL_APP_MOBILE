import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

/**
 * Renders a transient toast whenever the realtime layer receives a
 * `founder.broadcast` event. Auto-dismisses after 9s.
 */

type Broadcast = {
  message: string;
  severity?: 'info' | 'warning' | 'critical' | string;
  at?: string;
};

export default function BroadcastToast() {
  const [item, setItem] = useState<Broadcast | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<Broadcast>;
      if (!ce.detail?.message) return;
      setItem(ce.detail);
      const t = setTimeout(() => setItem(null), 9000);
      return () => clearTimeout(t);
    };
    window.addEventListener('fuelpro:broadcast', handler as EventListener);
    return () => window.removeEventListener('fuelpro:broadcast', handler as EventListener);
  }, []);

  if (!item) return null;

  const severity = item.severity || 'info';
  const tone =
    severity === 'critical' ? 'bg-red-600/95 border-red-300/40'
    : severity === 'warning' ? 'bg-amber-500/95 border-amber-200/40 text-black'
    : 'bg-indigo-600/95 border-indigo-300/40';

  return (
    <div
      role="alert"
      data-testid="broadcast-toast"
      className={`fixed top-4 right-4 z-[10000] max-w-md flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border ${tone} text-white animate-fade-in`}
    >
      <Bell size={18} className="mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase opacity-80 mb-0.5">
          {severity === 'critical' ? 'Critical broadcast' : severity === 'warning' ? 'Notice' : 'Announcement'}
        </p>
        <p className="text-sm leading-snug">{item.message}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setItem(null)}
        className="opacity-70 hover:opacity-100 transition-opacity"
        data-testid="broadcast-toast-dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
