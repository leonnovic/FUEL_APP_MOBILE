/**
 * GoogleAuthCallback
 *
 * After the Emergent Google OAuth flow completes, the user lands back on this
 * origin with a URL like  `https://app/#/...#session_id=<id>`. Because we use
 * HashRouter, the session_id ends up in the secondary `#` segment. This
 * component:
 *   1. Detects `session_id=` anywhere in `window.location.hash`
 *   2. Forwards it to `POST /api/auth/google`
 *   3. Stores the returned FuelPro JWT, syncs AuthContext, and routes to /
 *
 * Mounted near the top of App so it runs once per OAuth round-trip and is
 * idempotent thanks to a useRef latch (StrictMode-safe).
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { setToken } from '@/react-app/lib/backendApi';

const API_BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

type Phase = 'idle' | 'exchanging' | 'success' | 'failed';

function extractSessionId(): string | null {
  const h = window.location.hash || '';
  const idx = h.indexOf('session_id=');
  if (idx < 0) return null;
  const raw = h.substring(idx + 'session_id='.length);
  return raw.split('&')[0] || null;
}

function cleanUrl() {
  const url = new URL(window.location.href);
  // Strip the entire hash to avoid replaying — App will repaint the right route.
  url.hash = '';
  window.history.replaceState({}, '', url.toString() + '#/');
}

export default function GoogleAuthCallback() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string>('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    const sessionId = extractSessionId();
    if (!sessionId) return;
    ran.current = true;

    (async () => {
      setPhase('exchanging');
      try {
        const r = await fetch(`${API_BASE}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || 'Google sign-in failed');

        setToken(data.token);

        // Mirror into the existing local AuthContext shape so the rest of the
        // app treats Google users identically to email users.
        const localUser = {
          id: `email_${data.user.email}`,
          authId: `email_${data.user.email}`,
          authMethod: 'email',
          email: data.user.email,
          name: data.user.name,
        };
        localStorage.setItem('fuelpro_user_v3', JSON.stringify(localUser));

        // Ensure a local-mirror user record exists so offline login keeps working.
        const users = JSON.parse(localStorage.getItem('fuelpro_email_users') || '{}');
        if (!Object.values(users).find((u: { email?: string }) => u.email === data.user.email)) {
          const uid = `user_${Date.now()}`;
          users[uid] = {
            id: uid, email: data.user.email, password: '',
            name: data.user.name, createdAt: new Date().toISOString(),
            authMethod: 'google',
          };
          localStorage.setItem('fuelpro_email_users', JSON.stringify(users));
        }

        setPhase('success');
        setMessage(`Welcome ${data.user.name || data.user.email}`);
        cleanUrl();
        setTimeout(() => { window.location.reload(); }, 800);
      } catch (e: unknown) {
        setPhase('failed');
        setMessage(e instanceof Error ? e.message : 'Sign-in failed');
        setTimeout(cleanUrl, 4000);
      }
    })();
  }, []);

  if (phase === 'idle') return null;

  const colors: Record<Phase, { bg: string; border: string; text: string; Icon: typeof Loader2 }> = {
    idle:       { bg: '',                  border: '',                 text: '',          Icon: Loader2 },
    exchanging: { bg: 'rgba(99,91,255,.15)',  border: '#635bff', text: '#a5a3ff', Icon: Loader2 },
    success:    { bg: 'rgba(16,185,129,.18)', border: '#10b981', text: '#6ee7b7', Icon: CheckCircle2 },
    failed:     { bg: 'rgba(239,68,68,.18)',  border: '#ef4444', text: '#fca5a5', Icon: XCircle },
  };
  const c = colors[phase];
  const Icon = c.Icon;

  return (
    <div
      data-testid="google-auth-callback"
      style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        display: 'grid', placeItems: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{
        padding: '20px 28px', borderRadius: 16,
        background: c.bg, border: `1px solid ${c.border}`,
        color: c.text, fontSize: 14, fontWeight: 600,
        fontFamily: 'system-ui, sans-serif',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
      }}>
        <Icon size={22} className={phase === 'exchanging' ? 'animate-spin' : ''} />
        <span>
          {phase === 'exchanging' && 'Signing you in with Google…'}
          {phase === 'success' && (message || 'Signed in!')}
          {phase === 'failed'  && (message || 'Sign-in failed')}
        </span>
      </div>
    </div>
  );
}
