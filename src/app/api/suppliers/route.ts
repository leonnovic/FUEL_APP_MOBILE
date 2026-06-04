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

// GET /api/suppliers - List all suppliers for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [suppliers, total] = await Promise.all([
    db.supplier.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.supplier.count({ where: { stationId } }),
  ]);

  return paginatedResponse(suppliers, total, page, pageSize);
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const supplier = await db.supplier.create({
      data: {
        stationId,
        name: body.name ?? '',
        phone: body.phone,
        email: body.email,
        product: body.product,
        address: body.address,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'supplier',
      resourceId: supplier.id,
      snapshotAfter: supplier,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(supplier, 201);
  } catch (err) {
    console.error('[suppliers] POST error:', err);
    return errorResponse('Failed to create supplier', 500);
  }
}
