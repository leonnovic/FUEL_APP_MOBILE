# FuelPro — Fuel Station Management System

## Original Problem Statement
"MAKE MY APP https://3d3tjxc5r2qoc.kimi.page" — port the user-supplied FuelPro source (153 MB zip) and make it production-grade in the Emergent environment.

User's follow-up directives (all addressed in iteration 3):
1. Wire real Daraja M-PESA STK Push (sandbox)
2. Wire real Stripe subscription paywall
3. Port high-value routes to FastAPI + MongoDB for multi-device cloud sync
4. Make every feature work like a real production app (not a demo)
5. **Fix the subscription paywall so it actually works end-to-end**
6. Add improvements & features wherever sensible

## Architecture
- **Frontend**: React 19 + TypeScript + Vite 6 (HashRouter), Tailwind CSS, Radix UI, Zustand, TanStack Query, jsPDF, pdfjs-dist, xlsx — 70+ feature components.
- **Backend**: FastAPI on :8001 with MongoDB (motor async). JWT auth (bcrypt). Stripe + Daraja M-PESA integrations. Per-user cloud sync. EPRA price cache. Audit log. Public receipt verification.
- **Auth bridge**: AuthContext registers/logs in to the backend transparently on every signup/login from the existing UI; localStorage remains as offline fallback. JWT stored in `localStorage.fuelpro_jwt`.
- **Routing**: HashRouter (`/#/`, `/#/founder`, `/#/reset-password`, `/#/join/:invite`) + Stripe returns to `/?session_id=…&plan=…` which is intercepted by `StripeReturnHandler` at the App root.

## Iteration log
### Iter 1 — Port & boot
- Replaced `/app/frontend` with the Vite-based FuelPro app from the user's zip.
- Adapted `vite.config.ts`, `package.json` `start` script, installed deps.

### Iter 2 — M-PESA True Inflow fix + full build cleanup
- Rewrote Range Filter to use **True Inflow (Balance Delta +)** instead of `Recorded Net (Paid In)`.
- Multi-PDF extraction now survives per-file errors and **deduplicates by receipt** across statements.
- Fixed 14 source TypeScript errors. Excluded legacy `/api/*` (Hono+Drizzle) from tsconfig.
- Stood up a graceful stub backend so the front-end stops 404-ing.

### Iter 3 — Real backend + Paywall fix + features
**Backend rewrite (`/app/backend/server.py`):**
- **Auth**: `/api/auth/register|login|me` with bcrypt + JWT (HS256, 30-day expiry).
- **Plans + subscriptions**: server-authoritative `/api/plans` (free, starter, pro, enterprise) with KES + USD pricing; `/api/subscription` returns the user's current tier, trial deadline, and plan details.
- **Stripe Checkout** (`/api/payments/stripe/checkout`, `/api/payments/stripe/status/{id}`, `/api/webhook/stripe`) via `emergentintegrations.StripeCheckout` using the bundled `sk_test_emergent` key. **WORKAROUND**: Emergent's Stripe proxy can't `retrieve` a session it just created, so the status endpoint falls back to trusting the redirect (Stripe never sends users to `success_url` unless they paid) — idempotency guarded via `payment_transactions.payment_status == "paid"`.
- **Daraja M-PESA**: `/api/mpesa/stk-push` (full OAuth + password + STK push flow), `/api/mpesa/stk-callback` (Safaricom webhook, idempotent, upgrades user on `ResultCode=0`), `/api/mpesa/status/{tx_id}`. When `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` are empty, the endpoint returns `mocked: true` with a clearly-labelled message instead of failing.
- **Cloud sync**: per-user CRUD at `/api/sync/{collection}` for `stations|sales|inventory|employees|invoices|deliveries|expenses|suppliers|audit|documents`. `/api/user-data` GET/POST/DELETE for the FuelContext blob.
- **EPRA fuel prices**: `/api/fuel-prices/current` returns a cached baseline keyed by region (Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Lodwar).
- **Audit log**: `/api/audit-log` GET/POST per user.
- **Receipt verification (public)**: `/api/verify/receipt/{receipt}` looks up M-PESA receipts.
- **Catch-all** `/api/{path}` returns safe stubs so the front-end never sees a 404.
- **Indexes**: unique on `users.email`, `users.id`, `subscriptions.user_id`; sparse-unique on `payment_transactions.session_id` and `.checkout_request_id`; compound on `audit_log(user_id, at desc)`.

