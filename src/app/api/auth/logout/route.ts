import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog, getClientIp, getUserAgent, validateSession } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const user = session.user;

    // Log the logout to AuditLogSoc2 before deleting the session
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'logout',
      resourceType: 'session',
      resourceId: session.id,
      sessionId: session.id,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Delete the session record
    await db.session.delete({
      where: { id: session.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
