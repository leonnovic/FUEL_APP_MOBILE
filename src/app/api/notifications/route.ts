import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, getUserStationIds, errorResponse } from '@/lib/api-helpers';

// GET /api/notifications - Get recent activity as notifications (sourced from audit logs)
export async function GET(req: NextRequest) {
  try {
    const sessionResult = await getSession(req);
    if (sessionResult.error) return sessionResult.error;
    const { user } = sessionResult;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    // Data isolation: scope to user's stations
    const where: Record<string, unknown> = {};
    if (user.role !== 'founder') {
      const stationIds = await getUserStationIds(user.userId);
      where.stationId = { in: stationIds };
    }

    const logs = await db.auditLogSoc2.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        userEmail: true,
        stationId: true,
        createdAt: true,
      },
    });

    // Transform audit logs into notification format
    const notifications = logs.map((log) => {
      const actionLabel = log.action === 'create' ? 'created' : log.action === 'update' ? 'updated' : log.action === 'delete' ? 'deleted' : log.action;
      return {
        id: log.id,
        type: log.action === 'delete' ? 'alert' : log.action === 'create' ? 'success' : 'info',
        title: `${log.resourceType} ${actionLabel}`,
        description: `${log.userEmail} ${actionLabel} a ${log.resourceType}${log.resourceId ? ` (${log.resourceId.substring(0, 8)}...)` : ''}`,
        timestamp: log.createdAt,
        unread: false,
        tabId: mapResourceToTab(log.resourceType),
      };
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('[notifications] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

function mapResourceToTab(resourceType: string): string {
  const mapping: Record<string, string> = {
    sale: 'sales',
    delivery: 'delivery',
    invoice: 'invoice',
    expense: 'expenses',
    employee: 'team',
    shift: 'shifts',
    maintenance: 'maintenance',
    station: 'dashboard',
    settings: 'settings',
    user: 'team',
    document: 'documents',
    fuel_type: 'fuel-types',
    supplier: 'suppliers',
    client: 'customers',
    quality_test: 'quality',
    payroll: 'payroll',
    credit_account: 'credit',
  };
  return mapping[resourceType] ?? 'dashboard';
}
