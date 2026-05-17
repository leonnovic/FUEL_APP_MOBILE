# FuelPro - Fuel Management System

## Original Problem Statement
"MAKE MY APP https://3d3tjxc5r2qoc.kimi.page" — port the user-supplied FuelPro source (153 MB zip) into the Emergent environment and make it run cleanly.

Follow-ups:
- The "Range Filter: Total Valid Inflow" in the M-PESA Inflow Analyzer was using **Recorded Net (Paid In)** when the user wanted it to use **True Inflow (Balance Delta +)**.
- "Next task: allow extraction of inflows from multiple Upload M-PESA PDF statement(s)."
- "Go through the entire build and fix every error."

## Architecture
- **Frontend**: React 19 + TypeScript + Vite 6 (HashRouter), Tailwind CSS, Radix UI, Zustand, TanStack Query, tRPC client, Chart.js, jsPDF, html2canvas, pdfjs-dist, xlsx — 70+ feature components.
- **Backend**: FastAPI on :8001 with MongoDB for real cloud sync (`/api/user-data`) + safe-default stubs for every other `/api/*` route the front-end touches.
- **Storage**: Browser localStorage (auth, sales, stations, payroll, invoices, M-PESA) with optional MongoDB-backed `/api/user-data` cloud sync.
- **Legacy**: Original Hono + tRPC + Drizzle/MySQL backend remains in `/app/frontend/api/*` for reference but is excluded from build/typecheck.

## Iteration log
### Iteration 1 — Port & boot
- Replaced `/app/frontend` with the Vite app from the user-supplied zip.
- Rewrote `vite.config.ts` (dropped embedded Hono dev server, bound to `0.0.0.0:3000`).
- Updated `package.json` so `yarn start` runs `vite --host 0.0.0.0 --port 3000` (keeps supervisor working).
- `yarn install --ignore-engines` (pdfjs-dist's Node ≥22 requirement runs fine on Node 20).
- Verified end-to-end via screenshots: login, signup, onboarding all functional.

### Iteration 2 — Bug fix + full error pass
- **M-PESA Range Filter — TRUE INFLOW**: rewrote the "Range Filter: Total Valid Inflow" calculator in `MPESAAnalyzer.tsx` to sum positive **balance deltas** within the filter range (using the FULL sorted dataset to compute the delta for the first record correctly). Added an explanatory caption under the section so users understand it sums "Balance Delta +" not "Paid In".
- **Multi-PDF support hardened**: extraction now (a) survives per-file errors instead of aborting the whole batch, and (b) **deduplicates by receipt number across PDFs** so the same transaction appearing in two statements only counts once. Warning banner shows the dedup count.
- **TypeScript errors — all fixed**:
  - `DocumentCenter.tsx` — `webkitdirectory` prop typing
  - `DocumentConverter.tsx` — `new window.Image()` + `getNumberOfPages` cast through `unknown`
  - `FuelVideoMiniPlayer.tsx` — `useRef<...>(undefined)` initializer
  - `SetupWizard.tsx` — added `DEFAULT_CURRENCY` import
  - `syncEngine.ts` — exported `SyncItem` interface (was internal)
  - `compliance.ts` — removed duplicate `ComplianceConfig` export
  - `countries.ts` — `generateCountryProfile` now returns a typed-cast object
  - `LocalizationContext.tsx` — dropped missing `REGIONAL_CONFIGS` import
  - `LocationContext.tsx` — cast universal fallback through `unknown`, typed `getCountry`
  - `useGeo.tsx` — narrowed `flag` access
  - `FounderSimple.tsx` — fixed `WebhookSection` → `WebhooksSection` typo
  - `ConfigSection.tsx` — merged duplicate `useState` import; cast `Intl.supportedValuesOf` via `unknown`
  - `NewsService.ts` — declared the missing `globalSources` constant from `NEWS_SOURCES['GLOBAL']`
  - Excluded legacy `/app/frontend/api/*` (Hono + Drizzle/MySQL) from tsconfig — it's not used by the runtime web app.
- **Vite production build now passes cleanly** (zero warnings, no CSS errors, all 50+ chunks emit successfully).
- **Backend rewrite (`/app/backend/server.py`)**:
  - Real cloud sync at `/api/user-data` (GET/POST/DELETE), persisted to MongoDB, keyed by `x-user-id` header.
  - Graceful stubs for `/api/communication/*`, `/api/documents/*`, `/api/fuel-prices/current`, `/api/live-transactions`, `/api/mpesa/*`, `/api/payment-sources`, `/api/payroll/*`, `/api/chat`, `/api/oauth/*`.
  - Catch-all `/api/{path}` so every unknown route returns a typed safe-default instead of 404 noise.
- **Console verified clean**: zero errors, zero 404s after the full flow (load → signup → onboarding).

## What's working (verified)
- Login / Sign-Up / Founder Access / Password Reset routes
- Dark-themed landing page matches the original at https://3d3tjxc5r2qoc.kimi.page
- Trial banner + onboarding screen
- All 70+ feature components are bundled and reachable (Sales, Inventory, Payroll, Invoices, **M-PESA Analyzer with True Inflow filter + multi-PDF dedup**, Fuel Quality, Compliance, AI Assistant, etc.)
- Cloud sync via `/api/user-data` (MongoDB-backed) — save & retrieve verified via curl
- Production build (`yarn build`) emits cleanly

## MOCKED integrations (highlighted)
- `/api/mpesa/stk-push` — **MOCKED**, returns a synthetic CheckoutRequestID. Configure Daraja credentials & wire a real client to enable production STK push.
- `/api/communication/send-message` — **MOCKED**, returns `status: queued_local`. SMS/WhatsApp dispatch needs Twilio/Sendgrid/WA integration.
- `/api/fuel-prices/current` — returns `null` so the UI falls back to its local EPRA table.
- `/api/chat` — returns a notice that AI assistant is not configured.
- Password-reset emails — still console-logged (no email channel wired).

## Backlog (P1 → P3)
- [P1] Wire real Daraja M-PESA STK push if production payments are needed (replace `/api/mpesa/stk-push` stub)
- [P1] Wire SendGrid/Twilio for real communications + password-reset emails
- [P2] Port high-value tRPC routers from `/app/frontend/api/*` (founder-auth, audit, inventory) to FastAPI + MongoDB for real multi-device cloud features
- [P2] Upgrade Node to ≥22 so `--ignore-engines` is no longer required for pdfjs-dist
- [P3] Re-enable production TypeScript reference to `/app/frontend/api/*` after the legacy Drizzle schema is migrated or removed
