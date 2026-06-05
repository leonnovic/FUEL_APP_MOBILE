import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/clients/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const client = await db.client.findUnique({ where: { id } });
  if (!client || client.stationId !== stationId) {
    return errorResponse('Client not found', 404);
  }

  return successResponse(client);
}

// PUT /api/clients/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.client.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Client not found', 404);
    }

    const body = await request.json();
    const updated = await db.client.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        phone: body.phone ?? undefined,
        email: body.email ?? undefined,
        address: body.address ?? undefined,
        creditLimit: body.creditLimit ?? undefined,
        balanceDue: body.balanceDue ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'client',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[clients] PUT error:', err);
    return errorResponse('Failed to update client', 500);
  }
}

// DELETE /api/clients/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.client.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Client not found', 404);
    }

    await db.client.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'client',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[clients] DELETE error:', err);
    return errorResponse('Failed to delete client', 500);
  }
}
