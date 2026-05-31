/**
 * FuelPro — Cloudflare Worker entry point
 *
 * Proxies all requests to the static React SPA served from the `ASSETS`
 * binding.  The `assets.not_found_handling = "single-page-application"`
 * setting in wrangler.jsonc ensures 404s from the file system return
 * index.html so React Router handles client-side navigation.
 *
 * If you later add Cloudflare-side API routes (e.g. auth callbacks,
 * webhook handlers), add them here BEFORE the ASSETS.fetch() fallback.
 */

export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
