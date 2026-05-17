import { useState, useEffect, useCallback } from 'react';
import { Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import Paywall from './Paywall';
import { getSubscription } from '@/react-app/lib/subscriptionStore';

interface TrialGateProps {
  children: React.ReactNode;
}

/** Trial length — matches the backend's 14-day free trial */
const TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

function getTrialState(): { startedAt: number; isExpired: boolean; msLeft: number } {
  try {
    const raw = localStorage.getItem('fuelpro_trial');
    if (!raw) {
      const now = Date.now();
      localStorage.setItem('fuelpro_trial', JSON.stringify({ startedAt: now, status: 'active' }));
      return { startedAt: now, isExpired: false, msLeft: TRIAL_MS };
    }
    const data = JSON.parse(raw);
    let startedAt = data.startedAt || Date.now();
    if (data.status === 'paid') return { startedAt, isExpired: false, msLeft: Infinity };

    // ── Migration: an older build used a 1-hour trial. If we detect a trial that
    // started <14 days ago but already shows as expired under the new 14-day rule
    // because of the old 1h limit, accept the recorded `startedAt` as-is — the
    // 14-day window will simply still be active. Nothing to migrate.
    // ── BUT: if startedAt is in the future or NaN, reset to now (defensive).
    if (!Number.isFinite(startedAt) || startedAt > Date.now()) {
      startedAt = Date.now();
      localStorage.setItem('fuelpro_trial', JSON.stringify({ startedAt, status: 'active' }));
    }

    const msLeft = Math.max(0, TRIAL_MS - (Date.now() - startedAt));
    return { startedAt, isExpired: msLeft <= 0, msLeft };
  } catch {
    return { startedAt: Date.now(), isExpired: false, msLeft: TRIAL_MS };
  }
}

export function markTrialPaid() {
  try {
    const raw = localStorage.getItem('fuelpro_trial');
    const data = raw ? JSON.parse(raw) : {};
    data.status = 'paid';
    localStorage.setItem('fuelpro_trial', JSON.stringify(data));
  } catch { /* */ }
}

export function useTrial() {
  const [trialState, setTrialState] = useState(getTrialState);

  // Refresh once per minute — no need for per-second ticks on a 14-day trial
  useEffect(() => {
    const interval = setInterval(() => setTrialState(getTrialState()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const msLeft = trialState.msLeft;
  const isPaid = msLeft === Infinity;
  const isInTrial = !trialState.isExpired && !isPaid;
  const isExpired = trialState.isExpired && !isPaid;

  // Friendly display: "13d 4h", "7h 12m", "12m 34s"
  let timeDisplay: string;
  if (isPaid) {
    timeDisplay = '∞';
  } else {
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (days > 0) timeDisplay = `${days}d ${hours}h`;
    else if (hours > 0) timeDisplay = `${hours}h ${mins}m`;
    else timeDisplay = `${mins}m ${secs}s`;
  }

  return {
    ...trialState,
    isPaid,
    isInTrial,
    isExpired,
    timeDisplay,
    msLeft,
    totalSeconds: Math.max(0, Math.floor(msLeft / 1000)),
    progressPercent: isPaid ? 100 : Math.max(0, Math.min(100, (msLeft / TRIAL_MS) * 100)),
  };
}

export default function TrialGate({ children }: TrialGateProps) {
  const { isExpired, isPaid, isInTrial, totalSeconds, timeDisplay, progressPercent } = useTrial();
  const [showPaywall, setShowPaywall] = useState(false);
  const navigate = useNavigate();

  // Check subscription. If user has any active tier (free, starter, pro, enterprise)
  // OR they're explicitly on the local trial, we DO NOT force the paywall.
  useEffect(() => {
    const sub = getSubscription();
    if (sub.status === 'active') { setShowPaywall(false); return; }
    if (isExpired && sub.status !== 'trial') setShowPaywall(true);
  }, [isExpired]);

  // Active trial → show non-blocking banner
  if ((isInTrial || isPaid) && !showPaywall) {
    const isUrgent = !isPaid && totalSeconds < 24 * 3600; // last 24h
    return (
      <>
        <div
          className="fixed top-0 left-0 right-0 z-[998] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 flex items-center justify-between text-xs"
          data-testid="trial-banner"
        >
          <div className="flex items-center gap-2">
            <Clock size={13} className={isUrgent ? 'animate-pulse' : ''} />
            <span className={`font-semibold font-mono ${isUrgent ? 'text-red-100' : ''}`} data-testid="trial-banner-time-left">
              {isPaid ? 'Paid subscription · Full access' : `Trial: ${timeDisplay} left`}
            </span>
            {!isPaid && (
              <span className="hidden sm:inline opacity-80">
                | {totalSeconds < 3600 ? 'Expiring soon — upgrade now' : 'Full access'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block w-24 h-1.5 bg-white/20 rounded-full overflow-hidden" aria-hidden>
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            {!isPaid && (
              <button
                onClick={() => setShowPaywall(true)}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                data-testid="trial-banner-upgrade-btn"
              >
                <Zap size={10} /> Upgrade Now
              </button>
            )}
          </div>
        </div>
        <div className="pt-7">{children}</div>
        {showPaywall && (
          <Paywall onClose={() => setShowPaywall(false)} />
        )}
        {/* Silence the unused `navigate` for now — kept for future deep-link upgrades */}
        <span style={{ display: 'none' }}>{String(navigate ? '' : '')}</span>
      </>
    );
  }

  if (showPaywall || isExpired) {
    return <Paywall onClose={() => {
      const sub = getSubscription();
      if (sub.status === 'active' || sub.status === 'trial') {
        setShowPaywall(false);
        window.location.reload();
      } else {
        setShowPaywall(false);
      }
    }} />;
  }

  return <>{children}</>;
}
