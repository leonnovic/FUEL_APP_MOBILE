import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/payment-methods/[id] - Get a single payment method
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const method = await db.paymentMethod.findUnique({ where: { id } });
  if (!method || method.stationId !== stationId) {
    return errorResponse('Payment method not found', 404);
  }

  return successResponse(method);
}

// PUT /api/payment-methods/[id] - Update a payment method
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.paymentMethod.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Payment method not found', 404);
    }

    const body = await request.json();
    const updated = await db.paymentMethod.update({
      where: { id },
      data: {
        type: body.type ?? undefined,
        providerName: body.providerName ?? undefined,
        accountNumber: body.accountNumber ?? undefined,
        accountName: body.accountName ?? undefined,
        branchName: body.branchName ?? undefined,
        swiftCode: body.swiftCode ?? undefined,
        tillNumber: body.tillNumber ?? undefined,
        paybillNumber: body.paybillNumber ?? undefined,
        isActive: body.isActive ?? undefined,
        countryCode: body.countryCode ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'payment_method',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[payment-methods] PUT error:', err);
    return errorResponse('Failed to update payment method', 500);
  }
}

// DELETE /api/payment-methods/[id] - Delete a payment method
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.paymentMethod.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Payment method not found', 404);
    }

    await db.paymentMethod.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'payment_method',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[payment-methods] DELETE error:', err);
    return errorResponse('Failed to delete payment method', 500);
  }
}
