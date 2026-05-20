import { useState, useEffect } from 'react';
import { Shield, X, Settings } from 'lucide-react';

/**
 * Lightweight GDPR/CCPA consent banner.
 *
 * Three purposes the user can toggle independently:
 *  - essential (always on — required for the app to function)
 *  - analytics (we don't ship any third-party analytics yet, but the flag is
 *    here for when we do)
 *  - marketing (broadcasts, email/SMS notifications)
 *
 * Stored in localStorage as `fuelpro_consent_v1`. Until the user makes a
 * choice, the banner is rendered. After "Accept all" or "Reject non-essential"
 * the banner hides. Users can re-open via the floating shield in the corner.
 *
 * Respects the GPC (Global Privacy Control) header — if the browser sends
 * `navigator.globalPrivacyControl === true`, we default to "reject" instead
 * of "accept" until the user explicitly overrides.
 */

const STORAGE_KEY = 'fuelpro_consent_v1';

type Consent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decided_at: string;
};

function read(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.decided_at) return parsed as Consent;
  } catch { /* ignore */ }
  return null;
}

function write(c: Consent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  window.dispatchEvent(new CustomEvent('fuelpro:consent', { detail: c }));
}

export default function ConsentManager() {
  const [consent, setConsent] = useState<Consent | null>(() => read());
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  // Honour Global Privacy Control by default
  useEffect(() => {
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    if (gpc) {
      setAnalytics(false);
      setMarketing(false);
    }
  }, []);

  const acceptAll = () => {
    const c: Consent = { essential: true, analytics: true, marketing: true, decided_at: new Date().toISOString() };
    write(c); setConsent(c);
  };
  const rejectNonEssential = () => {
    const c: Consent = { essential: true, analytics: false, marketing: false, decided_at: new Date().toISOString() };
    write(c); setConsent(c);
  };
  const saveCustom = () => {
    const c: Consent = { essential: true, analytics, marketing, decided_at: new Date().toISOString() };
    write(c); setConsent(c); setShowSettings(false);
  };
  const reopen = () => {
    setShowSettings(true);
    if (consent) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }
  };

  if (consent && !showSettings) {
    // Small floating reopen button
    return (
      <button
        onClick={reopen}
        data-testid="consent-reopen-btn"
        title="Privacy preferences"
        className="fixed bottom-4 left-4 z-40 p-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-gray-300 border border-white/10 shadow-lg transition-colors"
      >
        <Shield size={16} />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Privacy preferences"
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 p-2 sm:p-3 pointer-events-none"
    >
      <div className="max-w-md ml-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto">
        <div className="flex items-start gap-3 p-3.5 sm:p-4">
          <Shield size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-white">Your privacy choices</h3>
            <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
              FuelPro stores your data on your account. Opt out of optional analytics + emails any time.
            </p>

            {showSettings && (
              <div className="mt-3 space-y-2" data-testid="consent-settings">
                <Row label="Essential" desc="Required — login + your data." checked disabled />
                <Row label="Analytics" desc="Anonymised usage data."
                     checked={analytics} onChange={setAnalytics}
                     testId="consent-analytics" />
                <Row label="Marketing" desc="Product updates + broadcasts."
                     checked={marketing} onChange={setMarketing}
                     testId="consent-marketing" />
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              {!showSettings && (
                <>
                  <button
                    onClick={acceptAll}
                    data-testid="consent-accept-all"
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    Accept all
                  </button>
                  <button
                    onClick={rejectNonEssential}
                    data-testid="consent-reject-nonessential"
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-medium transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    data-testid="consent-customise"
                    className="px-3 py-1.5 text-[11px] text-gray-300 hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <Settings size={11} /> Customise
                  </button>
                </>
              )}
              {showSettings && (
                <>
                  <button
                    onClick={saveCustom}
                    data-testid="consent-save"
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-3 py-1.5 text-[11px] text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          {consent && (
            <button
              onClick={() => setShowSettings(false)}
              aria-label="Close"
              className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              data-testid="consent-close"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, desc, checked, disabled, onChange, testId }: {
  label: string; desc: string; checked: boolean;
  disabled?: boolean; onChange?: (v: boolean) => void; testId?: string;
}) {
  return (
    <label className={`flex items-start gap-3 p-2.5 rounded-lg border border-white/5 ${disabled ? 'opacity-70' : 'hover:bg-white/5 cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 accent-amber-500"
        data-testid={testId}
      />
      <div className="flex-1">
        <p className="text-xs font-semibold text-white">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </label>
  );
}

/** Read the persisted consent decision. Returns `null` if the user has not
 * yet decided. Other modules can use this to gate analytics/marketing code. */
export function getConsent(): Consent | null {
  return read();
}
