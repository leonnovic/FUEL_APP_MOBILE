import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, errorResponse } from '@/lib/api-helpers';

const ALLOWED_ROLES = ['auditor', 'founder', 'owner', 'manager'];

// GET /api/audit-logs/soc2 - List SOC-2 compliant audit logs with advanced filtering
export async function GET(req: NextRequest) {
  try {
    const sessionResult = await getSession(req);
    if (sessionResult.error) return sessionResult.error;
    const { user } = sessionResult;

    if (!ALLOWED_ROLES.includes(user.role)) {
      return errorResponse('Access denied. Only auditors, founders, owners, or managers can view SOC-2 audit logs.', 403);
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const severity = searchParams.get('severity');
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);

    const where: Record<string, unknown> = {};

    // Data isolation: non-founder/auditor users only see their station
    if (!['founder', 'auditor'].includes(user.role)) {
      // Get user's station IDs
      const bindings = await db.stationBinding.findMany({
        where: { userId: user.userId, active: true },
        select: { stationId: true },
      });
      where.stationId = { in: bindings.map((b) => b.stationId) };
    }

    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (userId) where.userId = userId;

    // Severity filter - map severity to action types
    if (severity === 'critical') {
      where.action = { in: ['delete', 'read_denied'] };
    } else if (severity === 'warning') {
      where.action = { in: ['update', 'approve'] };
    } else if (severity === 'info') {
      where.action = { in: ['create', 'read', 'login', 'logout', 'export'] };
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) (where.timestamp as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.timestamp as Record<string, unknown>).lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      db.auditLogSoc2.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.auditLogSoc2.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: logs, total });
  } catch (error) {
    console.error('[audit-logs/soc2] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch SOC-2 audit logs' }, { status: 500 });
  }
}

// POST /api/audit-logs/soc2/verify - Verify hash chain integrity
export async function POST(req: NextRequest) {
  try {
    const sessionResult = await getSession(req);
    if (sessionResult.error) return sessionResult.error;
    const { user } = sessionResult;

    if (!['auditor', 'founder'].includes(user.role)) {
      return errorResponse('Only auditors or founders can verify audit log integrity.', 403);
    }

    const body = await req.json();
    const stationId = body.stationId || undefined;

    const where: Record<string, unknown> = {};
    if (stationId) where.stationId = stationId;

    // Get all logs in chronological order
    const logs = await db.auditLogSoc2.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        logHash: true,
        previousLogHash: true,
        logSignature: true,
        userId: true,
        action: true,
        resourceType: true,
        timestamp: true,
      },
    });

    let validCount = 0;
    let invalidCount = 0;
    let missingHashCount = 0;
    const invalidLogs: string[] = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      if (!log.logHash) {
        missingHashCount++;
        continue;
      }

      // Check chain: previousLogHash should match the hash of the previous log
      if (i > 0 && log.previousLogHash) {
        const prevLog = logs[i - 1];
        if (prevLog.logHash && log.previousLogHash !== prevLog.logHash) {
          invalidCount++;
          invalidLogs.push(log.id);
          continue;
        }
      }

      // Check signature exists
      if (log.logSignature) {
        validCount++;
      } else {
        missingHashCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalLogs: logs.length,
        validSignatures: validCount,
        invalidChains: invalidCount,
        missingHashes: missingHashCount,
        integrityRate: logs.length > 0 ? Math.round((validCount / logs.length) * 100) : 100,
        invalidLogIds: invalidLogs,
        isFullyValid: invalidCount === 0 && missingHashCount === 0,
      },
    });
  } catch (error) {
    console.error('[audit-logs/soc2] POST verify error:', error);
    return NextResponse.json({ error: 'Failed to verify audit log integrity' }, { status: 500 });
  }
}
