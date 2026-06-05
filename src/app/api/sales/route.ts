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

// GET /api/sales - List all sales for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [sales, total] = await Promise.all([
    db.sale.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.sale.count({ where: { stationId } }),
  ]);

  return paginatedResponse(sales, total, page, pageSize);
}

// POST /api/sales - Create a new sale
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const sale = await db.sale.create({
      data: {
        stationId,
        date: body.date ? new Date(body.date) : new Date(),
        pmsOpeningReading: body.pmsOpeningReading ?? 0,
        pmsClosingReading: body.pmsClosingReading ?? 0,
        agoOpeningReading: body.agoOpeningReading ?? 0,
        agoClosingReading: body.agoClosingReading ?? 0,
        pmsPrice: body.pmsPrice ?? 0,
        agoPrice: body.agoPrice ?? 0,
        pmsSalesKsh: body.pmsSalesKsh ?? 0,
        agoSalesKsh: body.agoSalesKsh ?? 0,
        pmsSalesL: body.pmsSalesL ?? 0,
        agoSalesL: body.agoSalesL ?? 0,
        totalSales: body.totalSales ?? 0,
        expenses: body.expenses ?? 0,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'sale',
      resourceId: sale.id,
      snapshotAfter: sale,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(sale, 201);
  } catch (err) {
    console.error('[sales] POST error:', err);
    return errorResponse('Failed to create sale', 500);
  }
}
