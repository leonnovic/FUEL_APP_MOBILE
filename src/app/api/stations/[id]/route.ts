import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  getSession,
  verifyStationAccess,
  createAuditLog,
  errorResponse,
  successResponse,
  getIpAddress,
  getUserAgent,
} from '@/lib/api-helpers';

// GET /api/stations/[id] - Get a single station (user must be bound to it)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionResult = await getSession(request);
  if (sessionResult.error) return sessionResult.error;
  const { user } = sessionResult;
  const { id } = await params;

  const hasAccess = await verifyStationAccess(user.userId, id);
  if (!hasAccess) {
    return errorResponse('You do not have access to this station', 403);
  }

  const station = await db.station.findUnique({ where: { id } });
  if (!station) {
    return errorResponse('Station not found', 404);
  }

  return successResponse(station);
}

// PUT /api/stations/[id] - Update a station
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionResult = await getSession(request);
  if (sessionResult.error) return sessionResult.error;
  const { user } = sessionResult;
  const { id } = await params;

  const hasAccess = await verifyStationAccess(user.userId, id);
  if (!hasAccess) {
    return errorResponse('You do not have access to this station', 403);
  }

  const ipAddress = getIpAddress(request);
  const userAgentStr = getUserAgent(request);

  try {
    const existing = await db.station.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Station not found', 404);
    }

    const body = await request.json();
    const updated = await db.station.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        location: body.location ?? undefined,
        country: body.country ?? undefined,
        currency: body.currency ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'station',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent: userAgentStr,
      stationId: id,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[stations] PUT error:', err);
    return errorResponse('Failed to update station', 500);
  }
}

// DELETE /api/stations/[id] - Delete a station (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionResult = await getSession(request);
  if (sessionResult.error) return sessionResult.error;
  const { user } = sessionResult;
  const { id } = await params;

  const hasAccess = await verifyStationAccess(user.userId, id);
  if (!hasAccess) {
    return errorResponse('You do not have access to this station', 403);
  }

  // Only owner or founder can delete a station
  const binding = await db.stationBinding.findUnique({
    where: { userId_stationId: { userId: user.userId, stationId: id } },
  });
  if (!binding || (binding.role !== 'owner' && user.role !== 'founder')) {
    return errorResponse('Only the station owner or founder can delete a station', 403);
  }

  const ipAddress = getIpAddress(request);
  const userAgentStr = getUserAgent(request);

  try {
    const existing = await db.station.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Station not found', 404);
    }

    await db.station.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'station',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent: userAgentStr,
      stationId: id,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[stations] DELETE error:', err);
    return errorResponse('Failed to delete station', 500);
  }
}
