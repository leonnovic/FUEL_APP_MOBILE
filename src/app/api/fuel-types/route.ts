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

// GET /api/fuel-types - List all fuel types for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [fuelTypes, total] = await Promise.all([
    db.fuelType.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.fuelType.count({ where: { stationId } }),
  ]);

  return paginatedResponse(fuelTypes, total, page, pageSize);
}

// POST /api/fuel-types - Create a new fuel type
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const fuelType = await db.fuelType.create({
      data: {
        stationId,
        name: body.name ?? '',
        category: body.category ?? 'fuel',
        price: body.price ?? 0,
        tankCapacity: body.tankCapacity ?? 0,
        currentLevel: body.currentLevel ?? 0,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'fuel-type',
      resourceId: fuelType.id,
      snapshotAfter: fuelType,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(fuelType, 201);
  } catch (err) {
    console.error('[fuel-types] POST error:', err);
    return errorResponse('Failed to create fuel type', 500);
  }
}
