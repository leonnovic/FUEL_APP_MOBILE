import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/shifts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const shift = await db.shift.findUnique({ where: { id } });
  if (!shift || shift.stationId !== stationId) {
    return errorResponse('Shift not found', 404);
  }

  return successResponse(shift);
}

// PUT /api/shifts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.shift.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Shift not found', 404);
    }

    const body = await request.json();
    const updated = await db.shift.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        attendantName: body.attendantName ?? undefined,
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        pmsOpening: body.pmsOpening ?? undefined,
        pmsClosing: body.pmsClosing ?? undefined,
        agoOpening: body.agoOpening ?? undefined,
        agoClosing: body.agoClosing ?? undefined,
        totalSales: body.totalSales ?? undefined,
        cashDeclared: body.cashDeclared ?? undefined,
        variance: body.variance ?? undefined,
        status: body.status ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'shift',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[shifts] PUT error:', err);
    return errorResponse('Failed to update shift', 500);
  }
}

// DELETE /api/shifts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.shift.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Shift not found', 404);
    }

    await db.shift.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'shift',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[shifts] DELETE error:', err);
    return errorResponse('Failed to delete shift', 500);
  }
}
