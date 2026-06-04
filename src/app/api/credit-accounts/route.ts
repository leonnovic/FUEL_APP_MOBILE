import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  getPaginationParams,
  paginatedResponse,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/credit-accounts - List credit accounts for station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  const where: Record<string, unknown> = { stationId };
  if (status) where.status = status;

  const [accounts, total] = await Promise.all([
    db.creditAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.creditAccount.count({ where }),
  ]);

  return paginatedResponse(accounts, total, page, pageSize);
}

// POST /api/credit-accounts - Create a credit account
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();

    if (!body.customerName) {
      return errorResponse('customerName is required', 400);
    }

    const account = await db.creditAccount.create({
      data: {
        stationId,
        customerName: body.customerName,
        contactPerson: body.contactPerson ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        kraPin: body.kraPin ?? null,
        creditLimit: body.creditLimit ?? 0,
        balanceUsed: body.balanceUsed ?? 0,
        paymentTermsDays: body.paymentTermsDays ?? 30,
        bankName: body.bankName ?? null,
        bankAccount: body.bankAccount ?? null,
        mpesaTill: body.mpesaTill ?? null,
        status: body.status ?? 'active',
        notes: body.notes ?? null,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'credit_account',
      resourceId: account.id,
      snapshotAfter: account,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(account, 201);
  } catch (err) {
    console.error('[credit-accounts] POST error:', err);
    return errorResponse('Failed to create credit account', 500);
  }
}
