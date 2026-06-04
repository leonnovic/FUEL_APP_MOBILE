import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, getIpAddress, getUserAgent, createAuditLog } from '@/lib/api-helpers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const DEMO_EMAIL = 'demo@fuelpro.app';
const DEMO_PASSWORD = 'demo123';
const DEMO_NAME = 'Demo User';

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getIpAddress(request);
    const userAgent = getUserAgent(request);

    // Check if demo user already exists
    let user = await db.user.findUnique({
      where: { email: DEMO_EMAIL },
      include: {
        stations: { include: { station: true } },
        permissions: true,
      },
    });

    if (user) {
      // Demo user exists - just log them in
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day session

      const session = await db.session.create({
        data: {
          userId: user.id,
          token,
          deviceInfo: userAgent.slice(0, 255),
          ipAddress,
          userAgent: userAgent.slice(0, 255),
          expiresAt,
        },
      });

      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Get assigned stations
      const assignedStations = user.stations.map((b) => b.stationId);

      // Log to AuditLogSoc2
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'login',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent,
        stationId: assignedStations[0] || 'unknown',
      });

      return successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tier: user.tier,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          permissions: user.permissions.map((p) => ({
            id: p.id,
            userId: p.userId,
            action: p.action,
            dataType: p.dataType,
            teamScope: p.teamScope,
            stationId: p.stationId,
          })),
          assignedStations,
        },
        token,
        sessionId: session.id,
      });
    }

    // Create demo user with all associated data
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

    user = await db.user.create({
      data: {
        email: DEMO_EMAIL,
        name: DEMO_NAME,
        password: hashedPassword,
        role: 'owner',
        tier: 'pro',
        phone: '+254 700 000 000',
        isActive: true,
      },
    });

    // Create demo station
    const station = await db.station.create({
      data: {
        name: 'FuelPro Demo Station',
        location: 'Nairobi, Kenya',
        country: 'Kenya',
        currency: 'KSH',
        ownerId: user.id,
        isActive: true,
      },
    });

    // Create StationBinding for the demo user
    await db.stationBinding.create({
      data: {
        userId: user.id,
        stationId: station.id,
        role: 'owner',
        active: true,
      },
    });

    // Create default owner permissions
    const ownerPermissions = [
      { action: 'create', dataType: 'station', teamScope: 'global' },
      { action: 'read', dataType: 'station', teamScope: 'global' },
      { action: 'update', dataType: 'station', teamScope: 'global' },
      { action: 'delete', dataType: 'station', teamScope: 'global' },
      { action: 'create', dataType: 'sale', teamScope: 'station', stationId: station.id },
      { action: 'read', dataType: 'sale', teamScope: 'station', stationId: station.id },
      { action: 'update', dataType: 'sale', teamScope: 'station', stationId: station.id },
      { action: 'create', dataType: 'inventory', teamScope: 'station', stationId: station.id },
      { action: 'read', dataType: 'inventory', teamScope: 'station', stationId: station.id },
      { action: 'update', dataType: 'inventory', teamScope: 'station', stationId: station.id },
      { action: 'create', dataType: 'employee', teamScope: 'station', stationId: station.id },
      { action: 'read', dataType: 'employee', teamScope: 'station', stationId: station.id },
      { action: 'update', dataType: 'employee', teamScope: 'station', stationId: station.id },
      { action: 'create', dataType: 'invoice', teamScope: 'station', stationId: station.id },
      { action: 'read', dataType: 'invoice', teamScope: 'station', stationId: station.id },
      { action: 'update', dataType: 'invoice', teamScope: 'station', stationId: station.id },
      { action: 'create', dataType: 'expense', teamScope: 'station', stationId: station.id },
      { action: 'read', dataType: 'expense', teamScope: 'station', stationId: station.id },
      { action: 'update', dataType: 'expense', teamScope: 'station', stationId: station.id },
      { action: 'read', dataType: 'audit_log', teamScope: 'station', stationId: station.id },
      { action: 'read', dataType: 'report', teamScope: 'station', stationId: station.id },
      { action: 'export', dataType: 'report', teamScope: 'station', stationId: station.id },
      { action: 'read', dataType: 'settings', teamScope: 'station', stationId: station.id },
      { action: 'update', dataType: 'settings', teamScope: 'station', stationId: station.id },
    ];

    await db.permission.createMany({
      data: ownerPermissions.map((p) => ({
        userId: user.id,
        action: p.action,
        dataType: p.dataType,
        teamScope: p.teamScope,
        stationId: p.stationId,
      })),
    });

    // Create sample FuelType records
    await db.fuelType.createMany({
      data: [
        {
          stationId: station.id,
          name: 'PMS',
          category: 'fuel',
          price: 212.36,
          tankCapacity: 20000,
          currentLevel: 14200,
        },
        {
          stationId: station.id,
          name: 'AGO',
          category: 'fuel',
          price: 199.47,
          tankCapacity: 25000,
          currentLevel: 18700,
        },
        {
          stationId: station.id,
          name: 'DPK',
          category: 'fuel',
          price: 178.20,
          tankCapacity: 10000,
          currentLevel: 6500,
        },
      ],
    });

    // Create sample sales records for the last 7 days
    const now = new Date();
    const salesData = [];
    for (let i = 6; i >= 0; i--) {
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - i);
      saleDate.setHours(12, 0, 0, 0);

      const pmsVol = Math.floor(Math.random() * 800 + 400);
      const agoVol = Math.floor(Math.random() * 600 + 300);
      const pmsPrice = 212.36;
      const agoPrice = 199.47;
      const pmsSalesKsh = pmsVol * pmsPrice;
      const agoSalesKsh = agoVol * agoPrice;
      const totalSales = pmsSalesKsh + agoSalesKsh;
      const expenses = Math.floor(Math.random() * 5000 + 2000);

      salesData.push({
        stationId: station.id,
        date: saleDate,
        pmsOpeningReading: 10000 + i * 2000,
        pmsClosingReading: 10000 + i * 2000 + pmsVol,
        agoOpeningReading: 8000 + i * 1500,
        agoClosingReading: 8000 + i * 1500 + agoVol,
        pmsPrice,
        agoPrice,
        pmsSalesKsh,
        agoSalesKsh,
        pmsSalesL: pmsVol,
        agoSalesL: agoVol,
        totalSales,
        expenses,
        createdBy: user.id,
      });
    }
    await db.sale.createMany({ data: salesData });

    // Create a session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day session

    const session = await db.session.create({
      data: {
        userId: user.id,
        token,
        deviceInfo: userAgent.slice(0, 255),
        ipAddress,
        userAgent: userAgent.slice(0, 255),
        expiresAt,
      },
    });

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Get permissions
    const permissions = await db.permission.findMany({
      where: { userId: user.id },
    });

    // Log to AuditLogSoc2
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
      stationId: station.id,
    });

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        permissions: permissions.map((p) => ({
          id: p.id,
          userId: p.userId,
          action: p.action,
          dataType: p.dataType,
          teamScope: p.teamScope,
          stationId: p.stationId,
        })),
        assignedStations: [station.id],
      },
      token,
      sessionId: session.id,
      station: {
        id: station.id,
        name: station.name,
        location: station.location,
      },
    });
  } catch (err) {
    console.error('[auth/demo] POST error:', err);
    return errorResponse('Failed to create demo account', 500);
  }
}
