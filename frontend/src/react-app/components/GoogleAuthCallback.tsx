/**
 * GoogleAuthCallback
 *
 * Handles the OAuth callback after Google redirects back to /auth/callback?code=...
 * This component:
 *   1. Extracts the authorization code from URL
 *   2. Exchanges it with the backend for a FuelPro JWT
 *   3. Stores the token and syncs AuthContext
 *   4. Redirects to the main app
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { setToken } from '@/react-app/lib/backendApi';
import { exchangeGoogleCode } from '@/react-app/lib/googleAuthConfig';

type Phase = 'idle' | 'exchanging' | 'success' | 'failed';

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string>('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      ran.current = true;
      setPhase('failed');
      setMessage(errorDescription || error || 'Google sign-in was cancelled');
      setTimeout(() => navigate('/'), 4000);
      return;
    }

    if (!code) return;
    ran.current = true;

    (async () => {
      setPhase('exchanging');
      try {
        const data = await exchangeGoogleCode(code);
        
        // Store JWT token
        setToken(data.token);

        // Mirror into the existing local AuthContext shape
        const localUser = {
          id: `google_${data.user.id}`,
          authId: `google_${data.user.id}`,
          authMethod: 'google',
          email: data.user.email,
          name: data.user.name,
        };
        localStorage.setItem('fuelpro_user_v3', JSON.stringify(localUser));
        localStorage.setItem('fuelpro_auth_identity', JSON.stringify(localUser));

        // Store in email users cache for offline support
        try {
          const users = JSON.parse(localStorage.getItem('fuelpro_email_users') || '{}');
          const uid = `user_${Date.now()}`;
          if (!Object.values(users).find((u: any) => u.email === data.user.email)) {
            users[uid] = {
              id: uid,
              email: data.user.email,
              password: '',
              name: data.user.name,
              createdAt: new Date().toISOString(),
              authMethod: 'google',
            };
            localStorage.setItem('fuelpro_email_users', JSON.stringify(users));
          }
        } catch { /* non-fatal */ }

        setPhase('success');
        setMessage(`Welcome ${data.user.name || data.user.email}`);
        
        // Stitch anonymous activity into the authenticated profile
        try {
          const { linkAnonymousToUser } = await import('@/react-app/lib/identity');
          await linkAnonymousToUser(data.token);
        } catch { /* non-fatal */ }

        setTimeout(() => {
          navigate('/');
          window.location.reload();
        }, 800);
      } catch (e: unknown) {
        setPhase('failed');
        setMessage(e instanceof Error ? e.message : 'Sign-in failed');
        setTimeout(() => navigate('/'), 4000);
      }
    })();
  }, [searchParams, navigate]);

  if (phase === 'idle') return null;

  const colors: Record<Phase, { bg: string; border: string; text: string; Icon: typeof Loader2 }> = {
    idle:       { bg: '',                          border: '',          text: '',            Icon: Loader2 },
    exchanging: { bg: 'rgba(99,91,255,.15)',       border: '#635bff',   text: '#a5a3ff',     Icon: Loader2 },
    success:    { bg: 'rgba(16,185,129,.18)',      border: '#10b981',   text: '#6ee7b7',     Icon: CheckCircle2 },
    failed:     { bg: 'rgba(239,68,68,.18)',       border: '#ef4444',   text: '#fca5a5',     Icon: XCircle },
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
