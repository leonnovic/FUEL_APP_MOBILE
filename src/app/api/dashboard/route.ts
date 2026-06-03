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
    ] = await Promise.all([
      // Total stations
      db.station.count({ where: { status: 'active' } }),

      // Sales today
      db.sale.findMany({
        where: { createdAt: { gte: today } },
        select: { totalAmount: true, quantityLiters: true },
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
    ])

    // Calculate totals from today's sales
    const totalRevenue = salesToday.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalLitersSold = salesToday.reduce((sum, s) => sum + s.quantityLiters, 0)

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
