import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const station = await db.station.findUnique({
      where: { id },
      include: {
        tanks: true,
        sales: { orderBy: { createdAt: 'desc' }, take: 10 },
        shifts: { orderBy: { startedAt: 'desc' }, take: 10 },
        deliveries: { orderBy: { deliveredAt: 'desc' }, take: 10 },
        reconciliations: { orderBy: { recordedAt: 'desc' }, take: 10 },
      },
    })

    if (!station) {
      return NextResponse.json(
        { ok: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, data: station })
  } catch (error) {
    console.error('[STATION_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch station' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, location, phone, county, status, tankId, pricePerLiter, alertThreshold } = body

    const existing = await db.station.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    // Handle tank price update
    if (tankId) {
      const tankData: { pricePerLiter?: number; alertThreshold?: number } = {}
      if (pricePerLiter !== undefined) tankData.pricePerLiter = pricePerLiter
      if (alertThreshold !== undefined) tankData.alertThreshold = alertThreshold
      await db.tank.update({ where: { id: tankId }, data: tankData })
    }

    const station = await db.station.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(phone !== undefined && { phone }),
        ...(county !== undefined && { county }),
        ...(status !== undefined && { status }),
      },
      include: { tanks: true },
    })

    return NextResponse.json({ ok: true, data: station })
  } catch (error) {
    console.error('[STATION_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update station' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.station.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    await db.station.delete({ where: { id } })

    return NextResponse.json({ ok: true, data: { id } })
  } catch (error) {
    console.error('[STATION_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete station' },
      { status: 500 }
    )
  }
}
