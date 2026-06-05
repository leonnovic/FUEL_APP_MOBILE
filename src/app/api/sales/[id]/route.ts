import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/sales/[id] - Get a single sale
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const sale = await db.sale.findUnique({ where: { id } });
  if (!sale || sale.stationId !== stationId) {
    return errorResponse('Sale not found', 404);
  }

  return successResponse(sale);
}

// PUT /api/sales/[id] - Update a sale
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.sale.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Sale not found', 404);
    }

    const body = await request.json();
    const updated = await db.sale.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        pmsOpeningReading: body.pmsOpeningReading ?? undefined,
        pmsClosingReading: body.pmsClosingReading ?? undefined,
        agoOpeningReading: body.agoOpeningReading ?? undefined,
        agoClosingReading: body.agoClosingReading ?? undefined,
        pmsPrice: body.pmsPrice ?? undefined,
        agoPrice: body.agoPrice ?? undefined,
        pmsSalesKsh: body.pmsSalesKsh ?? undefined,
        agoSalesKsh: body.agoSalesKsh ?? undefined,
        pmsSalesL: body.pmsSalesL ?? undefined,
        agoSalesL: body.agoSalesL ?? undefined,
        totalSales: body.totalSales ?? undefined,
        expenses: body.expenses ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'sale',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[sales] PUT error:', err);
    return errorResponse('Failed to update sale', 500);
  }
}

// DELETE /api/sales/[id] - Delete a sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.sale.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Sale not found', 404);
    }

    await db.sale.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'sale',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[sales] DELETE error:', err);
    return errorResponse('Failed to delete sale', 500);
  }
}
