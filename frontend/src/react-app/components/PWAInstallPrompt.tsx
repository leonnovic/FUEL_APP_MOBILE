import { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'fuelpro_pwa_install_dismissed_at';
// Re-show prompt 14 days after dismissal
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function shouldShow(): boolean {
  if (isStandalone()) return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return true;
  const ts = parseInt(raw, 10);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > DISMISS_COOLDOWN_MS;
}

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!shouldShow()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onInstalled = () => {
      setVisible(false);
      setIosHint(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari: no event fires — show manual hint after 20s on first visit
    if (isIos() && !isStandalone()) {
      const timer = setTimeout(() => {
        if (shouldShow()) setIosHint(true);
      }, 20_000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setIosHint(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } finally {
      setVisible(false);
      setDeferred(null);
    }
  };

  if (!visible && !iosHint) return null;

  return (
    <div
      data-testid="pwa-install-banner"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[92vw] max-w-md bg-slate-900/95 backdrop-blur-lg border border-amber-500/30 rounded-2xl shadow-2xl p-4 flex items-start gap-3"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
        {iosHint ? <Share2 size={20} className="text-white" /> : <Download size={20} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Install FuelPro</p>
        {iosHint ? (
          <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
            Tap <Share2 size={11} className="inline mx-0.5 align-text-bottom" /> Share, then <span className="font-semibold text-amber-300">"Add to Home Screen"</span> for the full app.
          </p>
        ) : (
          <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
            Install the app for faster launch, offline access, and notifications.
          </p>
        )}
        {!iosHint && (
          <button
            onClick={install}
            data-testid="pwa-install-btn"
            className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 rounded-lg text-xs font-semibold text-slate-900 transition-colors"
          >
            Install app
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        data-testid="pwa-install-dismiss"
        className="flex-shrink-0 p-1 text-gray-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
