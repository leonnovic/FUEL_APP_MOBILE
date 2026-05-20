import { useState, useEffect } from 'react';
import { Sparkles, X, Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * "Claim your account" banner — shown to users on a guest (Quick-Start)
 * account. Lets them upgrade to a permanent email/password account in one
 * step without losing any stations / sales / sync data (same `user_id`).
 *
 * Renders nothing unless the current FuelPro user has `is_guest: true`.
 * Dismissable per-session, re-appears next launch until claimed.
 */

const API_BASE = (
  (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

const DISMISS_KEY = 'fuelpro_claim_banner_dismissed';

function authHeader(): Record<string, string> {
  const t = localStorage.getItem('fuelpro_jwt') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function ClaimAccountBanner() {
  const [isGuest, setIsGuest] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState<boolean>(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    const token = localStorage.getItem('fuelpro_jwt') || '';
    if (!token) { setIsGuest(false); return; }
    fetch(`${API_BASE}/api/auth/me`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setIsGuest(!!d?.user?.is_guest))
      .catch(() => setIsGuest(false));
  }, []);

  if (!isGuest || dismissed) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const { fetchJson } = await import('@/react-app/lib/fetchJson');
      const data = await fetchJson<{ token: string; user: { email: string; name: string } }>(
        `${API_BASE}/api/auth/claim-guest`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim(), password }),
        },
      );
      // Update local credentials — same user_id, but now password-auth-able
      localStorage.setItem('fuelpro_jwt', data.token);
      localStorage.setItem('fuelpro_user', JSON.stringify(data.user));
      // Smooth UX: full reload to repopulate everywhere
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed');
      setSubmitting(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  if (!showForm) {
    return (
      <div
        role="banner"
        data-testid="claim-banner-collapsed"
        className="mx-3 mt-3 mb-1 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-500/30"
      >
        <Sparkles size={16} className="text-amber-400 flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-100">
            You're using a guest account
          </p>
          <p className="text-[11px] text-amber-200/70 mt-0.5">
            Claim it with your email + password — keep all your stations, sales, and history forever.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          data-testid="claim-banner-cta"
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold transition-colors flex-shrink-0"
        >
          Claim now
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          data-testid="claim-banner-dismiss"
          className="text-amber-200/50 hover:text-amber-100 transition-colors p-1 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      role="banner"
      data-testid="claim-banner-expanded"
      className="mx-3 mt-3 mb-1 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/40 shadow-lg"
    >
      <div className="flex items-start gap-3 mb-3">
        <Sparkles size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Claim your account in 30 seconds</p>
          <p className="text-[11px] text-gray-300 mt-0.5">
            Same data, same trial — just adds email + password so you can sign in from any device.
          </p>
        </div>
        <button
          onClick={() => setShowForm(false)}
          aria-label="Collapse"
          className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
          data-testid="claim-banner-collapse"
        >
          <X size={16} />
        </button>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          type="text"
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          data-testid="claim-name-input"
          className="px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
        />
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          data-testid="claim-email-input"
          className="px-3 py-2 text-sm bg-black/30 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
        />
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            placeholder="Password (6+ chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            data-testid="claim-password-input"
            className="w-full px-3 py-2 pr-9 text-sm bg-black/30 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button
          type="submit"
          disabled={submitting}
          data-testid="claim-submit-btn"
          className="md:col-span-3 mt-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-black rounded-lg text-sm font-bold transition-colors inline-flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {submitting ? 'Claiming…' : 'Claim my account'}
        </button>
        {error && (
          <p className="md:col-span-3 text-xs text-red-300" data-testid="claim-error">{error}</p>
        )}
      </form>
    </div>
  );
}
