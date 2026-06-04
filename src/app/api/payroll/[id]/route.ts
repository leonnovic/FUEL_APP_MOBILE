import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/payroll/[id] - Get a single payroll record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const payroll = await db.payroll.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, role: true } },
    },
  });
  if (!payroll || payroll.stationId !== stationId) {
    return errorResponse('Payroll record not found', 404);
  }

  return successResponse(payroll);
}

// PUT /api/payroll/[id] - Update a payroll record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.payroll.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Payroll record not found', 404);
    }

    const body = await request.json();
    const updated = await db.payroll.update({
      where: { id },
      data: {
        payPeriodStart: body.payPeriodStart ? new Date(body.payPeriodStart) : undefined,
        payPeriodEnd: body.payPeriodEnd ? new Date(body.payPeriodEnd) : undefined,
        basicSalary: body.basicSalary ?? undefined,
        allowances: body.allowances ?? undefined,
        overtimeHours: body.overtimeHours ?? undefined,
        overtimeRate: body.overtimeRate ?? undefined,
        grossPay: body.grossPay ?? undefined,
        shaDeduction: body.shaDeduction ?? undefined,
        nssfDeduction: body.nssfDeduction ?? undefined,
        payeDeduction: body.payeDeduction ?? undefined,
        advanceDeduction: body.advanceDeduction ?? undefined,
        otherDeductions: body.otherDeductions ?? undefined,
        totalDeductions: body.totalDeductions ?? undefined,
        netPay: body.netPay ?? undefined,
        paymentMethod: body.paymentMethod ?? undefined,
        paymentReference: body.paymentReference ?? undefined,
        status: body.status ?? undefined,
        paidAt: body.paidAt ? new Date(body.paidAt) : body.paidAt === null ? null : undefined,
      },
      include: {
        employee: { select: { id: true, name: true, role: true } },
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'payroll',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[payroll] PUT error:', err);
    return errorResponse('Failed to update payroll record', 500);
  }
}

// DELETE /api/payroll/[id] - Delete a payroll record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.payroll.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Payroll record not found', 404);
    }

    await db.payroll.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'payroll',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[payroll] DELETE error:', err);
    return errorResponse('Failed to delete payroll record', 500);
  }
}
