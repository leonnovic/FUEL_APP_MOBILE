import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const flag = searchParams.get('flag')

    const where: Record<string, unknown> = {}
    if (stationId) where.stationId = stationId
    if (flag) where.flag = flag

    const reconciliations = await db.reconciliation.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { recordedAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: reconciliations })
  } catch (error) {
    console.error('[RECONCILIATION_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch reconciliations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stationId,
      fuelType,
      bookStock,
      physicalStock,
      deliveryReceived,
      notes,
    } = body

    if (!stationId || !fuelType || bookStock === undefined || physicalStock === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: stationId, fuelType, bookStock, physicalStock' },
        { status: 400 }
      )
    }

    const delivery = deliveryReceived ?? 0
    const variance = physicalStock - bookStock - delivery
    const variancePct = bookStock > 0 ? (Math.abs(variance) / bookStock) * 100 : 0

    let flag = 'normal'
    if (variancePct > 1) {
      flag = 'critical'
    } else if (variancePct > 0.5) {
      flag = 'warning'
    }

    const reconciliation = await db.reconciliation.create({
      data: {
        stationId,
        fuelType,
        bookStock,
        physicalStock,
        deliveryReceived: delivery,
        variance,
        variancePct,
        flag,
        notes: notes || null,
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: reconciliation }, { status: 201 })
  } catch (error) {
    console.error('[RECONCILIATION_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create reconciliation' },
      { status: 500 }
    )
  }
}
