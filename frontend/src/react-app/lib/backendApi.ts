/**
 * Lightweight FuelPro backend client.
 *
 * - Reads the API base from VITE_REACT_APP_BACKEND_URL or window.location.origin
 * - Stores the JWT in localStorage under `fuelpro_jwt`
 * - Auto-attaches Authorization header when a token is present
 * - Mirrors the local auth state with the backend so cloud sync works
 *   across devices without breaking the existing localStorage flow
 */

const RAW_BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');
export const API_BASE = RAW_BASE.replace(/\/$/, '');

const TOKEN_KEY = 'fuelpro_jwt';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  withAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (withAuth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok) {
    let detail: unknown = res.statusText;
    if (ct.includes('application/json')) {
      try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
    } else {
      // Proxy 404/502 returning the index HTML — surface a clean message.
      let snippet = '';
      try { snippet = (await res.text()).slice(0, 80); } catch { /* ignore */ }
      detail = `Server returned ${ct || 'non-JSON'} (HTTP ${res.status})${snippet ? `: ${snippet.replace(/\s+/g, ' ').trim()}` : ''}`;
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  if (!ct.includes('application/json')) {
    let snippet = '';
    try { snippet = (await res.text()).slice(0, 80); } catch { /* ignore */ }
    throw new Error(`Server returned ${ct || 'non-JSON'} (HTTP ${res.status})${snippet ? `: ${snippet.replace(/\s+/g, ' ').trim()}` : ''}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  trial_ends_at?: string | null;
  subscription_status: string;
  created_at: string;
}
interface AuthResp { token: string; user: BackendUser; }

export async function backendRegister(email: string, password: string, name: string): Promise<BackendUser> {
  const r = await apiFetch<AuthResp>('/api/auth/register',
    { method: 'POST', body: JSON.stringify({ email, password, name }) }, false);
  setToken(r.token);
  return r.user;
}

export async function backendLogin(email: string, password: string): Promise<BackendUser> {
  const r = await apiFetch<AuthResp>('/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) }, false);
  setToken(r.token);
  return r.user;
}

export async function backendMe(): Promise<BackendUser | null> {
  if (!getToken()) return null;
  try { return await apiFetch<BackendUser>('/api/auth/me'); }
  catch { setToken(null); return null; }
}

export function backendLogout(): void { setToken(null); }

// ─── Subscriptions ────────────────────────────────────────────────────────────
export interface BackendPlan {
  key: string; name: string;
  price_usd: number; price_kes: number;
  features: string[]; max_stations: number; max_uploads: number;
}
export async function fetchPlans(): Promise<BackendPlan[]> {
  const r = await apiFetch<{ plans: BackendPlan[] }>('/api/plans', {}, false);
  return r.plans;
}

export interface SubscriptionInfo {
  tier: string; status: string; trial_ends_at?: string | null;
  subscription: Record<string, unknown> | null;
  plan: BackendPlan | null;
}
export async function fetchSubscription(): Promise<SubscriptionInfo> {
  return apiFetch<SubscriptionInfo>('/api/subscription');
}

// ─── Stripe Checkout ──────────────────────────────────────────────────────────
export async function startStripeCheckout(plan: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): Promise<{ url: string; session_id: string }> {
  return apiFetch('/api/payments/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({
      plan, billing_cycle: billingCycle,
      origin_url: window.location.origin,
    }),
  });
}

export interface StripeStatus {
  session_id: string; status: string; payment_status: string;
  amount_total: number; currency: string; plan?: string;
}
export async function pollStripeStatus(sessionId: string): Promise<StripeStatus> {
  return apiFetch(`/api/payments/stripe/status/${sessionId}`);
}

// ─── M-PESA STK Push ──────────────────────────────────────────────────────────
export interface MpesaPushResp {
  ok: boolean; tx_id: string; mocked?: boolean; message?: string;
  checkout_request_id?: string; merchant_request_id?: string;
  customer_message?: string; response_description?: string;
}
export async function startMpesaStkPush(plan: string, phone: string): Promise<MpesaPushResp> {
  return apiFetch('/api/mpesa/stk-push', {
    method: 'POST', body: JSON.stringify({ plan, phone }),
  });
}

export interface MpesaStatus {
  tx_id: string; status: string; payment_status: string;
  mpesa_receipt?: string; result_desc?: string;
}
export async function pollMpesaStatus(txId: string): Promise<MpesaStatus> {
  return apiFetch(`/api/mpesa/status/${txId}`);
}

// ─── Cloud sync ───────────────────────────────────────────────────────────────
export async function syncGet<T = unknown>(collection: string): Promise<T[]> {
  const r = await apiFetch<{ items: T[] }>(`/api/sync/${collection}`);
  return r.items;
}
export async function syncPut<T = unknown>(collection: string, items: T[]): Promise<void> {
  await apiFetch(`/api/sync/${collection}`, { method: 'POST', body: JSON.stringify({ items }) });
}
