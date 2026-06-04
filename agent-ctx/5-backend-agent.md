# Task 5 - Backend Agent: Prisma Models + API Routes for M-Pesa, Debt, Pump, Company

## Summary
Successfully added 4 new Prisma models and 7 API route files for M-Pesa Analyzer, Debt Tracking, Pump Management, and Company Profile.

## Files Modified
- `prisma/schema.prisma` - Added MpesaTransaction, Debt, Pump, CompanyProfile models + Station reverse relations

## Files Created
- `src/app/api/mpesa/route.ts` - GET (list with filters), POST (simulated STK Push)
- `src/app/api/mpesa/[id]/route.ts` - PUT (update status/receipt), DELETE
- `src/app/api/debts/route.ts` - GET (list with filters), POST (create debt)
- `src/app/api/debts/[id]/route.ts` - PUT (partial payment auto-tracking), DELETE
- `src/app/api/pumps/route.ts` - GET (list with filters), POST (create pump)
- `src/app/api/pumps/[id]/route.ts` - PUT (auto-calculate sales, reset), DELETE
- `src/app/api/company/route.ts` - GET (auto-create default), PUT (update profile)

## Key Implementation Details
- M-Pesa POST auto-generates receipt numbers (QKR + 7 random chars), sets status "success" immediately
- Debt PUT supports partial payments with automatic status transitions (pending → partial → paid)
- Pump PUT auto-calculates salesKsh and salesLiters from reading differentials; supports reset flag
- Company GET creates default "FuelPro" profile if none exists
- All routes follow existing pattern: db import, NextResponse.json, try/catch, console.error, ok/error response format

## Verification
- `bun run db:push` succeeded
- `bun run lint` passes clean (0 errors, 2 pre-existing warnings)
