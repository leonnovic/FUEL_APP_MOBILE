# FuelPro - Fuel Management System

## Original Problem Statement
"MAKE MY APP https://3d3tjxc5r2qoc.kimi.page"

User provided a 153 MB zip containing the source code of FuelPro — a comprehensive Fuel Station Management System originally built on the Kimi/Mocha platform. Goal: get this app running fully in the Emergent environment.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite 6 (HashRouter), Tailwind CSS, Radix UI, Zustand, TanStack Query, tRPC client, Chart.js, jsPDF, html2canvas, qrcode, xlsx
- **Backend (current)**: Minimal FastAPI on :8001 (Hello World) — most of the app's logic runs client-side
- **Storage**: Browser localStorage (auth, sales, stations, payroll, invoices, M-PESA, etc.) with optional cloud sync hooks (Supabase/Firebase) preserved in the codebase
- **Routing**: HashRouter (`/#/`, `/#/founder`, `/#/reset-password`, etc.) so all routes work behind the Emergent ingress
- **Original backend (preserved, not active)**: Hono + tRPC + Drizzle ORM + MySQL — left in `/app/frontend/api` for future activation

## Setup performed
1. Extracted user-uploaded zip and replaced `/app/frontend` with the FuelPro Vite codebase
2. Rewrote `vite.config.ts` to drop the embedded Hono dev-server (was conflicting with platform ingress) and bind Vite to `0.0.0.0:3000`
3. Updated `package.json` scripts: `start` and `dev` now run `vite --host 0.0.0.0 --port 3000` so the existing supervisor (`yarn start`) keeps working
4. Created `/app/frontend/.env` with `VITE_APP_ID` and `REACT_APP_BACKEND_URL`
5. Installed dependencies with `yarn install --ignore-engines` (pdfjs-dist requires Node ≥22, runs fine on Node 20 with engines-check disabled)
6. Frontend & backend supervised services are both `RUNNING`

## What's working (verified via screenshots)
- ✅ Landing/Login screen renders pixel-matched to the original kimi.page deployment (dark theme, FuelPro logo, "Cloud Sync / Secure Authentication / Real-Time Updates / Multi-Station / Admin Control" feature cards)
- ✅ Sign-Up flow: name + email + password + confirm → creates user in localStorage and signs in
- ✅ Post-signup onboarding screen: "Welcome to FuelPro" with Quick Start / Create New Station / Access Shared Station + Trial banner
- ✅ Founder Access route, Password Reset route, Invite Accept route all wired
- ✅ All 70+ feature components from the original ship are bundled and reachable (Sales Tracking, Inventory, Payroll, Invoices, M-PESA Analyzer, Fuel Quality, Compliance, AI Assistant, etc.)

## Tech Notes / Backlog
- tRPC client points at `/api/trpc` which is not currently served — purely-online features that depend on the Hono backend (multi-tenant cloud sync, server-side admin) will fall back to local storage. To re-enable: run the Hono backend in a side process and proxy `/api/*` from FastAPI, OR rewrite the routes in FastAPI.
- pdfjs-dist installed via `--ignore-engines` (Node 20 vs required 22+). PDF rendering may show warnings; PDF generation via `jspdf` is unaffected.
- The original Electron/Capacitor build outputs were stripped from `/app/frontend` to keep the repo lean (web app build is unaffected).
- `service worker /sw.js` is registered by `index.html`; offline caching active.

## Next Action Items
- [P1] If cloud sync / multi-device features are required → port `/app/frontend/api/*` (Hono+Drizzle) routes to FastAPI on :8001 against MongoDB, or run the Hono server as a side process behind FastAPI proxy
- [P2] Upgrade Node to ≥22 to remove the `--ignore-engines` flag for pdfjs-dist
- [P2] Wire a real password-reset email channel (currently writes code to console for demo) — SendGrid or Resend integration
- [P3] Add CI build (`yarn build`) sanity check
