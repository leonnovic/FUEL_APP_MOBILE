import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import Paywall from './Paywall';
import { getSubscription } from '@/react-app/lib/subscriptionStore';
import { checkSubscription as checkLibSubscription } from '@/react-app/lib/subscription';
import { useTrial, markTrialPaid } from '@/react-app/hooks/useTrial';

// Re-export for backward compatibility with any other files that import from here
export { useTrial, markTrialPaid };

interface TrialGateProps {
  children: React.ReactNode;
}

export default function TrialGate({ children }: TrialGateProps) {
  const { isExpired, isPaid, isInTrial, totalSeconds, timeDisplay, timeDisplayLong, progressPercent } = useTrial();
  const [showPaywall, setShowPaywall] = useState(false);
  const navigate = useNavigate();

  // Check paid subscription — checks BOTH storage engines so any payment path unlocks the gate
  useEffect(() => {
    const storeSub = getSubscription();        // subscriptionStore → fuelpro_subscription_v1
    const libCheck = checkLibSubscription();   // lib/subscription   → fuelpro_subscription
    const isActivePaid = storeSub.status === 'active' || libCheck.access;
    if (isActivePaid) { setShowPaywall(false); return; }
    if (isExpired && !isActivePaid) setShowPaywall(true);
  }, [isExpired]);

  // Show banner only in last 3 days of trial (72h) to avoid annoying users with ample time left
  const THREE_DAYS_SECONDS = 3 * 24 * 3600;
  const shouldShowBanner = !showPaywall && (isPaid || (isInTrial && totalSeconds <= THREE_DAYS_SECONDS));

  const handlePaywallClose = () => {
    const storeSub = getSubscription();
    const libCheck = checkLibSubscription();
    const isActive = storeSub.status === 'active' || storeSub.status === 'trial' || libCheck.access;
    if (isActive) {
      setShowPaywall(false);
      window.location.reload();
    } else {
      setShowPaywall(false);
    }
  };

  if (shouldShowBanner) {
    const isUrgent = !isPaid && totalSeconds < 24 * 3600;
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
                | {totalSeconds < 3600 ? 'Expiring soon — upgrade now' : 'Less than 3 days left'}
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
        {showPaywall && <Paywall onClose={handlePaywallClose} />}
        <span style={{ display: 'none' }}>{String(navigate ? '' : '')}</span>
      </>
    );
  }

  // Trial expired (or forced paywall from Upgrade Now) — show full paywall
  if (showPaywall || isExpired) {
    return <Paywall onClose={handlePaywallClose} />;
  }

  // Trial active and not in last-3-days window — just render children normally
  return <>{children}</>;
}
