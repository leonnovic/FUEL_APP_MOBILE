import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const stations = await db.station.findMany({
      include: {
        tanks: true,
        _count: {
          select: { tanks: true, sales: true, shifts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = stations.map((s) => ({
      ...s,
      tankCount: s._count.tanks,
      salesCount: s._count.sales,
      shiftsCount: s._count.shifts,
    }))

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('[STATIONS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch stations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, location, phone, county, status } = body

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Station name is required' },
        { status: 400 }
      )
    }

    const station = await db.station.create({
      data: {
        name,
        location: location || null,
        phone: phone || null,
        county: county || null,
        status: status || 'active',
      },
      include: { tanks: true },
    })

    return NextResponse.json({ ok: true, data: station }, { status: 201 })
  } catch (error) {
    console.error('[STATIONS_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create station' },
      { status: 500 }
    )
  }
}
