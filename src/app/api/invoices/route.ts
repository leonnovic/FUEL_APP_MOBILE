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

// GET /api/invoices - List all invoices for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.invoice.count({ where: { stationId } }),
  ]);

  return paginatedResponse(invoices, total, page, pageSize);
}

// POST /api/invoices - Create a new invoice
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();

    // Generate invoice number if not provided
    const invoiceNumber =
      body.invoiceNumber ||
      `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const invoice = await db.invoice.create({
      data: {
        stationId,
        clientName: body.clientName ?? '',
        clientPhone: body.clientPhone,
        items: body.items ?? '[]',
        totalAmount: body.totalAmount ?? 0,
        status: body.status ?? 'pending',
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        invoiceNumber,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'invoice',
      resourceId: invoice.id,
      snapshotAfter: invoice,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(invoice, 201);
  } catch (err) {
    console.error('[invoices] POST error:', err);
    return errorResponse('Failed to create invoice', 500);
  }
}
