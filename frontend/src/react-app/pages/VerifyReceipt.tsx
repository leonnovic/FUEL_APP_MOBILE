/**
 * Public Receipt Verification page — sharable URL `/#/verify?r=RECEIPT123`.
 * Customers paste their M-PESA receipt and instantly see whether the
 * payment landed in FuelPro. Builds trust without requiring an account.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { ShieldCheck, AlertTriangle, Loader2, Receipt, ArrowRight, Copy, CheckCircle2 } from 'lucide-react';

const API_BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

interface VerifyResult {
  verified: boolean;
  receipt: string;
  amount?: number;
  currency?: string;
  plan?: string;
  date?: string;
  provider?: string;
}

export default function VerifyReceipt() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initial = params.get('r') || '';
  const [code, setCode] = useState(initial);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const verify = async (rcpt: string) => {
    if (!rcpt.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API_BASE}/api/verify/receipt/${encodeURIComponent(rcpt.trim().toUpperCase())}`);
      const data = await r.json();
      setResult(data);
    } catch {
      setResult({ verified: false, receipt: rcpt });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (initial) verify(initial); /* eslint-disable-next-line */ }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ r: code.trim().toUpperCase() });
    verify(code);
  };

  const shareUrl = result ? `${window.location.origin}/#/verify?r=${result.receipt}` : '';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { window.prompt('Copy this verification link:', shareUrl); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <button onClick={() => navigate('/')} className="text-xs text-gray-400 hover:text-white mb-8" data-testid="verify-back-btn">
          ← Back to FuelPro
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">Verify Receipt</h1>
            <p className="text-sm text-gray-400">Confirm any FuelPro M-PESA payment in 2 clicks.</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 mb-6"
        >
          <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-2">M-PESA Receipt Number</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Receipt size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SLP2KX9PQ4"
                className="w-full pl-9 pr-3 py-3 bg-black/40 border border-white/[0.1] rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-emerald-500"
                data-testid="verify-input"
                autoFocus={!initial}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 text-black rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
              data-testid="verify-submit"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Verify
            </button>
          </div>
        </form>

        {result && (
          <div
            className={`p-6 rounded-2xl border backdrop-blur-xl ${
              result.verified
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
            data-testid={result.verified ? 'verify-success' : 'verify-failure'}
          >
            <div className="flex items-start gap-3">
              {result.verified ? (
                <ShieldCheck size={24} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={24} className="text-red-400 shrink-0" />
              )}
              <div className="flex-1">
                <h2 className="text-lg font-bold">
                  {result.verified ? 'Receipt Verified' : 'Receipt Not Found'}
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  {result.verified
                    ? 'This payment was successfully recorded in FuelPro.'
                    : `No FuelPro payment matches ${result.receipt}. Double-check the receipt number.`}
                </p>
                {result.verified && (
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div><dt className="text-gray-500">Receipt</dt><dd className="font-mono font-semibold">{result.receipt}</dd></div>
                    <div><dt className="text-gray-500">Amount</dt><dd className="font-semibold">{result.currency?.toUpperCase()} {result.amount?.toLocaleString()}</dd></div>
                    <div><dt className="text-gray-500">Provider</dt><dd className="font-semibold capitalize">{result.provider || 'M-PESA'}</dd></div>
                    {result.plan && <div><dt className="text-gray-500">Plan</dt><dd className="font-semibold capitalize">{result.plan}</dd></div>}
                    {result.date && <div className="col-span-2"><dt className="text-gray-500">Date</dt><dd className="font-mono text-[11px]">{result.date}</dd></div>}
                  </dl>
                )}
                {result.verified && (
                  <button
                    onClick={copyLink}
                    className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-[11px] font-semibold"
                    data-testid="verify-copy-link"
                  >
                    {copied ? <><CheckCircle2 size={11} /> Copied</> : <><Copy size={11} /> Copy verification link</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-center text-gray-500">
          Receipt verification is public — anyone with a receipt number can confirm authenticity. We never reveal customer info.
        </p>
      </div>
    </div>
  );
}
