import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/maintenance/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const maintenance = await db.maintenance.findUnique({ where: { id } });
  if (!maintenance || maintenance.stationId !== stationId) {
    return errorResponse('Maintenance record not found', 404);
  }

  return successResponse(maintenance);
}

// PUT /api/maintenance/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.maintenance.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Maintenance record not found', 404);
    }

    const body = await request.json();
    const updated = await db.maintenance.update({
      where: { id },
      data: {
        equipment: body.equipment ?? undefined,
        description: body.description ?? undefined,
        status: body.status ?? undefined,
        priority: body.priority ?? undefined,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
        completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
        cost: body.cost ?? undefined,
        assignedTo: body.assignedTo ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'maintenance',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[maintenance] PUT error:', err);
    return errorResponse('Failed to update maintenance record', 500);
  }
}

// DELETE /api/maintenance/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.maintenance.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Maintenance record not found', 404);
    }

    await db.maintenance.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'maintenance',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[maintenance] DELETE error:', err);
    return errorResponse('Failed to delete maintenance record', 500);
  }
}
