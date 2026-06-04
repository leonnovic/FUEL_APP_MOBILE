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

// GET /api/documents - List all documents for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [documents, total] = await Promise.all([
    db.document.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.document.count({ where: { stationId } }),
  ]);

  return paginatedResponse(documents, total, page, pageSize);
}

// POST /api/documents - Create a new document
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const document = await db.document.create({
      data: {
        stationId,
        name: body.name ?? '',
        type: body.type ?? 'receipt',
        category: body.category,
        size: body.size ?? 0,
        url: body.url ?? '',
        uploadedBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'document',
      resourceId: document.id,
      snapshotAfter: document,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(document, 201);
  } catch (err) {
    console.error('[documents] POST error:', err);
    return errorResponse('Failed to create document', 500);
  }
}
