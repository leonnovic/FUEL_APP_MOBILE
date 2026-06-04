# Task 5-a: Create API Route Files

## Agent: api-routes-developer

## Summary
Created all 5 API route files plus a shared audit helper utility for the FuelPro application.

## Files Created

### 1. `/src/lib/audit.ts` - Shared Audit & Session Utilities
- `createAuditLog()` - Reusable SOC-2 compliant audit log helper that:
  - Computes SHA-256 hash of critical fields for integrity verification
  - Chains to previous log entry via `previousLogHash` for tamper evidence
  - Accepts all AuditLogSoc2 fields as input
- `getClientIp()` - Extracts client IP from x-forwarded-for or x-real-ip headers
- `getUserAgent()` - Extracts user agent from request headers
- `validateSession()` - Validates Bearer token from Authorization header, loads user with permissions and stations, cleans up expired sessions

### 2. `/src/app/api/auth/login/route.ts` - POST handler
- Accepts { email, password }
- Finds user by email (case-insensitive, trimmed)
- Checks user.isActive status
- Verifies password with bcrypt.compare()
- Creates Session with crypto.randomUUID() token, 24h expiry
- Updates user.lastLogin
- Returns user with permissions and assignedStations (joined with Station table)
- Logs login action to AuditLogSoc2
- Returns 401 on invalid credentials, 403 on deactivated account

### 3. `/src/app/api/auth/register/route.ts` - POST handler
- Accepts { email, name, password, phone? }
- Validates required fields, email format, password length (min 6)
- Checks for duplicate email (returns 409)
- Hashes password with bcrypt (10 rounds)
- Creates User with role "staff", tier "free"
- Creates 3 default permissions for staff role:
  - read sale (personal scope)
  - read inventory (personal scope)  
  - create sale (personal scope)
- Creates Session with token
- Logs "create" action for "user" resource to AuditLogSoc2
- Returns 201 with user and token

### 4. `/src/app/api/auth/session/route.ts` - GET handler
- Reads Authorization header: "Bearer <token>"
- Uses shared validateSession() helper
- Returns user with permissions and assignedStations
- Returns 401 on invalid/expired session

### 5. `/src/app/api/auth/logout/route.ts` - POST handler
- Validates session via Authorization header
- Logs logout action to AuditLogSoc2 before deleting session
- Deletes the session record
- Returns { success: true }

### 6. `/src/app/api/version/route.ts` - GET handler
- Returns latest active AppVersion record (ordered by createdAt desc)
- Returns 404 if no active version found
- Enables frontend-backend version sync

## Dependencies Installed
- `bcryptjs@3.0.3` (with `@types/bcryptjs@3.0.0`)

## Lint Results
- Zero errors, all checks pass

## Dev Server
- Running successfully on port 3000
