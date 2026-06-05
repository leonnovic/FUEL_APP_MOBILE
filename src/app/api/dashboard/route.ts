import { db } from '@/lib/db'
import { apiSuccess, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('DASHBOARD_GET', async () => {
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
      db.station.count({ where: { status: 'active' } }),
      db.sale.findMany({
        where: { createdAt: { gte: today } },
        select: { totalAmount: true, quantityLiters: true, paymentMethod: true, fuelType: true },
      }),
      db.shift.count({ where: { status: 'active' } }),
      db.tank.findMany({
        include: {
          station: { select: { id: true, name: true } },
        },
      }),
      db.sale.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          station: { select: { id: true, name: true } },
        },
      }),
      db.sale.findMany({
        select: { totalAmount: true, quantityLiters: true, paymentMethod: true, fuelType: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ])

    const totalRevenue = salesToday.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalLitersSold = salesToday.reduce((sum, s) => sum + s.quantityLiters, 0)

    const paymentBreakdown = [
      { name: 'Cash', value: salesToday.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0), count: salesToday.filter(s => s.paymentMethod === 'cash').length },
      { name: 'M-Pesa', value: salesToday.filter(s => s.paymentMethod === 'mpesa').reduce((sum, s) => sum + s.totalAmount, 0), count: salesToday.filter(s => s.paymentMethod === 'mpesa').length },
      { name: 'Card', value: salesToday.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.totalAmount, 0), count: salesToday.filter(s => s.paymentMethod === 'card').length },
    ].filter(p => p.count > 0)

    const fuelBreakdown = [
      { name: 'Petrol', value: salesToday.filter(s => s.fuelType === 'Petrol').reduce((sum, s) => sum + s.totalAmount, 0), liters: salesToday.filter(s => s.fuelType === 'Petrol').reduce((sum, s) => sum + s.quantityLiters, 0) },
      { name: 'Diesel', value: salesToday.filter(s => s.fuelType === 'Diesel').reduce((sum, s) => sum + s.totalAmount, 0), liters: salesToday.filter(s => s.fuelType === 'Diesel').reduce((sum, s) => sum + s.quantityLiters, 0) },
      { name: 'Kerosene', value: salesToday.filter(s => s.fuelType === 'Kerosene').reduce((sum, s) => sum + s.totalAmount, 0), liters: salesToday.filter(s => s.fuelType === 'Kerosene').reduce((sum, s) => sum + s.quantityLiters, 0) },
    ].filter(f => f.liters > 0)

    const stationRevenue = new Map<string, { name: string; revenue: number; sales: number }>()
    allSales.forEach(s => {
      const existing = stationRevenue.get(s.createdAt.toISOString()) || { name: '', revenue: 0, sales: 0 }
      existing.revenue += s.totalAmount
      existing.sales += 1
    })

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

    return apiSuccess({
      totalStations,
      salesToday: salesToday.length,
      totalRevenue,
      totalLitersSold,
      activeShifts,
      tankAlerts,
      recentSales,
      paymentBreakdown,
      fuelBreakdown,
    })
  })
}
