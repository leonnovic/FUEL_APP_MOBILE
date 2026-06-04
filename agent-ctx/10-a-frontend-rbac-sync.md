# Task 10-a: RBAC, Real API Data, Cross-Device Sync, Remove Hardcoded Data

## Task ID: 10-a
## Agent: frontend-rbac-sync

## Summary

Updated the frontend to support RBAC, real API data, cross-device sync, and removed hardcoded data patterns. All 6 subtasks completed with zero lint errors.

## Work Completed

### Task 1: Updated `src/types/fuel.ts`
- Changed `UserRole` from `'owner' | 'manager' | 'staff'` to `'founder' | 'owner' | 'manager' | 'staff' | 'auditor' | 'guest'`
- Added `UserTier` type: `'free' | 'pro' | 'enterprise'`
- Updated `UserPublic` interface with new RBAC fields: `tier`, `permissions`, `assignedStations`, `token`
- Added RBAC types: `ActionType`, `DataType`, `TeamScope`, `UserRoleExtended`
- Added interfaces: `Permission`, `Team`, `TeamMember`, `Session`, `UserPublicExtended`
- Added SOC-2 Audit Log type: `AuditLogSoc2`
- Added `AppVersion` interface

### Task 2: Replaced `src/store/auth-store.ts`
- Added `token` and `lastSyncAt` to auth state
- Login/register now extract permissions, assignedStations, tier from API response
- Added `validateSession()` method that calls `/api/auth/session`
- On rehydration (via `onRehydrateStorage`), automatically validates session
- If session expired, clears auth state
- Added `logout()` that calls server-side logout endpoint
- Implemented `can(action, dataType, stationId?)` RBAC method with:
  - Founder: global admin (always true)
  - Guest: only read on station/inventory
  - Explicit permission checking with teamScope resolution
  - Fallback role-based permissions for owner/manager/staff/auditor
- Implemented `hasStationAccess(stationId)` method
- Added `apiCall` helper for authenticated requests

### Task 3: Created `src/components/auth/PermissionGate.tsx`
- `PermissionGate` component that conditionally renders children based on RBAC
- Accepts `action`, `dataType`, `stationId`, `fallback`, `children` props
- 8 convenience components: `CanCreateSale`, `CanEditSale`, `CanDeleteInventory`, `CanViewAuditLogs`, `CanApprove`, `CanExport`, `CanManageUsers`, `CanManageStation`

### Task 4: Updated `src/store/fuel-store.ts`
- Added sync state fields: `isSyncing`, `lastSyncAt`, `syncError`
- Added `syncFromServer(stationId)` - fetches all entity data from API in parallel, server wins for conflicts
- Added `syncSaleToServer(sale)` - creates or updates a sale via API
- Added `syncDeliveryToServer(delivery)` - creates or updates a delivery via API
- Added `syncToServer()` - syncs all pending sales and deliveries
- All existing local state management preserved

### Task 5: Created `src/hooks/use-api-sync.ts`
- `useApiSync` hook for cross-device data synchronization
- On mount: syncs data from server for current station
- Polls every 30 seconds for updates
- Handles station and auth state changes
- Returns `isSyncing`, `syncError`, `lastSyncAt` for UI feedback

### Task 6: Created `src/lib/api-client.ts`
- Centralized `ApiClient` class with auth token and station ID headers
- Auto-attaches `Authorization: Bearer` and `X-Station-Id` headers
- Handles 401 (auto-logout) and 403 (permission denied) responses
- CRUD methods: `get`, `post`, `put`, `delete`
- Typed entity methods for all resources: sales, deliveries, clients, invoices, employees, expenses, shifts, fuel types, suppliers, maintenance
- Dashboard stats and audit log endpoints
- Auth endpoints: login, register, validateSession, logout
- Exported as singleton `api`

## Lint Results
- `bun run lint` passes with zero errors