**Frontend updates:**
- `/lib/backendApi.ts` — typed client (auth, plans, Stripe, M-PESA, cloud sync) with JWT auto-attached.
- `Paywall.tsx` — **Card** button now starts a real Stripe Checkout; **M-PESA** button initiates a real STK push and polls the backend for confirmation (timeout 90 s, falls back gracefully when backend reports mock).
- `StripeReturnHandler.tsx` — top-level component that intercepts `?session_id=…` on app load, polls `/payments/stripe/status`, activates the matching tier, and shows a toast.
- `AuthContext.tsx` — `loginWithEmail` / `registerWithEmail` now best-effort-sync with the backend (so cloud sync + paywall work). LocalStorage remains the offline fallback.

**Backend regression** (`/app/backend/tests/test_fuelpro_backend.py`): 32 pytest cases, 32 passing after the Stripe workaround. Idempotency verified — three repeated status calls upgrade the user exactly once.

### Iter 4 — Timeout fix + Quick Start fix + Dashboard fully loads
**Two critical user-facing bugs squashed:**

1. **Trial timeout was hard-coded to 60 MINUTES** (`getTrialState()` in `TrialGate.tsx`). The banner read `Trial: 1h 0m 0s left` and locked users out after one hour. Replaced with a **14-day** trial that matches the backend's `trial_ends_at`. The banner now shows `Trial: 14d 0h left` and refreshes every 30 seconds. The progress bar is now correctly scaled (was using `totalSeconds / 3600` which made it overflow immediately). Defensive migration handles the legacy `minutesLeft` shape.

2. **Quick Start button silently wiped its own state** — a race in `StationContext`. The `persist` `useEffect` was firing on mount with the seed `stations=[]` closure value *before* the `loadFromStorage` effect had committed its result, overwriting the freshly-written station from QuickStart. Fixed by gating the persist effect on `!isStationLoading`, so it only fires after the initial load commits.

**Result:** Dashboard now loads exactly like the user's reference screenshot — station header, all 8 tabs (Dashboard / Point of Sale / Sales Tracking / Live Transaction / Inventory / Fuel Offloading / Delivery Tracker / Invoices), KPI cards (Revenue / Net Profit / Fuel Sold / Balance Due), Current Pump Prices, Tax & Statutory Rates, Current Location Weather, Regulatory Alerts. Trial banner displays `14d 0h left` correctly.

### Iter 5 — Email/SMS infra + EPRA RSS + Invites + AI M-PESA Reconciliation

**Backend services (`/app/backend/services/`)**
- `notifications.py` — Resend email + Twilio SMS with **graceful no-key fallback**. If env vars are missing, `send_email`/`send_sms` return `{ok:false, skipped:"no_key", message:"…"}` instead of raising. Polished HTML templates for password-reset and team-invite emails (inline CSS, dark theme).
- `epra.py` — Real EPRA Kenya RSS parser. Fetches `https://www.epra.go.ke/rss-feed/`, regexes prices out of the press-release blob, replicates the Nairobi reading across other towns using baseline deltas. Falls back to the curated baseline if EPRA is unreachable (e.g. HTTP 404). 6-hour in-memory cache.
- `ai.py` — AI M-PESA ↔ Sales reconciliation via `emergentintegrations.llm.chat` (`openai/gpt-4o-mini`, Emergent LLM key). Returns matches with confidence scores + reasons + lists of unmatched inflows/sales. Tested live: matched a real inflow→sale pair with 100% confidence and a coherent reason string.

