/**
 * Daily Digest preview page.
 *
 * Lets the owner preview today's digest, see a 14-day history, and force-send
 * a test to themselves to verify the email pipeline (Resend) is wired.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Mail, Send, RefreshCw, CheckCircle2, AlertCircle, Loader2, Clock, History } from 'lucide-react';
import PushNotificationToggle from '@/react-app/components/PushNotificationToggle';

const API_BASE = import.meta.env.VITE_REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

interface DigestRow {
  date: string;
  label: string;
  sales_count: number;
  inflows_count: number;
  matched: number;
  total_sales_kes: number;
  total_inflow_kes: number;
  delta_kes: number;
  delivery?: { ok?: boolean; skipped?: string };
  sent_at?: string;
  skipped?: string;
}

export default function DailyDigestPage() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ digest: DigestRow; html: string } | null>(null);
  const [history, setHistory] = useState<DigestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('fuelpro_jwt');

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const token = getToken();
      if (!token) { setError('Please sign in.'); setLoading(false); return; }
      const auth = { Authorization: `Bearer ${token}` };
      const [pRes, hRes] = await Promise.all([
        fetch(`${API_BASE}/api/digest/preview`, { method: 'POST', headers: auth }),
        fetch(`${API_BASE}/api/digest/history`, { headers: auth }),
      ]);
      if (pRes.ok) setPreview(await pRes.json());
      if (hRes.ok) setHistory((await hRes.json()).items || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load digest');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const sendNow = async () => {
    setSending(true); setSendResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/digest/send`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await r.json();
      if (data?.delivery?.ok) setSendResult('✓ Digest emailed successfully.');
      else if (data?.delivery?.skipped === 'no_key') setSendResult('Resend API key not configured — digest stored in DB only. Paste RESEND_API_KEY in /app/backend/.env to enable real emails.');
      else setSendResult(`Send failed: ${data?.delivery?.error || 'unknown'}`);
      await loadAll();
    } catch (e: unknown) {
      setSendResult(`Send failed: ${e instanceof Error ? e.message : 'network error'}`);
    } finally { setSending(false); }
  };

  const d = preview?.digest;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pt-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2"
          data-testid="digest-back-btn"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Mail size={22} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif">Daily Digest</h1>
              <p className="text-sm text-gray-400">AI-reconciled M-PESA inflows vs sales — delivered 07:00 daily</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] rounded-lg text-sm font-semibold flex items-center gap-2"
              data-testid="digest-refresh-btn"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={sendNow}
              disabled={sending}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 text-black rounded-lg text-sm font-bold flex items-center gap-2"
              data-testid="digest-send-btn"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send to me now
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/40 rounded-xl flex gap-3">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {sendResult && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/40 rounded-xl flex gap-3" data-testid="digest-send-result">
            <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">{sendResult}</p>
          </div>
        )}

        {/* Push notifications opt-in */}
        <section className="mb-8" data-testid="digest-push-section">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Browser notifications</h2>
          <PushNotificationToggle />
        </section>

        {/* Today's preview */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Today's preview ({d?.label || 'loading…'})</h2>
          {loading && <div className="p-12 text-center text-gray-400 text-sm"><Loader2 size={16} className="animate-spin inline mr-2" /> Building digest…</div>}
          {!loading && d && d.skipped === 'no_activity' && (
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-12 text-center text-gray-400" data-testid="digest-empty-state">
              No M-PESA or sales activity yesterday. Record a sale or upload an M-PESA PDF to see this in action.
            </div>
          )}
          {!loading && d && d.skipped !== 'no_activity' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="digest-summary-cards">
              <KpiCard label="Sales recorded"    value={d.sales_count.toString()}    sub={`Total Ksh ${d.total_sales_kes.toLocaleString()}`} />
              <KpiCard label="M-PESA inflows"    value={d.inflows_count.toString()}  sub={`Total Ksh ${d.total_inflow_kes.toLocaleString()}`} />
              <KpiCard label="AI-matched"        value={`${d.matched}/${Math.max(d.sales_count, d.inflows_count)}`} sub={`Delta Ksh ${d.delta_kes.toLocaleString()}`} accent={d.matched === Math.max(d.sales_count, d.inflows_count) ? '#22c55e' : '#f59e0b'} />
            </div>
          )}
          {!loading && preview?.html && d && d.skipped !== 'no_activity' && (
            <details className="mt-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-amber-400 select-none">
                Preview the actual email HTML
              </summary>
              <iframe
                title="digest-preview"
                srcDoc={preview.html}
                className="w-full h-[640px] border-0 bg-white"
                data-testid="digest-html-preview"
              />
            </details>
          )}
        </section>

        {/* History */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History size={14} /> Last 14 days
          </h2>
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No digests sent yet. Click "Send to me now" to generate the first one.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-black/30 text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Inflows</th>
                    <th className="px-4 py-3 text-right">Matched</th>
                    <th className="px-4 py-3 text-right">Delta (KES)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {history.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.03]" data-testid={`digest-history-row-${i}`}>
                      <td className="px-4 py-3 font-medium">{row.label || row.date}</td>
                      <td className="px-4 py-3 text-right">{row.sales_count}</td>
                      <td className="px-4 py-3 text-right">{row.inflows_count}</td>
                      <td className="px-4 py-3 text-right">{row.matched}</td>
                      <td className={`px-4 py-3 text-right font-mono ${row.delta_kes >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {row.delta_kes.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.delivery?.ok ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-md text-[10px] uppercase">
                            <CheckCircle2 size={11} /> Sent
                          </span>
                        ) : row.delivery?.skipped === 'no_key' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md text-[10px] uppercase">
                            No key
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/10 text-gray-400 border border-gray-500/30 rounded-md text-[10px] uppercase">
                            <Clock size={11} /> Stored
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent = '#e5e5e5' }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold font-serif" style={{ color: accent }}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
