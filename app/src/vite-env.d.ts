/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_CLOUD_API_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
  readonly VITE_STRIPE_KEY?: string;
  readonly VITE_CF_ACCOUNT_ID?: string;
  readonly VITE_CF_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
