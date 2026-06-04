import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/quality-tests/[id] - Get a single quality test
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const test = await db.qualityTest.findUnique({ where: { id } });
  if (!test || test.stationId !== stationId) {
    return errorResponse('Quality test not found', 404);
  }

  return successResponse(test);
}

// PUT /api/quality-tests/[id] - Update a quality test
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.qualityTest.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Quality test not found', 404);
    }

    const body = await request.json();
    const updated = await db.qualityTest.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        batchNo: body.batchNo ?? undefined,
        fuelType: body.fuelType ?? undefined,
        density: body.density ?? undefined,
        sulfur: body.sulfur ?? undefined,
        flashPoint: body.flashPoint ?? undefined,
        appearance: body.appearance ?? undefined,
        result: body.result ?? undefined,
        testedBy: body.testedBy ?? undefined,
        notes: body.notes ?? undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'quality_test',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[quality-tests] PUT error:', err);
    return errorResponse('Failed to update quality test', 500);
  }
}

// DELETE /api/quality-tests/[id] - Delete a quality test
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.qualityTest.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('Quality test not found', 404);
    }

    await db.qualityTest.delete({ where: { id } });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'delete',
      resourceType: 'quality_test',
      resourceId: id,
      snapshotBefore: existing,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error('[quality-tests] DELETE error:', err);
    return errorResponse('Failed to delete quality test', 500);
  }
}
