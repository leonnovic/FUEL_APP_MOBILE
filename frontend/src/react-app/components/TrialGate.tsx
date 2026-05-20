import { useState, useEffect } from 'react';
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
      // Write BOTH shapes so the trial system (lib/subscription.ts) and the
      // banner agree on when the trial started.
      localStorage.setItem('fuelpro_trial', JSON.stringify({
        startedAt: now,
        trialStartedAt: new Date(now).toISOString(),
        status: 'active',
      }));
      return { startedAt: now, isExpired: false, msLeft: TRIAL_MS };
    }
    const data = JSON.parse(raw);
    // Support both schemas: legacy `startedAt: epoch ms` (this component) and
    // `trialStartedAt: ISO string` (lib/subscription.ts/SubscriptionService).
    let startedAt: number;
    if (Number.isFinite(data.startedAt)) {
      startedAt = data.startedAt;
    } else if (data.trialStartedAt) {
      const parsed = Date.parse(data.trialStartedAt);
      startedAt = Number.isFinite(parsed) ? parsed : Date.now();
    } else {
      startedAt = Date.now();
    }
    if (data.status === 'paid') return { startedAt, isExpired: false, msLeft: Infinity };

    // Defensive: if startedAt is in the future or NaN, reset to now.
    if (!Number.isFinite(startedAt) || startedAt > Date.now()) {
      startedAt = Date.now();
      localStorage.setItem('fuelpro_trial', JSON.stringify({
        ...data,
        startedAt,
        trialStartedAt: new Date(startedAt).toISOString(),
        status: data.status || 'active',
      }));
    } else if (!Number.isFinite(data.startedAt)) {
      // Backfill the numeric `startedAt` next to the ISO form so future reads are fast.
      try {
        localStorage.setItem('fuelpro_trial', JSON.stringify({ ...data, startedAt }));
      } catch { /* quota — non-fatal */ }
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

  // Tick every second so the countdown visibly decrements from 14d → 0d → 0s.
  // We still recompute from `Date.now()` each tick (not from a counter) so the
  // banner stays accurate even after tab-throttling or sleep/wake.
  useEffect(() => {
    const interval = setInterval(() => setTrialState(getTrialState()), 1000);
    return () => clearInterval(interval);
  }, []);

  const msLeft = trialState.msLeft;
  const isPaid = msLeft === Infinity;
  const isInTrial = !trialState.isExpired && !isPaid;
  const isExpired = trialState.isExpired && !isPaid;

  // Always show the full d/h/m/s countdown so the timer visibly ticks down
  // ("14d 23h 59m 12s left") — communicates urgency and answers the user's
  // explicit ask: "countdown from 14d till 0d".
  let timeDisplay: string;
  let timeDisplayLong: string;
  if (isPaid) {
    timeDisplay = '∞';
    timeDisplayLong = '∞';
  } else {
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    // Long form always shows all 4 units → "14d 23h 59m 12s"
    timeDisplayLong = `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
    // Compact form trims leading zeroes for narrow viewports
    if (days > 0) timeDisplay = `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
    else if (hours > 0) timeDisplay = `${hours}h ${pad(mins)}m ${pad(secs)}s`;
    else timeDisplay = `${pad(mins)}m ${pad(secs)}s`;
  }

  return {
    ...trialState,
    isPaid,
    isInTrial,
    isExpired,
    timeDisplay,
    timeDisplayLong,
    msLeft,
    totalSeconds: Math.max(0, Math.floor(msLeft / 1000)),
    progressPercent: isPaid ? 100 : Math.max(0, Math.min(100, (msLeft / TRIAL_MS) * 100)),
  };
}

export default function TrialGate({ children }: TrialGateProps) {
  const { isExpired, isPaid, isInTrial, totalSeconds, timeDisplay, timeDisplayLong, progressPercent } = useTrial();
  const [showPaywall, setShowPaywall] = useState(false);
  const navigate = useNavigate();

  // Check subscription. If user has any active tier (free, starter, pro, enterprise)
  // OR they're explicitly on the local trial, we DO NOT force the paywall.
  useEffect(() => {
    const sub = getSubscription();
    if (sub.status === 'active') { setShowPaywall(false); return; }
    if (isExpired && sub.status !== 'trial') setShowPaywall(true);
  }, [isExpired]);

  // Active trial → show non-blocking banner ONLY in the last 24 hours
  // (per product decision: don't nag users when they have ample time left).
  const ONE_DAY_SECONDS = 24 * 3600;
  const shouldShowBanner = !showPaywall && (
    isPaid ||
    (isInTrial && totalSeconds <= ONE_DAY_SECONDS)
  );

  if (shouldShowBanner) {
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
              {isPaid ? 'Paid subscription · Full access' : (
                <>
                  <span className="hidden sm:inline">Trial: {timeDisplayLong} left</span>
                  <span className="sm:hidden">Trial: {timeDisplay} left</span>
                </>
              )}
            </span>
            {!isPaid && (
              <span className="hidden sm:inline opacity-80">
                | {totalSeconds < 3600 ? 'Expiring soon — upgrade now' : 'Less than 24h left'}
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
