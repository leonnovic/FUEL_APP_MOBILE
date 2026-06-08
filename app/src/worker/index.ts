/**
 * Cloudflare Worker Entry Point
 * Serves the FuelPro SPA with proper routing
 */

import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  DB: D1Database;
  R2_BUCKET: R2Bucket;
}

declare const ASSETS: { fetch: (request: Request) => Promise<Response> };

async function handleRequest(event: FetchEvent): Promise<Response> {
  const url = new URL(event.request.url);
  
  // Handle API routes
  if (url.pathname.startsWith('/api/')) {
    return new Response('API endpoint - configure in Pages project settings', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Serve static assets from KV store
  try {
    return await ASSETS.fetch(event.request);
  } catch (e) {
    // Fallback to index.html for SPA routing
    return new Response(await fetch(`${url.origin}/index.html`).then(r => r.text()), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event));
});