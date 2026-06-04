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

// GET /api/payment-methods - List payment methods for station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const countryCode = url.searchParams.get('countryCode');

  const where: Record<string, unknown> = { stationId };
  if (type) where.type = type;
  if (countryCode) where.countryCode = countryCode;

  const [methods, total] = await Promise.all([
    db.paymentMethod.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.paymentMethod.count({ where }),
  ]);

  return paginatedResponse(methods, total, page, pageSize);
}

// POST /api/payment-methods - Create a payment method
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();

    if (!body.type || !body.providerName) {
      return errorResponse('type and providerName are required', 400);
    }

    const method = await db.paymentMethod.create({
      data: {
        stationId,
        type: body.type,
        providerName: body.providerName,
        accountNumber: body.accountNumber ?? null,
        accountName: body.accountName ?? null,
        branchName: body.branchName ?? null,
        swiftCode: body.swiftCode ?? null,
        tillNumber: body.tillNumber ?? null,
        paybillNumber: body.paybillNumber ?? null,
        isActive: body.isActive ?? true,
        countryCode: body.countryCode ?? 'KE',
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'payment_method',
      resourceId: method.id,
      snapshotAfter: method,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(method, 201);
  } catch (err) {
    console.error('[payment-methods] POST error:', err);
    return errorResponse('Failed to create payment method', 500);
  }
}
