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

// GET /api/sms-campaigns - List SMS campaigns for station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');

  const where: Record<string, unknown> = { stationId };
  if (type) where.type = type;
  if (status) where.status = status;

  const [campaigns, total] = await Promise.all([
    db.smsCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.smsCampaign.count({ where }),
  ]);

  return paginatedResponse(campaigns, total, page, pageSize);
}

// POST /api/sms-campaigns - Create an SMS campaign
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();

    if (!body.recipient || !body.content) {
      return errorResponse('recipient and content are required', 400);
    }

    const campaign = await db.smsCampaign.create({
      data: {
        stationId,
        type: body.type ?? 'sms',
        recipient: body.recipient,
        subject: body.subject ?? null,
        content: body.content,
        status: body.status ?? 'pending',
        providerRef: body.providerRef ?? null,
        sentAt: body.sentAt ? new Date(body.sentAt) : null,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'sms_campaign',
      resourceId: campaign.id,
      snapshotAfter: campaign,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(campaign, 201);
  } catch (err) {
    console.error('[sms-campaigns] POST error:', err);
    return errorResponse('Failed to create SMS campaign', 500);
  }
}
