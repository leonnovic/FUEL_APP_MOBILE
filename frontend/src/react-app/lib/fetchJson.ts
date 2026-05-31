/**
 * Robust JSON fetch.
 *
 * Wraps `fetch()` with two guarantees:
 *  1. If the response is HTML (proxy 404 / 502 returning the index page) we
 *     surface a clean `Error("Server returned HTML, not JSON (HTTP {status})")`
 *     instead of the cryptic "Unexpected token '<', \"<!DOCTYPE ...\""
 *     bubbling out of `r.json()`.
 *  2. If the response is JSON but `r.ok === false`, we throw the `detail`
 *     field (FastAPI convention) so the caller can show it to the user.
 *
 * Use this for every server call where the route MUST exist (auth, paywalled
 * features). For best-effort / optional calls, plain fetch is still fine.
 */

export async function fetchJson<T = unknown>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(input, init);
  const ct = (r.headers.get('content-type') || '').toLowerCase();

  if (!ct.includes('application/json')) {
    // Read a short prefix for diagnostics, then surface a stable error.
    let snippet = '';
    try { snippet = (await r.text()).slice(0, 80); } catch { /* ignore */ }
    throw new Error(
      `Server returned ${ct || 'non-JSON'} (HTTP ${r.status})${snippet ? ` — "${snippet.replace(/\s+/g, ' ').trim()}"` : ''}`,
    );
  }

  let data: { detail?: unknown } & Record<string, unknown>;
  try {
    data = await r.json();
  } catch (e) {
    throw new Error(`Bad JSON from server (HTTP ${r.status}): ${e instanceof Error ? e.message : e}`, { cause: e });
  }

  if (!r.ok) {
    const detail = data.detail;
    const message = typeof detail === 'string' ? detail
      : detail ? JSON.stringify(detail)
      : `Request failed (HTTP ${r.status})`;
    throw new Error(message);
  }
  return data as T;
}
