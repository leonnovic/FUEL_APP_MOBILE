import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  getSession,
  getStationId,
  getUserStationIds,
  getPaginationParams,
  paginatedResponse,
  createAuditLog,
  errorResponse,
  successResponse,
  getIpAddress,
  getUserAgent,
} from '@/lib/api-helpers';

// GET /api/stations - List stations the user is bound to
export async function GET(request: NextRequest) {
  const sessionResult = await getSession(request);
  if (sessionResult.error) return sessionResult.error;
  const { user } = sessionResult;

  try {
    const stationIds = await getUserStationIds(user.userId);

    const stations = await db.station.findMany({
      where: { id: { in: stationIds } },
      orderBy: { createdAt: 'desc' },
    });

    const { page, pageSize, skip, take } = getPaginationParams(request);
    const total = stations.length;
    const paginatedStations = stations.slice(skip, skip + take);

    return paginatedResponse(paginatedStations, total, page, pageSize);
  } catch (err) {
    console.error('[stations] GET error:', err);
    return errorResponse('Failed to fetch stations', 500);
  }
}

// POST /api/stations - Create station and auto-bind the creator as "owner"
export async function POST(request: NextRequest) {
  const sessionResult = await getSession(request);
  if (sessionResult.error) return sessionResult.error;
  const { user } = sessionResult;

  const ipAddress = getIpAddress(request);
  const userAgentStr = getUserAgent(request);

  try {
    const body = await request.json();

    // Create the station
    const station = await db.station.create({
      data: {
        name: body.name ?? '',
        location: body.location ?? '',
        country: body.country ?? 'Kenya',
        currency: body.currency ?? 'KSH',
        ownerId: user.userId,
        isActive: body.isActive ?? true,
      },
    });

    // Auto-bind the creator as "owner"
    await db.stationBinding.create({
      data: {
        userId: user.userId,
        stationId: station.id,
        role: 'owner',
        active: true,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'station',
      resourceId: station.id,
      snapshotAfter: station,
      ipAddress,
      userAgent: userAgentStr,
      stationId: station.id,
    });

    return successResponse(station, 201);
  } catch (err) {
    console.error('[stations] POST error:', err);
    return errorResponse('Failed to create station', 500);
  }
}
