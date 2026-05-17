/**
 * StripeReturnHandler — silently checks for `?session_id=…` on the URL after a
 * Stripe Checkout redirect, polls the backend until the payment is confirmed,
 * and activates the matching subscription tier locally.
 *
 * Runs at the top of the app so it works regardless of which route loaded.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { pollStripeStatus } from '@/react-app/lib/backendApi';
import { activateTier, logSubscriptionAction } from '@/react-app/lib/subscriptionStore';

type Phase = 'idle' | 'polling' | 'success' | 'failed' | 'cancelled';

export default function StripeReturnHandler() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [plan, setPlan] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const cancelled = params.get('payment') === 'cancelled';

    if (cancelled) {
      setPhase('cancelled');
      // Clean URL so a refresh doesn't loop
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
      setTimeout(() => setPhase('idle'), 3500);
      return;
    }
    if (!sessionId) return;

    setPhase('polling');
    setPlan(params.get('plan') || '');

    let cancelledFlag = false;
    const startedAt = Date.now();
    const POLL = 2000;
    const TIMEOUT_MS = 60000;

    const tick = async () => {
      if (cancelledFlag) return;
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setPhase('failed');
        setReason('Timed out checking payment status. If you completed checkout, refresh in a minute.');
        return;
      }
      try {
        const s = await pollStripeStatus(sessionId);
        if (s.payment_status === 'paid') {
          const tier = s.plan || params.get('plan') || 'starter';
          activateTier(tier, { stripeSessionId: sessionId } as Record<string, unknown>);
          logSubscriptionAction('activated', tier, `Stripe session ${sessionId}`);
          setPhase('success');
          // Strip session_id from the URL so the banner doesn't replay on refresh
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          url.searchParams.delete('plan');
          window.history.replaceState({}, '', url.toString());
          setTimeout(() => setPhase('idle'), 5000);
          return;
        }
        if (s.status === 'expired' || s.payment_status === 'unpaid') {
          setPhase('failed');
          setReason(`Payment ${s.payment_status || s.status}.`);
          return;
        }
        setTimeout(tick, POLL);
      } catch (e: unknown) {
        // Retry on transient errors
        setTimeout(tick, POLL);
      }
    };
    tick();
    return () => { cancelledFlag = true; };
  }, []);

  if (phase === 'idle') return null;

  const styles: Record<Phase, { bg: string; border: string; color: string }> = {
    idle:      { bg: '',                 border: '',                 color: '' },
    polling:   { bg: 'rgba(99,91,255,0.12)',  border: '#635bff',  color: '#a5a3ff' },
    success:   { bg: 'rgba(16,185,129,0.15)', border: '#10b981',  color: '#6ee7b7' },
    failed:    { bg: 'rgba(239,68,68,0.15)',  border: '#ef4444',  color: '#fca5a5' },
    cancelled: { bg: 'rgba(251,146,60,0.15)', border: '#fb923c',  color: '#fdba74' },
  };
  const s = styles[phase];

  return (
    <div
      data-testid="stripe-return-banner"
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 10001,
        padding: '12px 18px', borderRadius: 12,
        background: s.bg, border: `1px solid ${s.border}`,
        color: s.color, fontSize: 13, fontWeight: 600, fontFamily: 'system-ui, sans-serif',
        display: 'flex', alignItems: 'center', gap: 10, maxWidth: 380,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
      }}
    >
      {phase === 'polling' && <><Loader2 size={18} className="animate-spin" /> Confirming your {plan ? `${plan} ` : ''}subscription…</>}
      {phase === 'success' && <><CheckCircle2 size={18} /> Subscription activated 🎉 Welcome aboard!</>}
      {phase === 'failed'  && <><XCircle size={18} /> {reason || 'Payment could not be confirmed.'}</>}
      {phase === 'cancelled' && <><XCircle size={18} /> Payment cancelled. No charge was made.</>}
    </div>
  );
}
