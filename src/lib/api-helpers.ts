import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  sessionId: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AuditLogInput {
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  snapshotBefore?: Record<string, unknown> | null;
  snapshotAfter?: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
  stationId: string;
}

// ─── Auth & Session ───────────────────────────────────────────────────────────

export async function getSession(request: NextRequest): Promise<{
  user: SessionUser;
  error?: never;
} | {
  user?: never;
  error: NextResponse;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        error: errorResponse('Missing or invalid Authorization header. Use: Bearer <token>', 401),
      };
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return {
        error: errorResponse('Empty auth token', 401),
      };
    }

    // Look up session by token
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return {
        error: errorResponse('Invalid session token', 401),
      };
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await db.session.delete({ where: { id: session.id } });
      return {
        error: errorResponse('Session expired. Please log in again.', 401),
      };
    }

    // Check if user is active
    if (!session.user.isActive) {
      return {
        error: errorResponse('User account is deactivated', 403),
      };
    }

    return {
      user: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        tier: session.user.tier,
        sessionId: session.id,
      },
    };
  } catch (err) {
    console.error('[api-helpers] getSession error:', err);
    return {
      error: errorResponse('Authentication failed', 500),
    };
  }
}

// ─── Station ID Extraction ────────────────────────────────────────────────────

export function getStationId(request: NextRequest): string | null {
  // Try query parameter first
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('stationId');
  if (fromQuery) return fromQuery;

  // Try header
  const fromHeader = request.headers.get('x-station-id');
  if (fromHeader) return fromHeader;

  return null;
}

// ─── Station Access Verification ──────────────────────────────────────────────

export async function verifyStationAccess(
  userId: string,
  stationId: string
): Promise<boolean> {
  try {
    const binding = await db.stationBinding.findUnique({
      where: {
        userId_stationId: { userId, stationId },
      },
    });
    return !!binding && binding.active;
  } catch (err) {
    console.error('[api-helpers] verifyStationAccess error:', err);
    return false;
  }
}

// ─── Get User's Assigned Stations ─────────────────────────────────────────────

export async function getUserStationIds(userId: string): Promise<string[]> {
  try {
    const bindings = await db.stationBinding.findMany({
      where: { userId, active: true },
      select: { stationId: true },
    });
    return bindings.map((b) => b.stationId);
  } catch (err) {
    console.error('[api-helpers] getUserStationIds error:', err);
    return [];
  }
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const hashInput = `${input.userId}${input.action}${input.resourceType}${timestamp}`;
    const logHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    await db.auditLogSoc2.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        userRole: input.userRole,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        snapshotBefore: input.snapshotBefore ? JSON.stringify(input.snapshotBefore) : null,
        snapshotAfter: input.snapshotAfter ? JSON.stringify(input.snapshotAfter) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        stationId: input.stationId,
        logHash,
      },
    });
  } catch (err) {
    console.error('[api-helpers] createAuditLog error:', err);
    // Don't throw - audit logging should not break the main operation
  }
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

export function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message, status }, { status });
}

export function successResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse {
  const totalPages = Math.ceil(total / pageSize);
  const result: PaginatedResponse<T> = {
    data,
    total,
    page,
    pageSize,
    totalPages,
  };
  return NextResponse.json(result);
}

// ─── Pagination Helpers ───────────────────────────────────────────────────────

export function getPaginationParams(request: NextRequest): {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
} {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20)
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

// ─── Request Info Helpers ─────────────────────────────────────────────────────

export function getIpAddress(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

// ─── Full Auth + Station Access Check ─────────────────────────────────────────

export async function authenticateAndAuthorize(
  request: NextRequest
): Promise<
  | { user: SessionUser; stationId: string; ipAddress: string; userAgent: string }
  | { error: NextResponse }
> {
  // 1. Authenticate
  const sessionResult = await getSession(request);
  if (sessionResult.error) {
    return { error: sessionResult.error };
  }
  const user = sessionResult.user;

  // 2. Get stationId
  const stationId = getStationId(request);
  if (!stationId) {
    return {
      error: errorResponse('stationId is required (query param or X-Station-Id header)', 400),
    };
  }

  // 3. Verify station access
  const hasAccess = await verifyStationAccess(user.userId, stationId);
  if (!hasAccess) {
    return {
      error: errorResponse('You do not have access to this station', 403),
    };
  }

  return {
    user,
    stationId,
    ipAddress: getIpAddress(request),
    userAgent: getUserAgent(request),
  };
}

// ─── Data Isolation Query Builder ─────────────────────────────────────────────

/**
 * Build a Prisma where clause that enforces data isolation.
 * Founders see all data; other roles are scoped to their assigned stations.
 */
export async function buildIsolatedWhere(
  user: SessionUser,
  additionalFilters?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Founders have global access
  if (user.role === 'founder') {
    return { ...additionalFilters };
  }

  const stationIds = await getUserStationIds(user.userId);

  // Also include stations owned by the user
  if (user.role === 'owner') {
    const ownedStations = await db.station.findMany({
      where: { ownerId: user.userId },
      select: { id: true },
    });
    const ownedIds = ownedStations.map((s) => s.id);
    const combined = [...new Set([...stationIds, ...ownedIds])];
    return { stationId: { in: combined }, ...additionalFilters };
  }

  return { stationId: { in: stationIds }, ...additionalFilters };
}

// ─── Enhanced Audit with Chain Hashing ────────────────────────────────────────

export async function createChainedAuditLog(input: AuditLogInput & { sessionId?: string; reason?: string }): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const hashPayload = [
      input.userId,
      input.userEmail,
      input.action,
      input.resourceType,
      input.resourceId || '',
      timestamp,
    ].join('|');
    const logHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    // Chain: fetch previous log hash for tamper evidence
    const lastLog = await db.auditLogSoc2.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { logHash: true },
    });

    await db.auditLogSoc2.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        userRole: input.userRole,
        sessionId: input.sessionId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        snapshotBefore: input.snapshotBefore ? JSON.stringify(input.snapshotBefore) : null,
        snapshotAfter: input.snapshotAfter ? JSON.stringify(input.snapshotAfter) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        stationId: input.stationId,
        logHash,
        previousLogHash: lastLog?.logHash ?? null,
        reason: input.reason,
      },
    });
  } catch (err) {
    console.error('[api-helpers] createChainedAuditLog error:', err);
  }
}
