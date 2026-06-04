import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        permissions: true,
        stations: {
          include: {
            station: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session with UUID token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const session = await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        deviceInfo: request.headers.get('user-agent') || undefined,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    // Update user's lastLogin
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Format permissions
    const permissions = user.permissions.map((p) => ({
      action: p.action,
      dataType: p.dataType,
      teamScope: p.teamScope,
      stationId: p.stationId,
    }));

    // Format assigned stations with station details
    const assignedStations = user.stations.map((s) => ({
      id: s.station.id,
      name: s.station.name,
      location: s.station.location,
      role: s.role,
      active: s.active,
    }));

    // Log the login to AuditLogSoc2
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'login',
      resourceType: 'session',
      resourceId: session.id,
      sessionId: session.id,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        permissions,
        assignedStations,
      },
      token,
    });
  } catch (error) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    );
  }
}
