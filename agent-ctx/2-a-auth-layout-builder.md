---
Task ID: 2-a
Agent: auth-layout-builder
Task: Create Auth/Login screen and Layout components

Work Log:
- Read previous work (Task 1): Prisma schema, TypeScript types, 3 Zustand stores (auth, fuel, station) already created
- Reviewed existing UI components: Card, Button, Input, Label, Tabs, Dialog, Sheet, DropdownMenu, Avatar, ScrollArea, Badge, Select, Separator
- Created 5 new component files:

1. **src/components/auth/login-screen.tsx** - Dark gradient login screen
   - Dark gradient background (slate-900 via indigo-900 to slate-900)
   - Animated background particles using framer-motion
   - FuelPro branding with fuel icon + "Professional Fuel Management" tagline
   - 5 feature cards: Cloud Sync, Secure Auth, Real-Time, Multi-Station, Admin Control (with emoji-style lucide icons)
   - Module tags: Fuel Monitoring, Invoice System, M-PESA Analytics, Payroll System
   - Sign In card with:
     - "Continue instantly — start in 1 second" green button (demo login bypass)
     - Email/Username tab toggle with animated transitions
     - Email input with icon, Password input with show/hide toggle
     - Forgot Password link
     - Amber "Sign In" button
     - "New to FuelPro? Create an account" link
     - "Founder Access" button
   - Register dialog with name, email, phone, password fields
   - Founder Access dialog with access code input
   - Footer trust badges: Secure · Encrypted · Any Device
   - Uses useAuthStore and useStationStore, accepts onLogin callback

2. **src/components/layout/header.tsx** - Main header component
   - Dark themed header with amber/gold accents
   - FuelPro logo (Fuel icon + text)
   - Station selector dropdown (shows current station, allows switching)
   - User avatar/name dropdown with profile, stations, settings, sign out
   - Notification bell with indicator dot
   - Theme toggle (light/dark)
   - Quick search button
   - Mobile hamburger menu opening a Sheet with user info and navigation

3. **src/components/layout/tab-navigation.tsx** - Desktop horizontal tab navigation
   - 31 tabs: Dashboard, Sales, POS, Delivery, Offloading, Invoice, Debt, Reports, M-PESA, Payroll, Data, News, Live, Fuel Sales, Communication, Inventory, Customers, Audit, Shifts, Quality, Credit, Analytics, Integration, Regional, Fuel Types, Team, Documents, Suppliers, Maintenance, Expenses, Price Board
   - Active tab has amber bottom border
   - Horizontally scrollable with ScrollArea
   - Auto-scrolls to active tab
   - Compact tab style with small icons

4. **src/components/layout/mobile-bottom-nav.tsx** - Mobile bottom navigation
   - 5 main icons: Dashboard, Sales, POS, Reports, More
   - "More" opens a bottom Sheet with 4-column grid of all other tabs
   - Active tab highlighted in amber
   - Safe area padding for iOS (env(safe-area-inset-bottom))
   - Hidden on desktop (md:hidden)

5. **src/components/layout/setup-wizard.tsx** - Multi-step setup wizard
   - Step 1: Station Name & Location (with country/currency)
   - Step 2: Fuel Types & Pricing (PMS and AGO with prices and tank capacity)
   - Step 3: Add Pumps (visual pump layout grid)
   - Step 4: Company Details (name, phone, email, address)
   - Step 5: Complete - success animation with checkmark
   - Progress bar and step indicators
   - Uses useFuelStore and useStationStore to save data
   - Framer-motion transitions between steps

- Updated src/app/page.tsx to integrate all components:
  - Derived view state (login/setup/app) from auth and station store state
  - Login → Setup (if no stations) → App flow
  - Fixed lint issues: removed setState-in-effect patterns, unused imports

- All components pass lint cleanly
- Dev server running and compiling successfully

Stage Summary:
- 5 new component files created with full functionality
- Login screen with demo mode, registration, founder access dialogs
- Header with station selector, user menu, theme toggle, mobile support
- Desktop tab navigation with 31 scrollable tabs
- Mobile bottom nav with "More" sheet
- Setup wizard with 5 steps saving to stores
- page.tsx updated with proper view routing logic
- All lint-clean, dev server operational
