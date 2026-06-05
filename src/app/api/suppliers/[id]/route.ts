import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/suppliers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier || supplier.stationId !== stationId) {
    return errorResponse('Supplier not found', 404);
  }

  return successResponse(supplier);
}

// PUT /api/suppliers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Supplier not found', 404);
    }

    const body = await request.json();
    const updated = await db.supplier.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        phone: body.phone ?? undefined,
        email: body.email ?? undefined,
        product: body.product ?? undefined,
        address: body.address ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'supplier',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[suppliers] PUT error:', err);
    return errorResponse('Failed to update supplier', 500);
  }
}

// DELETE /api/suppliers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Supplier not found', 404);
    }

    await db.supplier.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'supplier',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[suppliers] DELETE error:', err);
    return errorResponse('Failed to delete supplier', 500);
  }
}
