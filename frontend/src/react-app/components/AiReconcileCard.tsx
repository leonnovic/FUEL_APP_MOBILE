/**
 * AiReconcileCard
 * Takes the extracted M-PESA inflows and reconciles them against the user's
 * recent sales records via the backend's AI endpoint (powered by the Emergent
 * LLM key). Shows matched receipts, unmatched inflows, and unmatched sales.
 */
import { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useFuel } from '@/react-app/context/FuelContext';

interface InflowLike {
  receipt: string;
  date: string;
  time: string;
  paidIn?: number;
  amount?: number;
  senderName?: string;
  details?: string;
}

interface ReconcileMatch {
  inflow_receipt: string;
  sale_id: string;
  confidence: number;
  reason: string;
}

interface ReconcileResult {
  ok: boolean;
  matches?: ReconcileMatch[];
  unmatched_inflows?: string[];
  unmatched_sales?: string[];
  error?: string;
  note?: string;
}

export default function AiReconcileCard({ inflows }: { inflows: InflowLike[] }) {
  const fuel = useFuel() as unknown as { sales?: Array<Record<string, unknown>> };
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sales = Array.isArray(fuel?.sales) ? fuel.sales.slice(0, 50) : [];

  const run = async () => {
    setBusy(true); setError(null); setResult(null);
    try {
      const base = import.meta.env.VITE_REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const token = localStorage.getItem('fuelpro_jwt');
      if (!token) { setError('Sign in to your account first to use AI reconciliation.'); setBusy(false); return; }
      const r = await fetch(`${base}/api/ai/reconcile-mpesa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inflows: inflows.slice(0, 50), sales }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.detail || data.error || 'Reconciliation failed'); }
      else if (!data.ok) { setError(data.error || 'Reconciliation failed'); setResult(data); }
      else setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">AI M-PESA Reconciliation</h4>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
              Auto-match {inflows.length} inflow{inflows.length !== 1 ? 's' : ''} against your {sales.length} most recent sale{sales.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={busy || inflows.length === 0 || sales.length === 0}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0"
          data-testid="mpesa-ai-reconcile-btn"
        >
          {busy ? <><Loader2 size={14} className="animate-spin" /> Reconciling…</> : <><Sparkles size={14} /> Reconcile with AI</>}
        </button>
      </div>

      {sales.length === 0 && !busy && (
        <p className="mt-3 text-[11px] text-amber-700/70 dark:text-amber-300/70">
          ℹ️ Record some sales in <strong>Sales Tracking</strong> first — the AI needs both inflows AND sales to match.
        </p>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {result && result.ok && (
        <div className="mt-4 space-y-3" data-testid="mpesa-ai-reconcile-result">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{result.matches?.length || 0}</p>
              <p className="text-[10px] text-green-600/80 dark:text-green-400/80 uppercase tracking-wide">Matched</p>
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{result.unmatched_inflows?.length || 0}</p>
              <p className="text-[10px] text-orange-600/80 dark:text-orange-400/80 uppercase tracking-wide">Inflows w/o sale</p>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{result.unmatched_sales?.length || 0}</p>
              <p className="text-[10px] text-red-600/80 dark:text-red-400/80 uppercase tracking-wide">Sales w/o inflow</p>
            </div>
          </div>

          {result.note && (
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80">{result.note}</p>
          )}

          {result.matches && result.matches.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900">
              <table className="w-full text-xs">
                <thead className="bg-amber-100 dark:bg-amber-900/40 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-amber-800 dark:text-amber-200">Receipt</th>
                    <th className="px-3 py-2 text-left font-semibold text-amber-800 dark:text-amber-200">Sale</th>
                    <th className="px-3 py-2 text-left font-semibold text-amber-800 dark:text-amber-200">Confidence</th>
                    <th className="px-3 py-2 text-left font-semibold text-amber-800 dark:text-amber-200">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((m, i) => (
                    <tr key={i} className="border-t border-amber-100 dark:border-amber-900/40">
                      <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">{m.inflow_receipt}</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">{m.sale_id}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.confidence >= 0.9 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                          m.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                          {Math.round(m.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                          <span>{m.reason}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
