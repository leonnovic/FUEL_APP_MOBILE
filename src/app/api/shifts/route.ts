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

    const shifts = await db.shift.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: shifts })
  } catch (error) {
    console.error('[SHIFTS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      stationId,
      userId,
      attendantName,
      fuelType,
      openingReading,
      closingReading,
      litersSold,
      cashCollected,
      status,
    } = body

    // If id is provided with closingReading, end the shift
    if (id) {
      const existing = await db.shift.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json(
          { ok: false, error: 'Shift not found' },
          { status: 404 }
        )
      }

      const shift = await db.shift.update({
        where: { id },
        data: {
          ...(closingReading !== undefined && { closingReading }),
          ...(litersSold !== undefined && { litersSold }),
          ...(cashCollected !== undefined && { cashCollected }),
          ...(status !== undefined && { status }),
          endedAt: new Date(),
        },
        include: {
          station: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json({ ok: true, data: shift })
    }

    // Create new shift
    if (!stationId || !userId || !attendantName || !fuelType) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: stationId, userId, attendantName, fuelType' },
        { status: 400 }
      )
    }

    const shift = await db.shift.create({
      data: {
        stationId,
        userId,
        attendantName,
        fuelType,
        openingReading: openingReading ?? 0,
        status: 'active',
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: shift }, { status: 201 })
  } catch (error) {
    console.error('[SHIFTS_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create/update shift' },
      { status: 500 }
    )
  }
}
