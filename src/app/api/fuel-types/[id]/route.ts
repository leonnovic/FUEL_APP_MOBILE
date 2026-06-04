import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/fuel-types/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const fuelType = await db.fuelType.findUnique({ where: { id } });
  if (!fuelType || fuelType.stationId !== stationId) {
    return errorResponse('Fuel type not found', 404);
  }

  return successResponse(fuelType);
}

// PUT /api/fuel-types/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.fuelType.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Fuel type not found', 404);
    }

    const body = await request.json();
    const updated = await db.fuelType.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        category: body.category ?? undefined,
        price: body.price ?? undefined,
        tankCapacity: body.tankCapacity ?? undefined,
        currentLevel: body.currentLevel ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'fuel-type',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[fuel-types] PUT error:', err);
    return errorResponse('Failed to update fuel type', 500);
  }
}

// DELETE /api/fuel-types/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.fuelType.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Fuel type not found', 404);
    }

    await db.fuelType.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'fuel-type',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[fuel-types] DELETE error:', err);
    return errorResponse('Failed to delete fuel type', 500);
  }
}
