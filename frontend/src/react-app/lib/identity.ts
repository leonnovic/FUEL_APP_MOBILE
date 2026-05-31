/**
 * Anonymous device identity & stitching helpers.
 *
 * - `getAnonymousId()` returns a stable per-device id, generated on first
 *   call and persisted to localStorage. Use it in `x-user-id` headers for
 *   pre-login API calls so the server can later merge that data into the
 *   authenticated profile.
 * - `linkAnonymousToUser(jwt)` POSTs the anonymous id to
 *   `/api/identity/link`, moving all anon sync, user_data, and audit_log
 *   rows over to the freshly-authenticated user. Idempotent — safe to call
 *   on every login.
 */

const ANON_KEY = 'fuelpro_anonymous_id';

const API_BASE = (
  import.meta.env.VITE_REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

export function getAnonymousId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    // RFC4122-ish; crypto.randomUUID is everywhere in evergreen browsers.
    id = (window.crypto?.randomUUID?.() || `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export async function linkAnonymousToUser(jwt?: string | null): Promise<boolean> {
  const token = jwt || localStorage.getItem('fuelpro_jwt');
  if (!token) return false;
  const anonId = getAnonymousId();
  try {
    const r = await fetch(`${API_BASE}/api/identity/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ anonymous_id: anonId }),
    });
    if (!r.ok) return false;
    return true;
  } catch {
    return false;
  }
}
