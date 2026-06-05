import { db } from '@/lib/db';
import crypto from 'crypto';

interface AuditLogInput {
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  stationId?: string;
  teamId?: string;
  snapshotBefore?: string;
  snapshotAfter?: string;
  reason?: string;
}

/**
 * Create a SOC-2 compliant audit log entry with integrity hash.
 * This helper is reused across all API routes for consistent logging.
 */
export async function createAuditLog(input: AuditLogInput) {
  // Compute SHA-256 hash of critical fields for integrity verification
  const hashPayload = [
    input.userId,
    input.userEmail,
    input.action,
    input.resourceType,
    input.resourceId || '',
    new Date().toISOString(),
  ].join('|');

  const logHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  // Get the previous log entry for chain hashing (tamper evidence)
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
      snapshotBefore: input.snapshotBefore,
      snapshotAfter: input.snapshotAfter,
      ipAddress: input.ipAddress || 'unknown',
      userAgent: input.userAgent || 'unknown',
      stationId: input.stationId,
      teamId: input.teamId,
      logHash,
      previousLogHash: lastLog?.logHash || null,
      reason: input.reason,
    },
  });
}

/**
 * Extract client IP address from request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

/**
 * Extract user agent from request headers.
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Validate a Bearer token from the Authorization header.
 * Returns the session with user data if valid, null otherwise.
 */
export async function validateSession(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          permissions: true,
          stations: {
            include: {
              station: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (new Date() > session.expiresAt) {
    // Clean up expired session
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session;
}
