// ─── Data Isolation Layer ────────────────────────────────────────────────────
// Architecture-level tenant/station data isolation.
// Every query MUST be scoped to the user's authorized stations.

import { db } from '@/lib/db';
import { validateSession } from '@/lib/audit';
import { NextResponse } from 'next/server';

export interface IsolationContext {
  userId: string;
  userEmail: string;
  userRole: string;
  sessionId: string;
  allowedStationIds: string[];
}

/**
 * Extract isolation context from a request.
 * Validates the session and returns the user's allowed station IDs.
 * All data queries should be scoped to these stations.
 */
export async function getIsolationContext(request: Request): Promise<IsolationContext | null> {
  const session = await validateSession(request);
  if (!session) return null;

  const user = session.user;

  // Founder/owner: access all stations they own + are bound to
  const bindings = user.stations || [];
  const allowedStationIds = bindings
    .filter((b: { active: boolean }) => b.active)
    .map((b: { stationId: string }) => b.stationId);

  // If user is founder, they can access all stations
  if (user.role === 'founder') {
    const allStations = await db.station.findMany({ select: { id: true } });
    return {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      sessionId: session.id,
      allowedStationIds: allStations.map((s) => s.id),
    };
  }

  // Owners also get their owned stations
  if (user.role === 'owner') {
    const ownedStations = await db.station.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    const ownedIds = ownedStations.map((s) => s.id);
    const combinedIds = [...new Set([...allowedStationIds, ...ownedIds])];
    return {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      sessionId: session.id,
      allowedStationIds: combinedIds,
    };
  }

  return {
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    sessionId: session.id,
    allowedStationIds,
  };
}

/**
 * Verify that a specific station ID is within the user's allowed stations.
 */
export function assertStationAccess(ctx: IsolationContext, stationId: string): boolean {
  if (ctx.userRole === 'founder') return true;
  return ctx.allowedStationIds.includes(stationId);
}

/**
 * Build a Prisma where clause that enforces station-level data isolation.
 */
export function isolatedWhere(ctx: IsolationContext, additionalFilters?: Record<string, unknown>) {
  const baseWhere = {
    stationId: { in: ctx.allowedStationIds },
    ...additionalFilters,
  };
  return baseWhere;
}

/**
 * Return 403 if the user doesn't have access to the requested station.
 */
export function unauthorizedResponse(message = 'Access denied: insufficient station permissions') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

/**
 * Return 401 for unauthenticated requests.
 */
export function unauthenticatedResponse() {
  return NextResponse.json(
    { success: false, error: 'Authentication required' },
    { status: 401 }
  );
}
