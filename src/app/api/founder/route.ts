import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  getSession,
  createAuditLog,
  getIpAddress,
  getUserAgent,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/founder - Founder/Admin dashboard with global stats
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const sessionResult = await getSession(request);
    if (sessionResult.error) return sessionResult.error;
    const user = sessionResult.user;

    // Authorize: only founder role can access
    if (user.role !== 'founder') {
      return errorResponse('Access denied. Founder role required.', 403);
    }

    const ipAddress = getIpAddress(request);
    const userAgent = getUserAgent(request);

    // Fetch global stats in parallel
    const [
      totalUsers,
      totalStations,
      totalSales,
      activeSessions,
      totalSalesRevenue,
      totalEmployees,
      totalInvoices,
      pendingInvoices,
      totalExpenses,
      totalDeliveries,
      totalPayrolls,
      totalCreditAccounts,
      totalQualityTests,
      recentSignups,
    ] = await Promise.all([
      db.user.count(),
      db.station.count({ where: { isActive: true } }),
      db.sale.count(),
      db.session.count({
        where: { expiresAt: { gt: new Date() } },
      }),
      db.sale.aggregate({ _sum: { totalSales: true } }),
      db.employee.count({ where: { status: 'active' } }),
      db.invoice.count(),
      db.invoice.count({ where: { status: 'pending' } }),
      db.expense.aggregate({ _sum: { amount: true } }),
      db.delivery.count(),
      db.payroll.count(),
      db.creditAccount.count({ where: { status: 'active' } }),
      db.qualityTest.count(),
      db.user.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Tier breakdown
    const tierBreakdown = await db.user.groupBy({
      by: ['tier'],
      _count: { tier: true },
    });

    // Role breakdown
    const roleBreakdown = await db.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    // Station activity (top 5 by sales)
    const topStations = await db.station.findMany({
      where: { isActive: true },
      include: {
        sales: { select: { totalSales: true } },
        _count: { select: { employees: true, sales: true } },
      },
      take: 5,
    });

    const stationStats = topStations.map((station) => ({
      id: station.id,
      name: station.name,
      location: station.location,
      totalSales: station.sales.reduce((sum, s) => sum + s.totalSales, 0),
      saleCount: station._count.sales,
      employeeCount: station._count.employees,
    }));

    const result = {
      overview: {
        totalUsers,
        totalStations,
        totalSales,
        totalRevenue: totalSalesRevenue._sum.totalSales ?? 0,
        totalExpenses: totalExpenses._sum.amount ?? 0,
        activeSessions,
        totalEmployees,
        totalInvoices,
        pendingInvoices,
        totalDeliveries,
        totalPayrolls,
        totalCreditAccounts,
        totalQualityTests,
      },
      breakdowns: {
        tiers: tierBreakdown.map((t) => ({ tier: t.tier, count: t._count.tier })),
        roles: roleBreakdown.map((r) => ({ role: r.role, count: r._count.role })),
      },
      topStations: stationStats,
      recentSignups,
      generatedAt: new Date().toISOString(),
    };

    // SOC-2 audit log for founder dashboard access
    const stationId = request.headers.get('x-station-id') || 'global';
    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'read',
      resourceType: 'founder_dashboard',
      resourceId: 'global_stats',
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(result);
  } catch (err) {
    console.error('[founder] GET error:', err);
    return errorResponse('Failed to fetch founder dashboard data', 500);
  }
}