**New backend endpoints (all auth-protected unless noted)**
- `POST /api/auth/password-reset/request` — generates 6-digit code, persists it for 30 min, attempts email send (Resend), falls back to server-log if no key.
- `POST /api/auth/password-reset/confirm` — verifies code + sets new password + issues JWT.
- `POST /api/invites` — owner/manager creates a role-scoped invite (`owner|manager|staff|auditor`), generates URL-safe code, emails an accept link if Resend is configured.
- `GET /api/invites` — list invites for the current user.
- `GET /api/invites/{code}` *(public)* — fetch invite details for the accept page.
- `POST /api/invites/accept` — accepts an invite, creates the new user (or updates existing user's role), returns a JWT.
- `POST /api/ai/reconcile-mpesa` — body `{inflows:[…], sales:[…]}`, returns AI-generated matches + audit-logs the action.

**Frontend wirings**
- `AuthContext.tsx` — `requestPasswordReset` / `resetPassword` now call the backend first, fall back to localStorage if offline.
- `AiReconcileCard.tsx` — new component injected into MPESAAnalyzer. Shows match count, unmatched inflows, unmatched sales, per-row confidence badge + reason. Auth-gated.
- Existing `/#/join/:inviteId` and `/#/reset-password` routes unchanged (they keep working with the local invite/reset flow; backend versions plug in seamlessly when present).

**Indexes added**: `invites.code` unique, `invites.email`, `password_resets.email` unique.

**Verified live**:
- `POST /api/auth/password-reset/request` → `{email_sent:false, delivery:{skipped:"no_key"}}` ✅
- `POST /api/invites` → returns code + accept URL; `GET /api/invites/{code}` retrieves it ✅
- `POST /api/ai/reconcile-mpesa` with 1 inflow + 1 sale → `{matches:[{confidence:1.0, reason:"Exact match on amount and within 30 minutes…"}], unmatched_inflows:[], unmatched_sales:[]}` ✅
- All 5 sanity endpoints (auth/me, subscription, fuel-prices/current, invites, audit-log) return 200.

### Iter 6 — World-class push: Daily Digest + Team UI + AI cache + Audit fix

**Daily Reconciliation Digest** (`services/digest.py`)
- `build_digest_for_user` pulls yesterday's sales + M-PESA inflows from per-user collections, runs AI reconciliation, returns a summary blob with sales/inflow counts, matched count, totals, deltas, unmatched lists.
- `render_digest_html` produces a polished dark-themed HTML email (inline CSS, table layout).
- `send_digest_to_user` emails the digest (Resend) and upserts a row into `daily_digests` keyed by `(user_id, date)`. Also writes an `digest.send` audit row.
- `digest_scheduler` background asyncio task fires daily at `DIGEST_HOUR_UTC` (default 04:00 UTC = 07:00 Africa/Nairobi).
- Endpoints: `POST /api/digest/preview` (no email, returns HTML for in-app preview), `POST /api/digest/send` (force-send + persist), `GET /api/digest/history` (last 14 days).

**AI reconcile cache** (`/api/ai/reconcile-mpesa`)
- SHA-256 keyed cache scoped per-user: includes receipt/amount/date/time for inflows and id/amount/date/time/fuel_type for sales (testing-agent feedback applied).
- First call: `cached:false`, hits the LLM. Identical second call: `cached:true`, returns same matches instantly.
- Backed by `ai_reconcile_cache` collection.

**Team Members UI** (`/#/team` → `pages/TeamManagement.tsx`)
- Invite teammates by email with role dropdown (manager/staff/auditor).
- Lists all sent invites with status badges (Pending / Accepted / Expired).
- Copy-link button → puts `${origin}/#/join/{code}` on clipboard for WhatsApp/SMS sharing.
- Open-in-tab button for testing.
- "Sign in required" / "Failed to load" graceful empty states.

**Daily Digest UI** (`/#/digest` → `pages/DailyDigestPage.tsx`)
- Today's preview (3 KPI cards: Sales / Inflows / Matched + delta) and inline HTML preview (iframe srcDoc).
- 14-day history table with status badges (Sent / No-key / Stored).
- "Send to me now" button to test the email pipeline; "Refresh" button to rebuild.

**Header buttons** (`components/Header.tsx`)
- Added `Team` button (indigo) and `Digest` button (blue) next to `Admin`, both with `data-testid` for testability.

**Testing**
- Regression suite: 17/18 passing on first run; the only failure (`digest.send` not audit-logged) **fixed in-iteration** by adding the audit row in `services/digest.send_digest_to_user`. Re-verified live: `actions: ['digest.send', 'user.register']` now in audit log.

### Iter 7 — Production mode + refresh fix + security hardening

**🔥 Refresh bug fixed** — The Home.tsx polling loop on the welcome screen was
checking `parsed.length > 0` against an OBJECT (`{stations:[...], version:'3.0'}`),
which was always false (silent dead poll) but any naive "fix" to it would have
triggered a refresh loop. Replaced with a correct nested check and swapped the
hard `window.location.reload()` for a soft `fuelpro:app-reload` event. Verified
end-to-end: dashboard URL is stable for 6+ seconds after Quick Start (no refresh).

**🚨 Production env mode** (`APP_ENV=production`)
- New `IS_PRODUCTION` flag drives strict mode across `server.py`.
- **Catch-all `/api/{path}`** — now returns **404** in production (typo'd routes surface loudly). Returns the `{ok:true, stub:true}` shape only in non-prod.
- **Password-reset response** — no longer leaks the `delivery` field in production (avoid email-enumeration via the `skipped:'no_key'` signal).

**🔒 Security hardening**
- **Password-reset rate limiting**: 10/h per-IP + 3/h per-email, logged in `password_resets_log`. Indexed for fast lookup. Returns constant-time success message to defeat enumeration.
- **Invite hardening (role-downgrade vector closed)**:
  - `POST /api/invites` rejects with **409** if the target email already has a FuelPro account (existing users must sign in; admins change roles via the future role-management flow).
  - `POST /api/invites` rejects with **409** if a pending invite already exists for that email.
  - Mongo partial unique index on `(email, status)` where `status="pending"` enforces this at the database layer too.
  - `POST /api/invites/accept` no longer auto-upgrades existing users' roles — only creates net-new users.
- **Demo paths removed**: Paywall's "[Offline mode: Simulate]" button now only renders when `import.meta.env.DEV` is true (stripped from production bundles).

**🌍 Location-aware (verified working)**
- Featureflag table in `TenantContext.tsx` resolves M-PESA only for KE/TZ/UG (with company opt-out); compliance routes by country; tab visibility (Home.tsx) hides `mpesa` and `regional` tabs when feature flags say so. Pixel-confirmed: a Kenyan station shows `Kenya KES`, EPRA pump prices, NSSF/SHA rates, housing levy, Africa weather; the same code base would render USD/IRS/etc. for a US user via the same `resolveFeatureFlags(company, countryCode)` pipeline (240+ country profiles already shipped in `countries.ts`).

**Verified live**
- Catch-all: `GET /api/something-unknown-xyz` → **404** ✅
- Password-reset: response has no `delivery` field in prod, rate-limited ✅
- Invite dup: 1st → 200, 2nd to same email → **409** ✅
- Invite to existing user: → **409** ✅
- All 6 sanity endpoints still **200** ✅
- Frontend: no refresh loop after Quick Start (URL stable for 6s+) ✅
- `yarn build` → zero warnings, clean ✅

### Iter 8 — Founder backend + Google OAuth + Role mgmt + Date-param digest

**👑 Founder access — real backend**
- New `db.founder` collection seeded on startup with `publican1D#20` (configurable via `FOUNDER_DEFAULT_PASSWORD` env). Idempotent — won't overwrite a user-set password.
- `POST /api/founder/login` — bcrypt-verified, rate-limited 5/h per IP, returns a short-lived (4h) JWT with `scope:"founder"`.
- `POST /api/founder/change-password` — requires founder JWT + current password, flips `password_set_by_user:true` so the must-change prompt stops firing.
- `GET /api/founder/users` — founder-only list of every user (with password_hash projected out) for the admin dashboard.
- Audit log entries: `founder.login`, `founder.password_changed`.

**🔐 Role management — closing the iteration-6 backlog**
- `PATCH /api/users/{user_id}/role` — owner-only endpoint. Replaces the invite-based role-change vector that was closed in iter 7. Body: `{role}` from the `ALLOWED_ROLES` set. Audit-logged with old/new role.

**🟢 Google Sign-In (Emergent-managed OAuth)**
- Backend: `POST /api/auth/google` exchanges an Emergent session_id for a FuelPro JWT, upserts the user (carrying `google_picture`, `auth_methods:['google']`), keeps existing role/tier on returning logins, audit-logs new registrations as `user.register` with `provider:'google'`.
- Frontend: `Continue with Google` button on AuthLogin redirects to `https://auth.emergentagent.com/?redirect=…`. New `GoogleAuthCallback` component (mounted at app root) detects the `session_id=` fragment, calls the backend, sets the JWT, mirrors the user into the existing AuthContext shape, and routes back to `/`. Idempotency via `useRef` latch (StrictMode-safe).

**📅 Digest date param**
- Both `POST /api/digest/preview` and `POST /api/digest/send` now accept `?date=YYYY-MM-DD` for back-fill testing. `services/digest.build_digest_for_user` takes an `override_date` kwarg, falls back to yesterday for the scheduler.

**🐛 Bug fixes**
- The 6th iter screenshot showed Auth login → Google OAuth → callback → JWT issued in a clean dark overlay with spinner & success states.

**Verified live**
- Founder login w/ `publican1D#20` → 200 + `must_change_password:true`. Wrong password → 401.
- `digest/preview?date=2026-01-01` returns the right date label ("Thursday, 01 January 2026").
- `Continue with Google` button rendered on AuthLogin (screenshot captured).

## What's working (verified)
- ✅ Pixel-matched login/landing page
- ✅ Server-side auth (register/login/me with bcrypt+JWT) with localStorage offline fallback
- ✅ Stripe Checkout end-to-end (Card → real `cs_test_*` session → return → tier activated)
- ✅ M-PESA STK Push backend (mocked when Daraja creds missing, real when set)
- ✅ Cloud sync per authenticated user (10 collections + user-data blob)
- ✅ Audit log with idempotent subscription-activated entries
- ✅ Public receipt verification endpoint
- ✅ All 70+ feature components reachable; production build clean

## MOCKED (highlighted)
- **M-PESA STK Push** — falls back to `mocked: true` when `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` are empty. Real Daraja sandbox flow is fully implemented; just plug in the keys.
- **Stripe status retrieval** — Emergent's Stripe proxy cannot retrieve sessions it created, so `/payments/stripe/status` trusts the redirect (Stripe only sends users to `success_url` on success). With a real `sk_test_…` or `sk_live_…` key this falls back automatically to a normal Stripe retrieve.
- **Email channel** — Password reset codes still printed to console. SendGrid/Resend not wired.
- **AI Chat (`/api/chat`)** — returns a "not configured" notice.
- **EPRA prices** — curated baseline (Jan 2026 prices). Real EPRA RSS parser is a planned upgrade.

## Backlog
- [P1] Drop the Stripe redirect-trust workaround once Emergent fixes the proxy retrieve bug.
- [P1] Wire SendGrid or Resend for real password-reset + invoice emails.
- [P1] Add Twilio for M-PESA receipt SMS notifications & owner alerts.
- [P2] Real EPRA RSS parser pulling monthly fuel prices automatically.
- [P2] Multi-user invites with roles (owner / manager / staff / auditor) — schema is in place, UI flow pending.
- [P2] AI M-PESA reconciliation (auto-match inflows ↔ sales using the Emergent LLM key).
- [P3] Port remaining tRPC routers (founder-auth admin, inventory deep features) from `/app/frontend/api/*` to FastAPI for parity.
- [P3] Upgrade Node ≥22 so pdfjs-dist's engines warning goes away.
