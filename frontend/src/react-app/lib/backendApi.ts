/**
 * Enhanced Backend API Client
 * - Robust error handling for all response types
 * - Automatic retry on network failures
 * - Proper timeout handling
 * - User-friendly error messages
 * - Cross-device compatibility
 */

const RAW_BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '');
export const API_BASE = RAW_BASE.replace(/\/$/, '');

const TOKEN_KEY = 'fuelpro_jwt';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Start at 1s, exponential backoff
const TIMEOUT_MS = 30000; // 30 second timeout
const APP_VERSION = '1.0.0';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

/**
 * Retry logic with exponential backoff
 */
async function retryFetch<T>(
  path: string,
  init: RequestInit,
  retries = 0
): Promise<T> {
  try {
    return await fetchWithTimeout<T>(path, init);
  } catch (err: any) {
    // Determine if error is retryable
    const isRetryable = 
      (err.name === 'AbortError') || // Timeout
      (err instanceof TypeError) || // Network error
      (err.status >= 500) || // Server error
      (err.status === 408) || // Request timeout
      (err.status === 429); // Rate limited
    
    if (isRetryable && retries < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retries); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryFetch<T>(path, init, retries + 1);
    }
    throw err;
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
    });
    
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    
    // Handle error responses
    if (!res.ok) {
      let errorDetail = res.statusText;
      
      try {
        if (contentType.includes('application/json')) {
          const data = await res.json();
          errorDetail = data.detail || data.message || data.error || errorDetail;
        } else if (contentType.includes('text/html')) {
          // Server returned HTML (likely proxy/gateway error)
          const text = await res.text();
          if (text.includes('502') || text.includes('Bad Gateway')) {
            errorDetail = 'Server temporarily unavailable. Please try again.';
          } else if (text.includes('503') || text.includes('Service Unavailable')) {
            errorDetail = 'Service is under maintenance. Please try again later.';
          } else {
            errorDetail = `Server error (HTTP ${res.status})`;
          }
        } else {
          errorDetail = `HTTP ${res.status}: ${contentType || 'unknown response type'}`;
        }
      } catch {
        errorDetail = `HTTP ${res.status}`;
      }
      
      const error: any = new Error(errorDetail);
      error.status = res.status;
      throw error;
    }
    
    // Parse successful response
    if (!contentType.includes('application/json')) {
      throw new Error(`Expected JSON but got ${contentType || 'unknown content type'}`);
    }
    
    return res.json() as Promise<T>;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    if (err instanceof TypeError) {
      throw new Error('Network error. Please check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main API fetch with auth and retry
 */
async function apiFetch<T = unknown>(
/** Generate a short random request correlation ID (UUID v4 or fallback). */
function newRequestId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* ignore */ }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Attempt a silent token refresh. Returns new token on success, null on failure. */
async function _refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': newRequestId() },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const body = await res.json() as { token?: string };
    if (body.token) { setToken(body.token); return body.token; }
  } catch { /* network error */ }
  return null;
}

async function _parseError(res: Response): Promise<string> {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    try { return (await res.json()).detail ?? res.statusText; } catch { /* ignore */ }
  } else {
    try {
      const snippet = (await res.text()).slice(0, 80);
      return `Server returned ${ct || 'non-JSON'} (HTTP ${res.status})${snippet ? `: ${snippet.replace(/\s+/g, ' ').trim()}` : ''}`;
    } catch { /* ignore */ }
  }
  return res.statusText;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  withAuth = true,
  _isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': newRequestId(),
    'X-App-Version': APP_VERSION,
    ...(init.headers as Record<string, string> | undefined),
  };
  
  if (withAuth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  
  try {
    return await retryFetch<T>(path, { ...init, headers });
  } catch (err: any) {
    // Clear token on 401 (Unauthorized)
    if (err.status === 401) {
      setToken(null);
      throw new Error('Your session has expired. Please log in again.');
    }
    throw err;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // — silent token refresh on first 401 —
  if (res.status === 401 && withAuth && !_isRetry) {
    const fresh = await _refreshToken();
    if (fresh) {
      // retry original call once with new token
      return apiFetch<T>(path, init, true, true);
    }
    // refresh failed — clear stale token so UI can redirect to login
    setToken(null);
  }

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok) {
    const detail = await _parseError(res);
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
}

// ─── Auth ───────────────────────────────────────────────────────────
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
  catch (err) {
    // If auth check fails, clear token and return null
    if (err instanceof Error && err.message.includes('session has expired')) {
      setToken(null);
    }
    return null;
  }
}

/** Server-side logout: revokes the JWT, then clears local storage. */
export async function backendLogout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' }, true, true);
  } catch { /* ignore — still clear local token */ }
  setToken(null);
}

// ─── Subscriptions ────────────────────────────────────────────────────────
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

// ─── Stripe Checkout ───────────────────────────────────────────────────────
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

// ─── M-PESA STK Push ───────────────────────────────────────────────────────
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

// ─── Cloud sync ─────────────────────────────────────────────────────────
export async function syncGet<T = unknown>(collection: string): Promise<T[]> {
  const r = await apiFetch<{ items: T[] }>(`/api/sync/${collection}`);
  return r.items;
}
export async function syncPut<T = unknown>(collection: string, items: T[]): Promise<void> {
  await apiFetch(`/api/sync/${collection}`, { method: 'POST', body: JSON.stringify({ items }) });
}
