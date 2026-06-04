import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// GET /api/dashboard?stationId=xxx - Aggregated dashboard statistics
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    // Week start (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // Month start
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    // Fetch all data in parallel
    const [
      sales,
      deliveries,
      clients,
      invoices,
      employees,
      expenses,
      shifts,
      fuelTypes,
      maintenance,
    ] = await Promise.all([
      db.sale.findMany({ where: { stationId }, orderBy: { createdAt: 'desc' } }),
      db.delivery.findMany({ where: { stationId }, orderBy: { createdAt: 'desc' } }),
      db.client.findMany({ where: { stationId } }),
      db.invoice.findMany({ where: { stationId } }),
      db.employee.findMany({ where: { stationId } }),
      db.expense.findMany({ where: { stationId } }),
      db.shift.findMany({ where: { stationId }, orderBy: { createdAt: 'desc' } }),
      db.fuelType.findMany({ where: { stationId } }),
      db.maintenance.findMany({ where: { stationId }, orderBy: { createdAt: 'desc' } }),
    ]);

    // ─── KPIs ──────────────────────────────────────────────────────────────

    const totalRevenue = sales.reduce((s, sale) => s + sale.totalSales, 0);

    const todaySales = sales
      .filter((s) => s.date.toISOString().slice(0, 10) === todayStr)
      .reduce((s, sale) => s + sale.totalSales, 0);

    const yesterdaySales = sales
      .filter((s) => s.date.toISOString().slice(0, 10) === yesterdayStr)
      .reduce((s, sale) => s + sale.totalSales, 0);

    const weeklySales = sales
      .filter((s) => s.date.toISOString().slice(0, 10) >= weekStartStr)
      .reduce((s, sale) => s + sale.totalSales, 0);

    const monthlySales = sales
      .filter((s) => s.date.toISOString().slice(0, 10) >= monthStartStr)
      .reduce((s, sale) => s + sale.totalSales, 0);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const salesChangePct = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;

    const totalFuelL = sales.reduce((s, sale) => s + sale.pmsSalesL + sale.agoSalesL, 0);
    const totalPmsL = sales.reduce((s, sale) => s + sale.pmsSalesL, 0);
    const totalAgoL = sales.reduce((s, sale) => s + sale.agoSalesL, 0);

    const totalBalanceDue = clients.reduce((s, c) => s + c.balanceDue, 0);
    const activeEmployees = employees.filter((e) => e.status === 'active').length;
    const openShifts = shifts.filter((s) => s.status === 'open').length;

    const todaySalesCount = sales.filter((s) => s.date.toISOString().slice(0, 10) === todayStr).length;
    const avgTransaction = todaySalesCount > 0 ? todaySales / todaySalesCount : 0;

    const activeInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').length;

    // PMS/AGO prices from fuel types
    const pmsFuel = fuelTypes.find((f) =>
      f.name.toLowerCase().includes('pms') || f.name.toLowerCase().includes('petrol') || f.name.toLowerCase().includes('super')
    );
    const agoFuel = fuelTypes.find((f) =>
      f.name.toLowerCase().includes('ago') || f.name.toLowerCase().includes('diesel')
    );

    // ─── Sales Trend (7 days) ─────────────────────────────────────────────

    const salesTrend: { date: string; pms: number; ago: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const daySales = sales.filter((s) => s.date.toISOString().slice(0, 10) === ds);
      salesTrend.push({
        date: d.toLocaleDateString('en-KE', { weekday: 'short' }),
        pms: daySales.reduce((sum, s) => sum + s.pmsSalesKsh, 0),
        ago: daySales.reduce((sum, s) => sum + s.agoSalesKsh, 0),
      });
    }

    // ─── Fuel Levels ──────────────────────────────────────────────────────

    const fuelLevels = fuelTypes.map((ft) => ({
      id: ft.id,
      name: ft.name,
      level: ft.currentLevel,
      capacity: ft.tankCapacity,
      price: ft.price,
      category: ft.category,
    }));

    // ─── Expense Breakdown ────────────────────────────────────────────────

    const expenseByCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });
    const expenseBreakdown = Object.entries(expenseByCategory).map(([cat, amt]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      amount: amt,
    }));

    // ─── Recent Activity ──────────────────────────────────────────────────

    const recentSales = sales.slice(0, 3).map((s) => ({
      id: s.id,
      type: 'sale' as const,
      description: `Sale recorded: Ksh ${s.totalSales.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`,
      createdAt: s.createdAt.toISOString(),
    }));

    const recentDeliveries = deliveries.slice(0, 2).map((d) => ({
      id: d.id,
      type: 'delivery' as const,
      description: `Delivery: ${d.quantity.toLocaleString()}L ${d.product} from ${d.supplier}`,
      createdAt: d.createdAt.toISOString(),
    }));

    const recentShifts = shifts.slice(0, 2).map((s) => ({
      id: s.id,
      type: 'shift' as const,
      description: `Shift ${s.status}: ${s.attendantName}`,
      createdAt: s.createdAt.toISOString(),
    }));

    const recentMaintenance = maintenance.slice(0, 1).map((m) => ({
      id: m.id,
      type: 'maintenance' as const,
      description: `Maintenance: ${m.equipment} - ${m.status}`,
      createdAt: m.createdAt.toISOString(),
    }));

    const recentActivity = [...recentSales, ...recentDeliveries, ...recentShifts, ...recentMaintenance]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    // ─── Alerts ───────────────────────────────────────────────────────────

    const alerts: { id: string; type: 'danger' | 'warning' | 'info'; title: string; desc: string; action: string; tab: string }[] = [];

    fuelTypes.forEach((ft) => {
      if (ft.tankCapacity > 0) {
        const pct = (ft.currentLevel / ft.tankCapacity) * 100;
        if (pct < 25) {
          alerts.push({
            id: `tank-${ft.id}`,
            type: pct < 10 ? 'danger' : 'warning',
            title: `Low Tank: ${ft.name}`,
            desc: `${ft.currentLevel.toLocaleString()}L remaining (${Math.round(pct)}%)`,
            action: 'View Inventory',
            tab: 'inventory',
          });
        }
      }
    });

    const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
    if (overdueInvoices.length > 0) {
      alerts.push({
        id: 'overdue-invoices',
        type: 'danger',
        title: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length > 1 ? 's' : ''}`,
        desc: `Total: Ksh ${overdueInvoices.reduce((s, i) => s + i.totalAmount, 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`,
        action: 'View Invoices',
        tab: 'invoice',
      });
    }

    const pendingDeliveries = deliveries.filter((d) => d.status === 'pending');
    if (pendingDeliveries.length > 0) {
      alerts.push({
        id: 'pending-deliveries',
        type: 'info',
        title: `${pendingDeliveries.length} Pending Deliver${pendingDeliveries.length > 1 ? 'ies' : 'y'}`,
        desc: 'Awaiting fuel delivery confirmation',
        action: 'Track Delivery',
        tab: 'delivery',
      });
    }

    const unresolvedMaintenance = maintenance.filter((m) => m.status === 'scheduled' || m.status === 'in-progress');
    if (unresolvedMaintenance.length > 0) {
      alerts.push({
        id: 'unresolved-maintenance',
        type: 'warning',
        title: `${unresolvedMaintenance.length} Open Maintenance Item${unresolvedMaintenance.length > 1 ? 's' : ''}`,
        desc: 'Requires attention',
        action: 'View Maintenance',
        tab: 'maintenance',
      });
    }

    // ─── Station Health Score ─────────────────────────────────────────────

    const healthFactors: { name: string; score: number; weight: number }[] = [];

    const tankScores = fuelTypes.map((ft) => {
      if (ft.tankCapacity === 0) return 100;
      return Math.min(100, (ft.currentLevel / ft.tankCapacity) * 100);
    });
    const avgTank = tankScores.length > 0 ? tankScores.reduce((a, b) => a + b, 0) / tankScores.length : 100;
    healthFactors.push({ name: 'Tank Levels', score: Math.round(avgTank), weight: 30 });

    const unresolvedMaint = maintenance.filter((m) => m.status !== 'completed' && m.status !== 'cancelled').length;
    healthFactors.push({ name: 'Maintenance', score: Math.round(Math.max(0, 100 - unresolvedMaint * 15)), weight: 25 });

    const overdueInv = invoices.filter((i) => i.status === 'overdue').length;
    healthFactors.push({ name: 'Invoices', score: Math.round(Math.max(0, 100 - overdueInv * 20)), weight: 25 });

    const staffScore = activeEmployees > 0 ? Math.min(100, (activeEmployees / Math.max(employees.length, 1)) * 100) : 0;
    healthFactors.push({ name: 'Staffing', score: Math.round(staffScore), weight: 20 });

    const totalWeight = healthFactors.reduce((s, f) => s + f.weight, 0);
    const healthScore = Math.round(healthFactors.reduce((s, f) => s + (f.score * f.weight) / totalWeight, 0));

    // ─── Upcoming Deliveries ──────────────────────────────────────────────

    const upcomingDeliveriesList = deliveries
      .filter((d) => d.status === 'pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);

    // ─── Build response ───────────────────────────────────────────────────

    const dashboardData = {
      // KPIs
      totalRevenue,
      todaySales,
      yesterdaySales,
      weeklySales,
      monthlySales,
      totalExpenses,
      netProfit,
      salesChangePct,
      totalFuelL,
      totalPmsL,
      totalAgoL,
      totalBalanceDue,
      activeEmployees,
      openShifts,
      todaySalesCount,
      avgTransaction,
      activeInvoices,
      clientCount: clients.length,

      // Prices
      pmsPrice: pmsFuel?.price || 0,
      agoPrice: agoFuel?.price || 0,

      // Charts
      salesTrend,
      fuelLevels,
      fuelDistData: [
        { name: 'PMS', value: totalPmsL || 1 },
        { name: 'AGO', value: totalAgoL || 1 },
      ],
      expenseBreakdown,

      // Activity
      recentSales: recentSales,
      recentDeliveries: recentDeliveries,
      recentActivity,

      // Alerts
      alerts,

      // Health
      healthScore,
      healthFactors,

      // Deliveries
      upcomingDeliveries: upcomingDeliveriesList,

      // Station info
      fuelTypeCount: fuelTypes.filter((f) => f.category === 'fuel').length,
      pmsPumpCount: fuelTypes.filter((f) => f.name.toLowerCase().includes('pms') || f.name.toLowerCase().includes('petrol')).length,
      agoPumpCount: fuelTypes.filter((f) => f.name.toLowerCase().includes('ago') || f.name.toLowerCase().includes('diesel')).length,

      // Last readings
      latestSale: sales.length > 0 ? {
        pmsOpening: sales[0].pmsOpeningReading,
        pmsClosing: sales[0].pmsClosingReading,
        agoOpening: sales[0].agoOpeningReading,
        agoClosing: sales[0].agoClosingReading,
      } : null,

      // Completed deliveries for empty state
      recentCompletedDeliveries: deliveries.filter((d) => d.status === 'delivered').slice(0, 2),
    };

    return successResponse(dashboardData);
  } catch (err) {
    console.error('[dashboard] GET error:', err);
    return errorResponse('Failed to load dashboard data', 500);
  }
}
