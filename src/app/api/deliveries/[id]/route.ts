import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/deliveries/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const delivery = await db.delivery.findUnique({ where: { id } });
  if (!delivery || delivery.stationId !== stationId) {
    return errorResponse('Delivery not found', 404);
  }

  return successResponse(delivery);
}

// PUT /api/deliveries/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.delivery.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Delivery not found', 404);
    }

    const body = await request.json();
    const updated = await db.delivery.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        supplier: body.supplier ?? undefined,
        product: body.product ?? undefined,
        quantity: body.quantity ?? undefined,
        unitPrice: body.unitPrice ?? undefined,
        totalAmount: body.totalAmount ?? undefined,
        balanceDue: body.balanceDue ?? undefined,
        invoiceNumber: body.invoiceNumber ?? undefined,
        driverName: body.driverName ?? undefined,
        vehicleNumber: body.vehicleNumber ?? undefined,
        status: body.status ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'delivery',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[deliveries] PUT error:', err);
    return errorResponse('Failed to update delivery', 500);
  }
}

// DELETE /api/deliveries/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.delivery.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Delivery not found', 404);
    }

    await db.delivery.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'delivery',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[deliveries] DELETE error:', err);
    return errorResponse('Failed to delete delivery', 500);
  }
}
