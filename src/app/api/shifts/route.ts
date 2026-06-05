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

// GET /api/shifts - List all shifts for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [shifts, total] = await Promise.all([
    db.shift.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.shift.count({ where: { stationId } }),
  ]);

  return paginatedResponse(shifts, total, page, pageSize);
}

// POST /api/shifts - Create a new shift
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const shift = await db.shift.create({
      data: {
        stationId,
        date: body.date ? new Date(body.date) : new Date(),
        attendantName: body.attendantName ?? '',
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        pmsOpening: body.pmsOpening ?? 0,
        pmsClosing: body.pmsClosing ?? 0,
        agoOpening: body.agoOpening ?? 0,
        agoClosing: body.agoClosing ?? 0,
        totalSales: body.totalSales ?? 0,
        cashDeclared: body.cashDeclared ?? 0,
        variance: body.variance ?? 0,
        status: body.status ?? 'open',
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'shift',
      resourceId: shift.id,
      snapshotAfter: shift,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(shift, 201);
  } catch (err) {
    console.error('[shifts] POST error:', err);
    return errorResponse('Failed to create shift', 500);
  }
}
