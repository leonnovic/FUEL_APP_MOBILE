/**
 * usePushNotifications — cross-platform Web Push hook.
 *
 * Flow:
 *  1. Fetch VAPID public key from /api/push/public-key
 *  2. Ask the user for Notification permission
 *  3. Subscribe via the active Service Worker's PushManager
 *  4. POST the subscription to /api/push/subscribe (auth-gated)
 *
 * iOS Safari supports web push only when the app is installed as a PWA
 * (iOS 16.4+). We expose `iosNeedsInstall` so the UI can guide users.
 */
import { useCallback, useEffect, useState } from 'react';

const API_BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.REACT_APP_BACKEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('fuelpro_jwt');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState<PushPermission>(() => {
    if (!supported) return 'unsupported';
    return Notification.permission as PushPermission;
  });
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iosNeedsInstall = isIos() && !isStandalone() && supported;

  // Check current subscription status on mount
  useEffect(() => {
    if (!supported) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch { /* ignore */ }
    })();
  }, [supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) { setError('Push not supported on this browser.'); return false; }
    setBusy(true); setError(null);
    try {
      // 1. Permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== 'granted') {
        setError(perm === 'denied' ? 'Notifications blocked.' : 'Permission not granted.');
        return false;
      }
      // 2. Public key
      const pkRes = await fetch(`${API_BASE}/api/push/public-key`);
      if (!pkRes.ok) { setError('Push not configured on server.'); return false; }
      const { public_key } = await pkRes.json();
      // 3. Subscribe
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });
      // 4. Persist on server
      const body = sub.toJSON();
      const r = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          endpoint: body.endpoint,
          keys: body.keys,
          user_agent: navigator.userAgent,
          expiration_time: body.expirationTime ?? null,
        }),
      });
      if (!r.ok) {
        if (r.status === 401) setError('Please sign in to enable notifications.');
        else setError(`Server error (${r.status}).`);
        return false;
      }
      setSubscribed(true);
      return true;
    } catch (e) {
      setError((e as Error)?.message || 'Subscription failed.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    setBusy(true); setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch(`${API_BASE}/api/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      setSubscribed(false);
      return true;
    } catch (e) {
      setError((e as Error)?.message || 'Unsubscribe failed.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const sendTest = useCallback(async (): Promise<boolean> => {
    setError(null);
    const r = await fetch(`${API_BASE}/api/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        title: 'FuelPro test 🔔',
        body: 'Push notifications are working perfectly.',
        url: '/',
        tag: 'fuelpro-test',
      }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      setError(`Test failed (${r.status}): ${txt.slice(0, 100)}`);
      return false;
    }
    return true;
  }, []);

  return {
    supported,
    permission,
    subscribed,
    busy,
    error,
    iosNeedsInstall,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
