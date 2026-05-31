/**
 * MockedVsLiveBanner — at-a-glance summary of which integrations are still
 * mocked (waiting for a real API key) vs already live. Renders inside the
 * Founder dashboard.
 *
 * Polls /api/founder/integrations every 60s.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

const API_BASE = (
  import.meta.env.VITE_REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

interface IntegrationFlags {
  stripe_api_key?: string | boolean;
  resend_api_key?: string | boolean;
  twilio_account_sid?: string | boolean;
  twilio_auth_token?: string | boolean;
  mpesa_consumer_key?: string | boolean;
  mpesa_consumer_secret?: string | boolean;
  aws_access_key_id?: string | boolean;
  aws_secret_access_key?: string | boolean;
  s3_bucket?: string | boolean;
  apple_team_id?: string | boolean;
  apple_key_id?: string | boolean;
  microsoft_client_id?: string | boolean;
  microsoft_client_secret?: string | boolean;
}

interface Item {
  key: string;
  label: string;
  fields: (keyof IntegrationFlags)[];
  paywalled?: boolean;
}

const ITEMS: Item[] = [
  { key: 'stripe',    label: 'Stripe (Payments)',         fields: ['stripe_api_key'] },
  { key: 'mpesa',     label: 'M-PESA (Daraja)',           fields: ['mpesa_consumer_key', 'mpesa_consumer_secret'] },
  { key: 'resend',    label: 'Resend (Email)',            fields: ['resend_api_key'] },
  { key: 'twilio',    label: 'Twilio (SMS)',              fields: ['twilio_account_sid', 'twilio_auth_token'] },
  { key: 's3',        label: 'AWS S3 (Cloud Storage)',    fields: ['aws_access_key_id', 'aws_secret_access_key', 's3_bucket'] },
  { key: 'apple',     label: 'Apple Sign-In',             fields: ['apple_team_id', 'apple_key_id'] },
  { key: 'microsoft', label: 'Microsoft Sign-In',         fields: ['microsoft_client_id', 'microsoft_client_secret'] },
];

function isLive(flags: IntegrationFlags, item: Item): boolean {
  return item.fields.every((f) => {
    const v = flags[f];
    if (typeof v === 'boolean') return v === true;
    if (typeof v === 'string') return v.length > 0;
    return false;
  });
}

export default function MockedVsLiveBanner() {
  const [flags, setFlags] = useState<IntegrationFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchFlags = async () => {
    try {
      const token = localStorage.getItem('fuelpro_founder_jwt') || localStorage.getItem('fuelpro_jwt') || '';
      const r = await fetch(`${API_BASE}/api/founder/integrations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) { setLoading(false); return; }
      const data = await r.json();
      setFlags(data.integrations || data || {});
    } catch { /* keep previous */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchFlags();
    const id = setInterval(fetchFlags, 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading || !flags) return null;

  const live = ITEMS.filter((it) => isLive(flags, it));
  const mocked = ITEMS.filter((it) => !isLive(flags, it));
  const liveCount = live.length;
  const total = ITEMS.length;

  return (
    <div
      className="bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-amber-950/20 border border-amber-500/20 rounded-xl p-4 mb-6"
      data-testid="founder-mocked-vs-live"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-white">Integration Status</h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                liveCount === total ? 'bg-emerald-500/20 text-emerald-300' :
                liveCount === 0 ? 'bg-amber-500/20 text-amber-300' :
                'bg-blue-500/20 text-blue-300'
              }`}
            >
              {liveCount}/{total} live
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            {liveCount === total ? 'All integrations are live with real API keys. 🎉' :
             liveCount === 0 ? 'All integrations are mocked. Paste real keys below to go live.' :
             `${mocked.length} integration${mocked.length === 1 ? '' : 's'} still mocked — paste API keys below.`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchFlags}
            className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
            title="Refresh"
            data-testid="founder-mocked-vs-live-refresh"
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[10px] px-2 py-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
            data-testid="founder-mocked-vs-live-toggle"
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" data-testid="founder-mocked-vs-live-grid">
          {ITEMS.map((it) => {
            const ok = isLive(flags, it);
            return (
              <div
                key={it.key}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${
                  ok
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                }`}
                data-testid={`founder-int-status-${it.key}`}
              >
                {ok
                  ? <CheckCircle2 size={12} className="flex-shrink-0 text-emerald-400" />
                  : <AlertCircle size={12} className="flex-shrink-0 text-amber-400" />}
                <span className="flex-1 truncate font-medium">{it.label}</span>
                <span className={`text-[9px] font-bold uppercase ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {ok ? 'Live' : 'Mocked'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-gray-500">
        <ExternalLink size={10} />
        <span>Paste keys in the <strong className="text-gray-300">Integrations</strong> tab below. Changes take effect immediately.</span>
      </div>
    </div>
  );
}
