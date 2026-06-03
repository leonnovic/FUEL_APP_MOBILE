import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const fuelType = searchParams.get('fuelType')
    const paymentMethod = searchParams.get('paymentMethod')

    const where: Record<string, unknown> = {}
    if (stationId) where.stationId = stationId
    if (fuelType) where.fuelType = fuelType
    if (paymentMethod) where.paymentMethod = paymentMethod

    const sales = await db.sale.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: sales })
  } catch (error) {
    console.error('[SALES_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stationId,
      userId,
      fuelType,
      quantityLiters,
      pricePerLiter,
      paymentMethod,
      mpesaReceipt,
      customerName,
    } = body

    if (!stationId || !userId || !fuelType || !quantityLiters || !pricePerLiter) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: stationId, userId, fuelType, quantityLiters, pricePerLiter' },
        { status: 400 }
      )
    }

    const totalAmount = quantityLiters * pricePerLiter

    // Find the matching tank to reduce stock
    const tank = await db.tank.findFirst({
      where: { stationId, fuelType },
    })

    if (!tank) {
      return NextResponse.json(
        { ok: false, error: `No ${fuelType} tank found at this station` },
        { status: 404 }
      )
    }

    if (tank.currentStock < quantityLiters) {
      return NextResponse.json(
        { ok: false, error: `Insufficient stock. Available: ${tank.currentStock}L, Requested: ${quantityLiters}L` },
        { status: 400 }
      )
    }

    // Create sale and update tank stock in a transaction
    const [sale] = await db.$transaction([
      db.sale.create({
        data: {
          stationId,
          userId,
          fuelType,
          quantityLiters,
          pricePerLiter,
          totalAmount,
          paymentMethod: paymentMethod || 'cash',
          mpesaReceipt: mpesaReceipt || null,
          customerName: customerName || null,
        },
        include: {
          station: { select: { id: true, name: true } },
        },
      }),
      db.tank.update({
        where: { id: tank.id },
        data: { currentStock: tank.currentStock - quantityLiters },
      }),
    ])

    return NextResponse.json({ ok: true, data: sale }, { status: 201 })
  } catch (error) {
    console.error('[SALES_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}
