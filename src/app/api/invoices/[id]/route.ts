import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/invoices/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.stationId !== stationId) {
    return errorResponse('Invoice not found', 404);
  }

  return successResponse(invoice);
}

// PUT /api/invoices/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Invoice not found', 404);
    }

    const body = await request.json();
    const updated = await db.invoice.update({
      where: { id },
      data: {
        clientName: body.clientName ?? undefined,
        clientPhone: body.clientPhone ?? undefined,
        items: body.items ?? undefined,
        totalAmount: body.totalAmount ?? undefined,
        status: body.status ?? undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'invoice',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[invoices] PUT error:', err);
    return errorResponse('Failed to update invoice', 500);
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Invoice not found', 404);
    }

    await db.invoice.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'invoice',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[invoices] DELETE error:', err);
    return errorResponse('Failed to delete invoice', 500);
  }
}
