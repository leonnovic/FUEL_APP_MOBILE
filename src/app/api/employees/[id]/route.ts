import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/employees/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const employee = await db.employee.findUnique({ where: { id } });
  if (!employee || employee.stationId !== stationId) {
    return errorResponse('Employee not found', 404);
  }

  return successResponse(employee);
}

// PUT /api/employees/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Employee not found', 404);
    }

    const body = await request.json();
    const updated = await db.employee.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        phone: body.phone ?? undefined,
        role: body.role ?? undefined,
        salary: body.salary ?? undefined,
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
        status: body.status ?? undefined,
        nationalId: body.nationalId ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'employee',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[employees] PUT error:', err);
    return errorResponse('Failed to update employee', 500);
  }
}

// DELETE /api/employees/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Employee not found', 404);
    }

    await db.employee.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'employee',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[employees] DELETE error:', err);
    return errorResponse('Failed to delete employee', 500);
  }
}
