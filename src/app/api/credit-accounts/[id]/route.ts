import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/credit-accounts/[id] - Get a single credit account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const account = await db.creditAccount.findUnique({ where: { id } });
  if (!account || account.stationId !== stationId) {
    return errorResponse('Credit account not found', 404);
  }

  return successResponse(account);
}

// PUT /api/credit-accounts/[id] - Update a credit account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.creditAccount.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Credit account not found', 404);
    }

    const body = await request.json();
    const updated = await db.creditAccount.update({
      where: { id },
      data: {
        customerName: body.customerName ?? undefined,
        contactPerson: body.contactPerson ?? undefined,
        phone: body.phone ?? undefined,
        email: body.email ?? undefined,
        kraPin: body.kraPin ?? undefined,
        creditLimit: body.creditLimit ?? undefined,
        balanceUsed: body.balanceUsed ?? undefined,
        paymentTermsDays: body.paymentTermsDays ?? undefined,
        bankName: body.bankName ?? undefined,
        bankAccount: body.bankAccount ?? undefined,
        mpesaTill: body.mpesaTill ?? undefined,
        status: body.status ?? undefined,
        notes: body.notes ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'credit_account',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[credit-accounts] PUT error:', err);
    return errorResponse('Failed to update credit account', 500);
  }
}

// DELETE /api/credit-accounts/[id] - Delete a credit account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.creditAccount.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Credit account not found', 404);
    }

    await db.creditAccount.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'credit_account',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[credit-accounts] DELETE error:', err);
    return errorResponse('Failed to delete credit account', 500);
  }
}
