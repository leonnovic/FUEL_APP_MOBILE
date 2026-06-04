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

// GET /api/clients - List all clients for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.client.count({ where: { stationId } }),
  ]);

  return paginatedResponse(clients, total, page, pageSize);
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const client = await db.client.create({
      data: {
        stationId,
        name: body.name ?? '',
        phone: body.phone,
        email: body.email,
        address: body.address,
        creditLimit: body.creditLimit ?? 0,
        balanceDue: body.balanceDue ?? 0,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'client',
      resourceId: client.id,
      snapshotAfter: client,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(client, 201);
  } catch (err) {
    console.error('[clients] POST error:', err);
    return errorResponse('Failed to create client', 500);
  }
}
