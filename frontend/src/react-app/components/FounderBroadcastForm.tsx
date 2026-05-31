/**
 * FounderBroadcastForm — push a notification to all subscribed users.
 * Mounted inside the founder dashboard. Uses /api/push/broadcast (founder auth required).
 */
import { useState } from 'react';
import { Megaphone, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = (
  import.meta.env.VITE_REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

export default function FounderBroadcastForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null); setResult(null);
    if (!title.trim() || !body.trim()) { setError('Title and body are required.'); return; }
    if (title.length > 120) { setError('Title must be ≤ 120 chars.'); return; }
    if (body.length > 400) { setError('Body must be ≤ 400 chars.'); return; }
    setBusy(true);
    try {
      const token = localStorage.getItem('fuelpro_founder_jwt') || localStorage.getItem('fuelpro_jwt') || '';
      const r = await fetch(`${API_BASE}/api/push/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || '/' }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        setError(`Broadcast failed (${r.status}): ${txt.slice(0, 120)}`);
        return;
      }
      const j = await r.json();
      setResult({ sent: j.sent || 0, failed: j.failed || 0 });
      setTitle(''); setBody('');
    } catch (e) {
      setError((e as Error)?.message || 'Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4" data-testid="founder-broadcast-form">
      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <Megaphone size={14} className="text-amber-400" /> Broadcast push notification
        <span className="text-[10px] text-gray-500 font-normal ml-1">— sends to every subscribed user</span>
      </h3>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Title (max 120 chars)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="w-full px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
          data-testid="broadcast-title-input"
        />
        <textarea
          placeholder="Body (max 400 chars)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={400}
          rows={2}
          className="w-full px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none resize-none"
          data-testid="broadcast-body-input"
        />
        <input
          type="text"
          placeholder="Destination URL (default: /)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 bg-black/40 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
          data-testid="broadcast-url-input"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-500">{title.length}/120 · {body.length}/400</span>
          <button
            onClick={send}
            disabled={busy || !title.trim() || !body.trim()}
            data-testid="broadcast-send-btn"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-400 rounded-lg text-xs font-bold text-black transition-colors flex items-center gap-1.5"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send broadcast
          </button>
        </div>
        {result && (
          <div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2" data-testid="broadcast-result">
            <CheckCircle2 size={12} /> Delivered to {result.sent} {result.sent === 1 ? 'device' : 'devices'}
            {result.failed > 0 && <span className="text-amber-300 ml-1">· {result.failed} failed</span>}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2" data-testid="broadcast-error">
            <AlertCircle size={12} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
