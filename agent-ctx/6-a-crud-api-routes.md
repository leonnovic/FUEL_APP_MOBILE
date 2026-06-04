# Task 6-a: CRUD API Routes

## Task
Create CRUD API route files for ALL entities with authentication, data isolation, audit logging, and pagination.

## Work Completed

### 1. Shared API Helper (`src/lib/api-helpers.ts`)
Created a comprehensive shared helper module with:
- `getSession(request)` - Extracts and validates Bearer token from Authorization header, looks up Session in DB, verifies expiration and user active status
- `getStationId(request)` - Extracts stationId from query params or X-Station-Id header
- `verifyStationAccess(userId, stationId)` - Checks StationBinding for active access
- `getUserStationIds(userId)` - Returns all station IDs a user has active bindings to
- `createAuditLog(data)` - Creates AuditLogSoc2 records with SHA-256 integrity hash (userId+action+resourceType+timestamp)
- `errorResponse(message, status)` - Standardized error JSON response
- `successResponse(data, status)` - Standardized success JSON response
- `paginatedResponse(data, total, page, pageSize)` - Returns { data, total, page, pageSize, totalPages }
- `getPaginationParams(request)` - Parses ?page=1&pageSize=20 from URL
- `getIpAddress(request)` / `getUserAgent(request)` - Extract request metadata
- `authenticateAndAuthorize(request)` - Combined auth + station access check (used by most routes)

### 2. CRUD Routes Created (25 route files total)

**List + Create routes** (GET list, POST create):
| Entity | Path |
|--------|------|
| sales | `/api/sales/route.ts` |
| deliveries | `/api/deliveries/route.ts` |
| invoices | `/api/invoices/route.ts` |
| clients | `/api/clients/route.ts` |
| employees | `/api/employees/route.ts` |
| expenses | `/api/expenses/route.ts` |
| shifts | `/api/shifts/route.ts` |
| fuel-types | `/api/fuel-types/route.ts` |
| suppliers | `/api/suppliers/route.ts` |
| maintenance | `/api/maintenance/route.ts` |
| stations | `/api/stations/route.ts` |
| documents | `/api/documents/route.ts` |
| audit-logs | `/api/audit-logs/route.ts` (GET only) |

**Individual record routes** (GET, PUT, DELETE):
| Entity | Path |
|--------|------|
| sales | `/api/sales/[id]/route.ts` |
| deliveries | `/api/deliveries/[id]/route.ts` |
| invoices | `/api/invoices/[id]/route.ts` |
| clients | `/api/clients/[id]/route.ts` |
| employees | `/api/employees/[id]/route.ts` |
| expenses | `/api/expenses/[id]/route.ts` |
| shifts | `/api/shifts/[id]/route.ts` |
| fuel-types | `/api/fuel-types/[id]/route.ts` |
| suppliers | `/api/suppliers/[id]/route.ts` |
| maintenance | `/api/maintenance/[id]/route.ts` |
| stations | `/api/stations/[id]/route.ts` |
| documents | `/api/documents/[id]/route.ts` |

### 3. Key Implementation Details

**Data Isolation**: Every query filters by `stationId`. The `authenticateAndAuthorize` helper enforces that users provide a stationId and have an active StationBinding for it.

**Auth Check**: All routes verify Bearer token → Session lookup → expiration check → user active check → station access verification.

**Audit Logging**: Every mutation (POST/PUT/DELETE) creates an AuditLogSoc2 record with:
- userId, userEmail, userRole from session
- action (create/update/delete), resourceType, resourceId
- snapshotBefore (for update/delete), snapshotAfter (for create/update)
- ipAddress from x-forwarded-for, userAgent
- stationId
- logHash: SHA-256 hash for integrity

**Pagination**: GET list endpoints support `?page=1&pageSize=20` and return `{ data, total, page, pageSize, totalPages }`.

**Special Routes**:
- **audit-logs**: GET only, immutable (SOC-2). Only accessible by users with "auditor", "founder", or "owner" role. Supports filtering by userId, action, resourceType, stationId, startDate, endDate.
- **stations**: GET returns only stations user is bound to. POST auto-creates a StationBinding with role "owner" for the creator. DELETE restricted to station owner or founder role.

### 4. Lint Results
- Zero errors, zero warnings after fix
- Fixed: Removed unused eslint-disable directive in audit-logs route

### 5. Verification
- `bun run lint` passes with zero errors
- `bun run db:push` confirms database is in sync
- API endpoints respond correctly (401 for missing auth as expected)
- Dev server running successfully on port 3000
