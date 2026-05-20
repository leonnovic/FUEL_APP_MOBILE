/**
 * Customer Loyalty page — punch-card style program.
 * Owners configure: stamps required, minimum purchase, reward.
 * Day-to-day: scan a customer phone → add stamp / redeem reward.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Award, Phone, Plus, Loader2, ArrowLeft, Save, CheckCircle2,
  Gift, AlertCircle, Smartphone, Settings as Cog,
} from 'lucide-react';

const API_BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL || '';

interface Config {
  stamps_required: number;
  min_purchase_amount: number;
  reward_description: string;
  currency: string;
  enabled: boolean;
}

interface Customer {
  found: boolean;
  customer?: {
    phone: string;
    stamps: { id: string; at: string; amount: number }[];
    redemptions: { id: string; at: string; reward: string }[];
    lifetime_amount: number;
    lifetime_redemptions: number;
  };
  stamps_available: number;
  stamps_required: number;
  redeemable: boolean;
  reward_description: string;
}

export default function LoyaltyPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config>({
    stamps_required: 10, min_purchase_amount: 500, reward_description: '1 free fuel-up',
    currency: 'KES', enabled: true,
  });
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err', text: string } | null>(null);

  const token = () => localStorage.getItem('fuelpro_jwt');

  useEffect(() => {
    const t = token(); if (!t) return;
    fetch(`${API_BASE}/api/loyalty/config`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => d.config && setConfig(d.config))
      .catch(() => { /* keep defaults */ });
  }, []);

  const saveConfig = async () => {
    setMsg(null);
    const t = token(); if (!t) return;
    const r = await fetch(`${API_BASE}/api/loyalty/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(config),
    });
    if (r.ok) setMsg({ kind: 'ok', text: 'Loyalty settings saved' });
    else setMsg({ kind: 'err', text: 'Failed to save' });
    setTimeout(() => setMsg(null), 2500);
  };

  const lookupCustomer = async (rawPhone: string) => {
    const t = token(); if (!t) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/loyalty/customer/${encodeURIComponent(rawPhone)}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await r.json();
      setCustomer(data);
    } finally { setLoading(false); }
  };

  const addStamp = async () => {
    setMsg(null);
    const t = token(); if (!t) return;
    if (!phone.trim() || !amount) { setMsg({ kind: 'err', text: 'Phone and amount required' }); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/loyalty/stamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ phone, amount: parseFloat(amount) }),
      });
      const data = await r.json();
      if (!r.ok) { setMsg({ kind: 'err', text: data.detail || 'Stamp failed' }); return; }
      setMsg({ kind: 'ok', text: `Stamp added — ${data.stamps_available}/${data.stamps_required}${data.redeemable ? ' · REDEEM AVAILABLE!' : ''}` });
      setAmount('');
      await lookupCustomer(phone);
    } finally { setLoading(false); }
  };

  const redeem = async () => {
    setMsg(null);
    const t = token(); if (!t) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ phone, amount: 0 }),
      });
      const data = await r.json();
      if (!r.ok) { setMsg({ kind: 'err', text: data.detail || 'Redeem failed' }); return; }
      setMsg({ kind: 'ok', text: `🎉 Redeemed: ${data.redemption.reward}` });
      await lookupCustomer(phone);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 pt-12">
        <button onClick={() => navigate(-1)} className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2" data-testid="loyalty-back-btn">
          <ArrowLeft size={16} /> Back
        </button>

        <header className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Award size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif">Customer Loyalty</h1>
              <p className="text-sm text-gray-400">Punch-card rewards — keep customers coming back.</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfig(v => !v)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs flex items-center gap-1.5"
            data-testid="loyalty-config-toggle"
          >
            <Cog size={13} /> {showConfig ? 'Hide settings' : 'Settings'}
          </button>
        </header>

        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.kind === 'ok' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`} data-testid="loyalty-msg">
            {msg.kind === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </div>
        )}

        {showConfig && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 mb-6" data-testid="loyalty-config-panel">
            <h2 className="text-sm font-bold text-purple-400 mb-4">Program Settings</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Stamps required</label>
                <input type="number" min={2} max={50} value={config.stamps_required}
                       onChange={e => setConfig(c => ({ ...c, stamps_required: parseInt(e.target.value || '10') }))}
                       className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Min purchase</label>
                <input type="number" min={0} value={config.min_purchase_amount}
                       onChange={e => setConfig(c => ({ ...c, min_purchase_amount: parseFloat(e.target.value || '0') }))}
                       className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Currency</label>
                <input value={config.currency}
                       onChange={e => setConfig(c => ({ ...c, currency: e.target.value }))}
                       className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Enabled</label>
                <select value={config.enabled ? '1' : '0'}
                        onChange={e => setConfig(c => ({ ...c, enabled: e.target.value === '1' }))}
                        className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-sm">
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Reward</label>
                <input value={config.reward_description}
                       onChange={e => setConfig(c => ({ ...c, reward_description: e.target.value }))}
                       className="w-full px-2.5 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-sm" />
              </div>
            </div>
            <button onClick={saveConfig} className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-bold flex items-center gap-2" data-testid="loyalty-save-config">
              <Save size={14} /> Save settings
            </button>
          </div>
        )}

        {/* Stamp form */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">
            <Smartphone size={14} /> Customer phone
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={phone} onChange={e => setPhone(e.target.value)}
                       onBlur={() => phone && lookupCustomer(phone)}
                       placeholder="0712 345 678 or 254712345678"
                       className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-purple-500"
                       data-testid="loyalty-phone-input" />
              </div>
            </div>
            <div className="sm:col-span-3">
              <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)}
                     placeholder={`Amount (${config.currency})`}
                     className="w-full px-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-purple-500"
                     data-testid="loyalty-amount-input" />
            </div>
            <div className="sm:col-span-3">
              <button onClick={addStamp} disabled={loading || !phone || !amount}
                      className="w-full px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
                      data-testid="loyalty-stamp-btn">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add stamp
              </button>
            </div>
          </div>
        </div>

        {customer && (
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 rounded-2xl p-6" data-testid="loyalty-customer-card">
            {customer.found && customer.customer ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Customer</p>
                    <p className="text-lg font-mono font-bold">{customer.customer.phone}</p>
                    <p className="text-[10px] text-gray-500">Lifetime: {config.currency} {customer.customer.lifetime_amount.toLocaleString()} · {customer.customer.lifetime_redemptions} reward{customer.customer.lifetime_redemptions === 1 ? '' : 's'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold font-mono text-purple-300">{customer.stamps_available}<span className="text-base text-gray-500">/{customer.stamps_required}</span></p>
                    <p className="text-[10px] text-gray-400">stamps</p>
                  </div>
                </div>

                {/* Punch-card grid */}
                <div className="grid gap-1.5 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(customer.stamps_required, 10)}, minmax(0, 1fr))` }}>
                  {Array.from({ length: customer.stamps_required }).map((_, i) => {
                    const filled = i < customer.stamps_available;
                    return (
                      <div key={i} className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${filled ? 'bg-purple-500/30 border-purple-400 shadow-md shadow-purple-500/30' : 'border-white/[0.08] bg-black/20'}`}>
                        {filled && <Award size={14} className="text-purple-300" />}
                      </div>
                    );
                  })}
                </div>

                {customer.redeemable && (
                  <button onClick={redeem} disabled={loading}
                          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
                          data-testid="loyalty-redeem-btn">
                    <Gift size={16} /> Redeem reward: {customer.reward_description}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center" data-testid="loyalty-new-customer">
                No record found for <span className="font-mono">{phone}</span>. The next stamp will create their card automatically.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
