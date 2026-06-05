import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

// Default permissions for the "staff" role
const DEFAULT_STAFF_PERMISSIONS = [
  { action: 'read', dataType: 'sale', teamScope: 'personal', stationId: null },
  { action: 'read', dataType: 'inventory', teamScope: 'personal', stationId: null },
  { action: 'create', dataType: 'sale', teamScope: 'personal', stationId: null },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, phone } = body as {
      email?: string;
      name?: string;
      password?: string;
      phone?: string;
    };

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role "staff" and tier "free"
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        password: hashedPassword,
        phone: phone?.trim() || null,
        role: 'staff',
        tier: 'free',
      },
    });

    // Generate default permissions for "staff" role
    await db.permission.createMany({
      data: DEFAULT_STAFF_PERMISSIONS.map((p) => ({
        userId: user.id,
        action: p.action,
        dataType: p.dataType,
        teamScope: p.teamScope,
        stationId: p.stationId,
      })),
    });

    // Create a session with token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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

    // Load the user with permissions for the response
    const userWithPermissions = await db.user.findUnique({
      where: { id: user.id },
      include: {
        permissions: true,
        stations: {
          include: {
            station: true,
          },
        },
      },
    });

    // Log to AuditLogSoc2
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'user',
      resourceId: user.id,
      sessionId: session.id,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      snapshotAfter: JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
      }),
    });

    // Format permissions
    const permissions = (userWithPermissions?.permissions || []).map((p) => ({
      action: p.action,
      dataType: p.dataType,
      teamScope: p.teamScope,
      stationId: p.stationId,
    }));

    // Format assigned stations
    const assignedStations = (userWithPermissions?.stations || []).map((s) => ({
      id: s.station.id,
      name: s.station.name,
      location: s.station.location,
      role: s.role,
      active: s.active,
    }));

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Register API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
