import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'dashboard'

    // Gather real data for AI context
    const [
      stations,
      sales,
      tanks,
      shifts,
      expenses,
      reconciliations,
      deliveries,
      coupons,
      suppliers,
    ] = await Promise.all([
      db.station.findMany({ include: { tanks: true } }),
      db.sale.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      db.tank.findMany({ include: { station: { select: { name: true } } } }),
      db.shift.findMany({ orderBy: { startedAt: 'desc' }, take: 20 }),
      db.expense.findMany({ orderBy: { date: 'desc' }, take: 20 }),
      db.reconciliation.findMany({ orderBy: { recordedAt: 'desc' }, take: 10 }),
      db.delivery.findMany({ orderBy: { deliveredAt: 'desc' }, take: 10 }),
      db.coupon.findMany(),
      db.supplier.findMany(),
    ])

    // Compute key metrics
    const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaySales = sales.filter(s => new Date(s.createdAt) >= today)
    const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const lowTanks = tanks.filter(t => t.currentStock <= t.alertThreshold)
    const activeShifts = shifts.filter(s => s.status === 'active')
    const criticalRecons = reconciliations.filter(r => r.flag === 'critical')
    const activeCoupons = coupons.filter(c => c.status === 'active' && c.uses < c.maxUses)

    // Fuel type breakdown
    const fuelBreakdown: Record<string, { liters: number; revenue: number; count: number }> = {}
    sales.forEach(s => {
      if (!fuelBreakdown[s.fuelType]) fuelBreakdown[s.fuelType] = { liters: 0, revenue: 0, count: 0 }
      fuelBreakdown[s.fuelType].liters += s.quantityLiters
      fuelBreakdown[s.fuelType].revenue += s.totalAmount
      fuelBreakdown[s.fuelType].count += 1
    })

    // Payment method breakdown
    const paymentBreakdown: Record<string, { count: number; revenue: number }> = {}
    sales.forEach(s => {
      if (!paymentBreakdown[s.paymentMethod]) paymentBreakdown[s.paymentMethod] = { count: 0, revenue: 0 }
      paymentBreakdown[s.paymentMethod].count += 1
      paymentBreakdown[s.paymentMethod].revenue += s.totalAmount
    })

    // Expense categories
    const expenseByCategory: Record<string, number> = {}
    expenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount
    })

    // Build insights from data (rule-based, no LLM needed for speed)
    const insights: {
      id: string
      type: 'warning' | 'success' | 'info' | 'critical'
      title: string
      description: string
      action?: string
      category: string
    }[] = []

    // Tank alerts
    lowTanks.forEach(tank => {
      const pct = tank.capacity > 0 ? Math.round((tank.currentStock / tank.capacity) * 100) : 0
      insights.push({
        id: `tank-${tank.id}`,
        type: pct <= 20 ? 'critical' : 'warning',
        title: `${tank.fuelType} critically low at ${tank.station.name}`,
        description: `Current stock: ${tank.currentStock.toLocaleString()}L (${pct}% full). Minimum threshold: ${tank.alertThreshold.toLocaleString()}L. Consider ordering ${Math.round(tank.capacity * 0.8 - tank.currentStock).toLocaleString()}L to refill to 80%.`,
        action: 'Order fuel delivery',
        category: 'Inventory',
      })
    })

    // Revenue insights
    const avgSaleValue = sales.length > 0 ? totalRevenue / sales.length : 0
    if (todayRevenue > 0) {
      insights.push({
        id: 'revenue-today',
        type: 'success',
        title: `Today's revenue: KES ${todayRevenue.toLocaleString()}`,
        description: `${todaySales.length} transactions with an average value of KES ${avgSaleValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}. ${todayRevenue > totalRevenue / 30 ? 'Above daily average!' : 'Below daily average.'}`,
        category: 'Revenue',
      })
    }

    // Profit margin
    const netProfit = totalRevenue - totalExpenses
    const marginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    if (marginPct < 10 && totalRevenue > 0) {
      insights.push({
        id: 'profit-margin',
        type: 'warning',
        title: 'Profit margin below 10%',
        description: `Current margin: ${marginPct.toFixed(1)}%. Revenue: KES ${totalRevenue.toLocaleString()}, Expenses: KES ${totalExpenses.toLocaleString()}, Net: KES ${netProfit.toLocaleString()}. Review expense categories: ${Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c, a]) => `${c} (KES ${a.toLocaleString()})`).join(', ')}.`,
        action: 'Review expenses',
        category: 'Finance',
      })
    } else if (marginPct >= 20) {
      insights.push({
        id: 'profit-margin',
        type: 'success',
        title: `Healthy profit margin: ${marginPct.toFixed(1)}%`,
        description: `Net profit of KES ${netProfit.toLocaleString()} on KES ${totalRevenue.toLocaleString()} revenue. Continue monitoring expense trends.`,
        category: 'Finance',
      })
    }

    // Reconciliation alerts
    criticalRecons.forEach(r => {
      insights.push({
        id: `recon-${r.id}`,
        type: 'critical',
        title: `Critical variance at ${r.stationId}`,
        description: `Fuel variance of ${r.variancePct.toFixed(1)}% (${r.variance.toLocaleString()}L difference). Book stock: ${r.bookStock.toLocaleString()}L, Physical: ${r.physicalStock.toLocaleString()}L. Requires immediate investigation.`,
        action: 'Investigate variance',
        category: 'Compliance',
      })
    })

    // Payment method insights
    const mpesaSales = paymentBreakdown['mpesa'] || { count: 0, revenue: 0 }
    const cashSales = paymentBreakdown['cash'] || { count: 0, revenue: 0 }
    if (sales.length > 0) {
      const digitalPct = ((mpesaSales.count) / sales.length * 100).toFixed(0)
      insights.push({
        id: 'payment-mix',
        type: 'info',
        title: `Payment mix: ${digitalPct}% digital (M-Pesa)`,
        description: `M-Pesa: ${mpesaSales.count} txns (KES ${mpesaSales.revenue.toLocaleString()}), Cash: ${cashSales.count} txns (KES ${cashSales.revenue.toLocaleString()}). ${Number(digitalPct) < 30 ? 'Consider promoting M-Pesa for faster reconciliation.' : 'Good digital adoption!'}`,
        category: 'Payments',
      })
    }

    // Active shifts
    if (activeShifts.length > 0) {
      insights.push({
        id: 'active-shifts',
        type: 'info',
        title: `${activeShifts.length} active shift${activeShifts.length > 1 ? 's' : ''} running`,
        description: `Attendants on duty: ${activeShifts.map(s => s.attendantName).join(', ')}. Monitor shift readings for accuracy.`,
        category: 'Operations',
      })
    }

    // Fuel type performance
    const topFuel = Object.entries(fuelBreakdown).sort((a, b) => b[1].revenue - a[1].revenue)[0]
    if (topFuel) {
      insights.push({
        id: 'top-fuel',
        type: 'info',
        title: `Top performer: ${topFuel[0]}`,
        description: `${topFuel[1].count} sales, ${topFuel[1].liters.toLocaleString()}L sold, KES ${topFuel[1].revenue.toLocaleString()} revenue. This accounts for ${(topFuel[1].revenue / totalRevenue * 100).toFixed(0)}% of total revenue.`,
        category: 'Sales',
      })
    }

    // Station performance
    const stationRevenue: Record<string, number> = {}
    sales.forEach(s => {
      stationRevenue[s.stationId] = (stationRevenue[s.stationId] || 0) + s.totalAmount
    })
    const topStation = stations.find(st => st.id === Object.entries(stationRevenue).sort((a, b) => b[1] - a[1])[0]?.[0])
    if (topStation) {
      insights.push({
        id: 'top-station',
        type: 'success',
        title: `Top station: ${topStation.name}`,
        description: `Leading revenue generator with ${topStation.tanks.length} active tanks. Consider this station for promotional campaigns.`,
        category: 'Performance',
      })
    }

    // Active coupons
    if (activeCoupons.length > 0) {
      insights.push({
        id: 'coupons-active',
        type: 'info',
        title: `${activeCoupons.length} active coupon${activeCoupons.length > 1 ? 's' : ''} available`,
        description: `Coupons: ${activeCoupons.map(c => `${c.code} (${c.type === 'percentage' ? `${c.value}%` : `KES ${c.value}`})`).join(', ')}. Promote to increase customer retention.`,
        category: 'Marketing',
      })
    }

    // Delivery gap check
    const recentDeliveries = deliveries.filter(d => {
      const deliveryDate = new Date(d.deliveredAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return deliveryDate >= weekAgo
    })
    if (recentDeliveries.length === 0 && lowTanks.length > 0) {
      insights.push({
        id: 'delivery-gap',
        type: 'warning',
        title: 'No deliveries in the past 7 days',
        description: `${lowTanks.length} tank${lowTanks.length > 1 ? 's' : ''} below threshold. Schedule fuel deliveries to prevent stockouts.`,
        action: 'Schedule delivery',
        category: 'Supply Chain',
      })
    }

    return NextResponse.json({
      ok: true,
      data: insights,
      meta: {
        totalInsights: insights.length,
        critical: insights.filter(i => i.type === 'critical').length,
        warnings: insights.filter(i => i.type === 'warning').length,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[AI_INSIGHTS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
