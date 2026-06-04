import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/sms-campaigns/[id] - Get a single SMS campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { stationId } = auth;

  const campaign = await db.smsCampaign.findUnique({ where: { id } });
  if (!campaign || campaign.stationId !== stationId) {
    return errorResponse('SMS campaign not found', 404);
  }

  return successResponse(campaign);
}

// PUT /api/sms-campaigns/[id] - Update an SMS campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const existing = await db.smsCampaign.findUnique({ where: { id } });
    if (!existing || existing.stationId !== stationId) {
      return errorResponse('SMS campaign not found', 404);
    }

    const body = await request.json();
    const updated = await db.smsCampaign.update({
      where: { id },
      data: {
        type: body.type ?? undefined,
        recipient: body.recipient ?? undefined,
        subject: body.subject ?? undefined,
        content: body.content ?? undefined,
        status: body.status ?? undefined,
        providerRef: body.providerRef ?? undefined,
        sentAt: body.sentAt ? new Date(body.sentAt) : body.sentAt === null ? null : undefined,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'update',
      resourceType: 'sms_campaign',
      resourceId: id,
      snapshotBefore: existing,
      snapshotAfter: updated,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(updated);
  } catch (err) {
    console.error('[sms-campaigns] PUT error:', err);
    return errorResponse('Failed to update SMS campaign', 500);
  }
}
