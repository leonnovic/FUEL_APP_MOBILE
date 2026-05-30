import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/react-app/context/AuthContext';
import { startTrial, getTrial } from '@/react-app/lib/subscription';

interface SubscriptionCheckerProps {
  children: ReactNode;
}

/**
 * SubscriptionChecker — lightweight bootstrapper only.
 *
 * Responsibilities:
 *  1. Auto-start the 14-day trial for first-time authenticated users.
 *  2. Migrate any stale versioned trial keys to the current key.
 *  3. Always render children — TrialGate (inside children) handles the
 *     paywall, countdown banner, and upgrade flow so we never double-gate.
 */
export default function SubscriptionChecker({ children }: SubscriptionCheckerProps) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Migrate old versioned trial keys → current key
    try {
      const oldKeys = ['fuelpro_trial_v3', 'fuelpro_trial_v2', 'fuelpro_trial_v1'];
      const current = localStorage.getItem('fuelpro_trial');
      if (!current) {
        for (const k of oldKeys) {
          const old = localStorage.getItem(k);
          if (old) { localStorage.setItem('fuelpro_trial', old); break; }
        }
      }
    } catch { /* quota / SSR — safe to ignore */ }

    // Auto-start 14-day trial for first-time authenticated users
    if (user) {
      const existing = getTrial();
      if (!existing) {
        const email = user.email || 'anonymous@fuelpro.app';
        startTrial(user.id || email, email);
      }
    }

    setReady(true);
  }, [user]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white">Loading FuelPro...</h2>
          <p className="text-sm text-gray-500 mt-1">Starting your session</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
