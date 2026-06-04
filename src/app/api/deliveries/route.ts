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

// GET /api/deliveries - List all deliveries for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [deliveries, total] = await Promise.all([
    db.delivery.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.delivery.count({ where: { stationId } }),
  ]);

  return paginatedResponse(deliveries, total, page, pageSize);
}

// POST /api/deliveries - Create a new delivery
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const delivery = await db.delivery.create({
      data: {
        stationId,
        date: body.date ? new Date(body.date) : new Date(),
        supplier: body.supplier ?? '',
        product: body.product ?? '',
        quantity: body.quantity ?? 0,
        unitPrice: body.unitPrice ?? 0,
        totalAmount: body.totalAmount ?? 0,
        balanceDue: body.balanceDue ?? 0,
        invoiceNumber: body.invoiceNumber,
        driverName: body.driverName,
        vehicleNumber: body.vehicleNumber,
        status: body.status ?? 'pending',
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'delivery',
      resourceId: delivery.id,
      snapshotAfter: delivery,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(delivery, 201);
  } catch (err) {
    console.error('[deliveries] POST error:', err);
    return errorResponse('Failed to create delivery', 500);
  }
}
