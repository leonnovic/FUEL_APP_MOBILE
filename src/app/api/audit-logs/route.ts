import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  getSession,
  getStationId,
  getPaginationParams,
  paginatedResponse,
  errorResponse,
} from '@/lib/api-helpers';

// Audit logs are immutable - SOC-2 compliance
// Only users with "auditor", "founder", or "owner" role can access
// Supports filtering by: userId, action, resourceType, stationId, startDate, endDate

const ALLOWED_ROLES = ['auditor', 'founder', 'owner'];

// GET /api/audit-logs - List audit logs with filtering
export async function GET(request: NextRequest) {
  const sessionResult = await getSession(request);
  if (sessionResult.error) return sessionResult.error;
  const { user } = sessionResult;

  // Role check - only auditor, founder, or owner can access
  if (!ALLOWED_ROLES.includes(user.role)) {
    return errorResponse('Access denied. Only auditors, founders, or owners can view audit logs.', 403);
  }

  const url = new URL(request.url);
  const { page, pageSize, skip, take } = getPaginationParams(request);

  // Build filter conditions
  const where: Record<string, string | object | undefined> = {};

  // Filter by stationId if provided
  const stationId = getStationId(request) || url.searchParams.get('stationId');
  if (stationId) {
    where.stationId = stationId;
  }

  // Filter by userId
  const filterUserId = url.searchParams.get('userId');
  if (filterUserId) {
    where.userId = filterUserId;
  }

  // Filter by action
  const filterAction = url.searchParams.get('action');
  if (filterAction) {
    where.action = filterAction;
  }

  // Filter by resourceType
  const filterResourceType = url.searchParams.get('resourceType');
  if (filterResourceType) {
    where.resourceType = filterResourceType;
  }

  // Filter by date range
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  if (startDate || endDate) {
    const tsFilter: Record<string, Date> = {};
    if (startDate) tsFilter.gte = new Date(startDate);
    if (endDate) tsFilter.lte = new Date(endDate);
    where.timestamp = tsFilter;
  }

  try {
    const [logs, total] = await Promise.all([
      db.auditLogSoc2.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      db.auditLogSoc2.count({ where }),
    ]);

    return paginatedResponse(logs, total, page, pageSize);
  } catch (err) {
    console.error('[audit-logs] GET error:', err);
    return errorResponse('Failed to fetch audit logs', 500);
  }
}

// No POST, PUT, or DELETE - SOC-2 audit logs are immutable
