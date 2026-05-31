import { useEffect, useState, useCallback } from 'react';
import { Apple } from 'lucide-react';

/**
 * Apple Sign-In + Microsoft Sign-In buttons.
 *
 * Both buttons are conditional — only rendered when the backend reports the
 * provider is configured (set via Founder → Integration Keys → APPLE_CLIENT_ID
 * / MICROSOFT_CLIENT_ID). This way the login page stays clean for users who
 * haven't paid for those providers yet, and lights up automatically the
 * moment a client_id is pasted into the Founder panel.
 *
 * Provider SDKs are loaded on-demand from official CDNs to keep the main
 * bundle slim. Tokens are verified on the server (`/api/auth/apple` and
 * `/api/auth/microsoft`).
 */

const API_BASE = (
  import.meta.env.VITE_REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

type Providers = {
  apple: boolean;
  microsoft: boolean;
  apple_client_id: string | null;
  microsoft_client_id: string | null;
  microsoft_tenant: string;
};

declare global {
  interface Window {
    AppleID?: any;
    msal?: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function ExtraOAuthButtons() {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [busy, setBusy] = useState<'apple' | 'microsoft' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/oauth-providers`)
      .then(r => r.json())
      .then(d => setProviders(d as Providers))
      .catch(() => setProviders(null));
  }, []);

  const finishOAuth = useCallback(async (provider: 'apple' | 'microsoft', body: Record<string, unknown>) => {
    const { fetchJson } = await import('@/react-app/lib/fetchJson');
    const data = await fetchJson<{ token: string; user?: Record<string, unknown> }>(`${API_BASE}/api/auth/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!data.token) throw new Error(`${provider} sign-in failed`);
    // Mirror the existing Google flow: stash the JWT + user, then reload.
    localStorage.setItem('fuelpro_jwt', data.token);
    if (data.user) localStorage.setItem('fuelpro_user', JSON.stringify(data.user));
    // Stitch any anonymous device activity into the new account
    try {
      const { linkAnonymousToUser } = await import('@/react-app/lib/identity');
      await linkAnonymousToUser(data.token);
    } catch { /* non-fatal */ }
    window.location.href = '/';
  }, []);

  const handleApple = async () => {
    if (!providers?.apple || !providers.apple_client_id) return;
    setBusy('apple'); setError('');
    try {
      await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js');
      if (!window.AppleID) throw new Error('Apple SDK failed to initialise');
      window.AppleID.auth.init({
        clientId: providers.apple_client_id,
        scope: 'name email',
        redirectURI: window.location.origin + '/',
        usePopup: true,
      });
      const resp = await window.AppleID.auth.signIn();
      const id_token: string | undefined = resp?.authorization?.id_token;
      if (!id_token) throw new Error('Apple did not return an id_token');
      const fullName = resp?.user?.name
        ? `${resp.user.name.firstName || ''} ${resp.user.name.lastName || ''}`.trim()
        : '';
      await finishOAuth('apple', { id_token, name: fullName || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apple sign-in failed');
    } finally {
      setBusy(null);
    }
  };

  const handleMicrosoft = async () => {
    if (!providers?.microsoft || !providers.microsoft_client_id) return;
    setBusy('microsoft'); setError('');
    try {
      await loadScript('https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js');
      if (!window.msal) throw new Error('Microsoft SDK failed to initialise');
      const msalInstance = new window.msal.PublicClientApplication({
        auth: {
          clientId: providers.microsoft_client_id,
          authority: `https://login.microsoftonline.com/${providers.microsoft_tenant || 'common'}`,
          redirectUri: window.location.origin + '/',
        },
        cache: { cacheLocation: 'sessionStorage' },
      });
      await msalInstance.initialize?.();
      const result = await msalInstance.loginPopup({
        scopes: ['openid', 'profile', 'email'],
      });
      const id_token: string | undefined = result?.idToken;
      if (!id_token) throw new Error('Microsoft did not return an id_token');
      await finishOAuth('microsoft', { id_token });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microsoft sign-in failed');
    } finally {
      setBusy(null);
    }
  };

  if (!providers) return null;
  if (!providers.apple && !providers.microsoft) return null;

  return (
    <div className="space-y-2 mb-3" data-testid="extra-oauth-buttons">
      {providers.apple && (
        <button
          type="button"
          onClick={handleApple}
          disabled={!!busy}
          className="w-full flex items-center justify-center gap-3 py-3 bg-black hover:bg-gray-900 text-white rounded-xl font-semibold text-sm transition-colors shadow-md border border-white/10 disabled:opacity-50"
          data-testid="auth-apple-btn"
        >
          <Apple size={18} />
          {busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}
        </button>
      )}
      {providers.microsoft && (
        <button
          type="button"
          onClick={handleMicrosoft}
          disabled={!!busy}
          className="w-full flex items-center justify-center gap-3 py-3 bg-[#2F2F2F] hover:bg-[#3a3a3a] text-white rounded-xl font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
          data-testid="auth-microsoft-btn"
        >
          <svg width="18" height="18" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
            <path fill="#f25022" d="M1 1h10v10H1z" />
            <path fill="#7fba00" d="M12 1h10v10H12z" />
            <path fill="#00a4ef" d="M1 12h10v10H1z" />
            <path fill="#ffb900" d="M12 12h10v10H12z" />
          </svg>
          {busy === 'microsoft' ? 'Signing in…' : 'Continue with Microsoft'}
        </button>
      )}
      {error && (
        <p className="text-[11px] text-red-300 px-1" data-testid="extra-oauth-error">
          {error}
        </p>
      )}
    </div>
  );
}
