# Task 12-a: Dashboard API, Login Screen Update, Demo Auth Route

## Work Summary

Completed all 3 tasks as specified:

### 1. Created `src/app/api/dashboard/route.ts`
- GET endpoint that returns aggregated dashboard data for a station
- Accepts `?stationId=xxx` or `X-Station-Id` header
- Requires Bearer token authentication via `authenticateAndAuthorize` helper
- Returns all aggregated fields: todaySales, weeklySales, monthlySales, todayTransactions, totalDeliveries, pendingDeliveries, pendingInvoices, overdueInvoices, activeEmployees, fuelLevels, recentSales, recentDeliveries, expenseBreakdown, salesTrend, stationInfo, pmsPrice, agoPrice
- Uses Prisma aggregation (`db.sale.aggregate`, `db.sale.count`, `db.delivery.count`, etc.) and `Promise.all` for parallel execution
- Date range calculations for today, last 7 days, last 30 days, and current month

### 2. Updated `src/components/auth/login-screen.tsx`
- Replaced the single "Continue instantly" + email/username sign-in form with TWO tabs: "Sign In" and "Register"
- **Sign In tab**: Email input with icon, Password input with show/hide toggle, "Forgot Password?" link, Sign In button with loading spinner, error message display
- **Register tab**: Full Name, Email, Phone (optional), Password with strength indicator, Confirm Password with match validation, Create Account button with loading spinner, error messages
- **Demo Mode button**: At the bottom with "Demo Mode — Try instantly" text, calls `/api/auth/demo` POST endpoint, shows success checkmark animation on success, falls back to local demo mode if API fails
- Kept all existing styling: dark theme, amber accents, gradient-border card, typewriter text, float animation on Fuel icon, stats counters, background particles, feature cards, module tags, footer trust badges
- Removed the old FounderDialog and RegisterDialog (replaced by tabs)
- Removed the email/username toggle (simplified to just email)
- Properly calls `authStore.login(email, password)` with separate string arguments matching the store's signature

### 3. Created `src/app/api/auth/demo/route.ts`
- POST endpoint that creates a demo user with pre-populated data
- Creates demo user (email: demo@fuelpro.app, password: demo123, role: owner, tier: pro)
- Creates demo station (FuelPro Demo Station, Nairobi, Kenya)
- Creates StationBinding for the demo user (owner role)
- Creates 24 default owner permissions (RBAC matrix entries)
- Creates sample FuelType records (PMS: 212.36, AGO: 199.47, DPK: 178.20)
- Creates 7 sample sale records for the last 7 days with realistic data
- Creates a session with 7-day expiry and returns user + token
- If demo user already exists, just logs them in (creates new session)
- Logs to AuditLogSoc2 (action: "login", resourceType: "user") via `createAuditLog` helper

### Lint Results
- `bun run lint` passes with zero errors
