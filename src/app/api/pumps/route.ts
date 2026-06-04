import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (stationId) where.stationId = stationId
    if (status) where.status = status

    const pumps = await db.pump.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: pumps })
  } catch (error) {
    console.error('[PUMPS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch pumps' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stationId,
      pumpLabel,
      fuelType,
      openingReading,
      openingLiters,
      shiftId,
    } = body

    if (!stationId || !pumpLabel || !fuelType) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: stationId, pumpLabel, fuelType' },
        { status: 400 }
      )
    }

    const pump = await db.pump.create({
      data: {
        stationId,
        pumpLabel,
        fuelType,
        openingReading: openingReading ? parseFloat(openingReading) : 0,
        openingLiters: openingLiters ? parseFloat(openingLiters) : 0,
        shiftId: shiftId || null,
        status: 'idle',
        lastResetAt: new Date(),
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: pump }, { status: 201 })
  } catch (error) {
    console.error('[PUMPS_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create pump' },
      { status: 500 }
    )
  }
}
