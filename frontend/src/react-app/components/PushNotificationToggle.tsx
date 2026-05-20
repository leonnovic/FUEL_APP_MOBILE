import { Bell, BellOff, Send, AlertCircle, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/react-app/hooks/usePushNotifications';

interface Props {
  compact?: boolean;
}

export default function PushNotificationToggle({ compact = false }: Props) {
  const {
    supported, permission, subscribed, busy, error, iosNeedsInstall,
    subscribe, unsubscribe, sendTest,
  } = usePushNotifications();

  if (!supported) {
    return (
      <div className="text-[11px] text-gray-500 flex items-center gap-1.5" data-testid="push-unsupported">
        <BellOff size={12} /> Push not supported on this browser
      </div>
    );
  }

  if (iosNeedsInstall) {
    return (
      <div
        className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-2"
        data-testid="push-ios-hint"
      >
        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          On iOS, install the app first (Share → Add to Home Screen), then re-open it
          to enable notifications.
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={busy}
        data-testid="push-toggle-compact"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
          subscribed
            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
            : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
        }`}
        title={subscribed ? 'Notifications enabled' : 'Enable notifications'}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : subscribed ? <Bell size={12} /> : <BellOff size={12} />}
        <span className="hidden sm:inline">{subscribed ? 'On' : 'Off'}</span>
      </button>
    );
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4" data-testid="push-toggle-card">
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${subscribed ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
          {subscribed ? <Bell size={18} className="text-emerald-400" /> : <BellOff size={18} className="text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">
            Push Notifications {subscribed && <span className="text-emerald-400 text-[11px] font-normal ml-1">· Active</span>}
          </h4>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Get instant alerts for payments, reconciliation, and daily digests — even when the app is closed.
          </p>
          {permission === 'denied' && (
            <p className="text-[11px] text-red-400 mt-2">
              Notifications are blocked. Open your browser settings and allow notifications for this site.
            </p>
          )}
          {error && (
            <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1.5">
              <AlertCircle size={11} /> {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!subscribed ? (
              <button
                onClick={subscribe}
                disabled={busy || permission === 'denied'}
                data-testid="push-enable-btn"
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-400 rounded-lg text-xs font-semibold text-slate-900 transition-colors flex items-center gap-1.5"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                Enable notifications
              </button>
            ) : (
              <>
                <button
                  onClick={sendTest}
                  disabled={busy}
                  data-testid="push-test-btn"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                >
                  <Send size={12} /> Send test
                </button>
                <button
                  onClick={unsubscribe}
                  disabled={busy}
                  data-testid="push-disable-btn"
                  className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <BellOff size={12} />} Disable
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
