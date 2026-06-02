/**
 * Cloudflare Worker Service Entry Point
 * Proxies all requests to the static assets or returns index.html for SPA routing.
 */

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Bypass for API calls if they were handled by the same worker (not the case here usually)
    if (url.pathname.startsWith('/api/')) {
       return new Response("Not Found", { status: 404 });
    }

    try {
      // Try to fetch the static asset
      const response = await env.ASSETS.fetch(request);

      // If the asset is not found (404), serve index.html for SPA routing
      if (response.status === 404) {
        const indexRequest = new Request(`${url.origin}/index.html`, request);
        return env.ASSETS.fetch(indexRequest);
      }

      return response;
    } catch (e) {
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
