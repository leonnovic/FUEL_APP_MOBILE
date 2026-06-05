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

// GET /api/maintenance - List all maintenance records for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [maintenance, total] = await Promise.all([
    db.maintenance.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.maintenance.count({ where: { stationId } }),
  ]);

  return paginatedResponse(maintenance, total, page, pageSize);
}

// POST /api/maintenance - Create a new maintenance record
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const maintenance = await db.maintenance.create({
      data: {
        stationId,
        equipment: body.equipment ?? '',
        description: body.description,
        status: body.status ?? 'scheduled',
        priority: body.priority ?? 'medium',
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
        completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
        cost: body.cost ?? 0,
        assignedTo: body.assignedTo,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'maintenance',
      resourceId: maintenance.id,
      snapshotAfter: maintenance,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(maintenance, 201);
  } catch (err) {
    console.error('[maintenance] POST error:', err);
    return errorResponse('Failed to create maintenance record', 500);
  }
}
