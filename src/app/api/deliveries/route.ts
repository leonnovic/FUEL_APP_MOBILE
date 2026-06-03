import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const fuelType = searchParams.get('fuelType')

    const where: Record<string, unknown> = {}
    if (stationId) where.stationId = stationId
    if (fuelType) where.fuelType = fuelType

    const deliveries = await db.delivery.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { deliveredAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: deliveries })
  } catch (error) {
    console.error('[DELIVERIES_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch deliveries' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stationId,
      supplierName,
      fuelType,
      volumeLiters,
      costPerLiter,
      totalCost,
      deliveredAt,
    } = body

    if (!stationId || !supplierName || !fuelType || !volumeLiters) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: stationId, supplierName, fuelType, volumeLiters' },
        { status: 400 }
      )
    }

    // Find the matching tank to increase stock
    const tank = await db.tank.findFirst({
      where: { stationId, fuelType },
    })

    if (!tank) {
      return NextResponse.json(
        { ok: false, error: `No ${fuelType} tank found at this station` },
        { status: 404 }
      )
    }

    const calculatedTotalCost = totalCost ?? (costPerLiter ? costPerLiter * volumeLiters : null)

    // Create delivery and update tank stock in a transaction
    const [delivery] = await db.$transaction([
      db.delivery.create({
        data: {
          stationId,
          supplierName,
          fuelType,
          volumeLiters,
          costPerLiter: costPerLiter ?? null,
          totalCost: calculatedTotalCost,
          deliveredAt: deliveredAt ? new Date(deliveredAt) : new Date(),
        },
        include: {
          station: { select: { id: true, name: true } },
        },
      }),
      db.tank.update({
        where: { id: tank.id },
        data: { currentStock: tank.currentStock + volumeLiters },
      }),
    ])

    return NextResponse.json({ ok: true, data: delivery }, { status: 201 })
  } catch (error) {
    console.error('[DELIVERIES_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create delivery' },
      { status: 500 }
    )
  }
}
