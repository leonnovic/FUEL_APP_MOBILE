import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/expenses/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense || expense.stationId !== stationId) {
    return errorResponse('Expense not found', 404);
  }

  return successResponse(expense);
}

// PUT /api/expenses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Expense not found', 404);
    }

    const body = await request.json();
    const updated = await db.expense.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        category: body.category ?? undefined,
        description: body.description ?? undefined,
        amount: body.amount ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'expense',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[expenses] PUT error:', err);
    return errorResponse('Failed to update expense', 500);
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Expense not found', 404);
    }

    await db.expense.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'expense',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[expenses] DELETE error:', err);
    return errorResponse('Failed to delete expense', 500);
  }
}
