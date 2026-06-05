import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/settings - Get all settings for station (optionally filtered by category)
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;

  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    const where: Record<string, unknown> = { stationId };
    if (category) where.category = category;

    const settings = await db.appSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Group by category for convenience
    const grouped = settings.reduce<Record<string, Record<string, string>>>((acc, setting) => {
      if (!acc[setting.category]) acc[setting.category] = {};
      acc[setting.category][setting.key] = setting.value;
      return acc;
    }, {});

    return successResponse({ settings, grouped });
  } catch (err) {
    console.error('[settings] GET error:', err);
    return errorResponse('Failed to fetch settings', 500);
  }
}

// POST /api/settings - Upsert setting (create or update)
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();

    if (!body.category || !body.key || body.value === undefined) {
      return errorResponse('category, key, and value are required', 400);
    }

    // Upsert: create if not exists, update if exists
    const setting = await db.appSetting.upsert({
      where: {
        stationId_category_key: {
          stationId,
          category: body.category,
          key: body.key,
        },
      },
      create: {
        stationId,
        category: body.category,
        key: body.key,
        value: typeof body.value === 'string' ? body.value : JSON.stringify(body.value),
        updatedBy: user.userId,
      },
      update: {
        value: typeof body.value === 'string' ? body.value : JSON.stringify(body.value),
        updatedBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'upsert',
      resourceType: 'app_setting',
      resourceId: setting.id,
      snapshotAfter: setting,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(setting, 201);
  } catch (err) {
    console.error('[settings] POST error:', err);
    return errorResponse('Failed to upsert setting', 500);
  }
}
