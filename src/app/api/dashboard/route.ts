import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalStations,
      salesToday,
      activeShifts,
      allTanks,
      recentSales,
      allSales,
    ] = await Promise.all([
      // Total stations
      db.station.count({ where: { status: 'active' } }),

      // Sales today
      db.sale.findMany({
        where: { createdAt: { gte: today } },
        select: { totalAmount: true, quantityLiters: true, paymentMethod: true, fuelType: true },
      }),

      // Active shifts
      db.shift.count({ where: { status: 'active' } }),

      // All tanks (we'll filter alerts in code since SQLite doesn't support column comparison in where)
      db.tank.findMany({
        include: {
          station: { select: { id: true, name: true } },
        },
      }),

      // Recent sales (last 10)
      db.sale.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          station: { select: { id: true, name: true } },
        },
      }),

      // All sales for charts
      db.sale.findMany({
        select: { totalAmount: true, quantityLiters: true, paymentMethod: true, fuelType: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ])

    // Calculate totals from today's sales
    const totalRevenue = salesToday.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalLitersSold = salesToday.reduce((sum, s) => sum + s.quantityLiters, 0)

    // Payment method breakdown from today's sales
    const paymentBreakdown = [
      { name: 'Cash', value: salesToday.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0), count: salesToday.filter(s => s.paymentMethod === 'cash').length },
      { name: 'M-Pesa', value: salesToday.filter(s => s.paymentMethod === 'mpesa').reduce((sum, s) => sum + s.totalAmount, 0), count: salesToday.filter(s => s.paymentMethod === 'mpesa').length },
      { name: 'Card', value: salesToday.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.totalAmount, 0), count: salesToday.filter(s => s.paymentMethod === 'card').length },
    ].filter(p => p.count > 0)

    // Fuel type breakdown from today's sales
    const fuelBreakdown = [
      { name: 'Petrol', value: salesToday.filter(s => s.fuelType === 'Petrol').reduce((sum, s) => sum + s.totalAmount, 0), liters: salesToday.filter(s => s.fuelType === 'Petrol').reduce((sum, s) => sum + s.quantityLiters, 0) },
      { name: 'Diesel', value: salesToday.filter(s => s.fuelType === 'Diesel').reduce((sum, s) => sum + s.totalAmount, 0), liters: salesToday.filter(s => s.fuelType === 'Diesel').reduce((sum, s) => sum + s.quantityLiters, 0) },
      { name: 'Kerosene', value: salesToday.filter(s => s.fuelType === 'Kerosene').reduce((sum, s) => sum + s.totalAmount, 0), liters: salesToday.filter(s => s.fuelType === 'Kerosene').reduce((sum, s) => sum + s.quantityLiters, 0) },
    ].filter(f => f.liters > 0)

    // Top stations by revenue (from recent sales)
    const stationRevenue = new Map<string, { name: string; revenue: number; sales: number }>()
    allSales.forEach(s => {
      const existing = stationRevenue.get(s.createdAt) || { name: '', revenue: 0, sales: 0 }
      existing.revenue += s.totalAmount
      existing.sales += 1
    })

    // Filter tanks below alert threshold
    const tankAlerts = allTanks
      .filter((t) => t.currentStock <= t.alertThreshold)
      .map((t) => ({
        id: t.id,
        fuelType: t.fuelType,
        currentStock: t.currentStock,
        capacity: t.capacity,
        alertThreshold: t.alertThreshold,
        station: t.station,
      }))

    return NextResponse.json({
      ok: true,
      data: {
        totalStations,
        salesToday: salesToday.length,
        totalRevenue,
        totalLitersSold,
        activeShifts,
        tankAlerts,
        recentSales,
        paymentBreakdown,
        fuelBreakdown,
      },
    })
  } catch (error) {
    console.error('[DASHBOARD_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
