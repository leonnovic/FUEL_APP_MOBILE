import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const tanks = await db.tank.findMany({
      include: {
        station: { select: { id: true, name: true, location: true, county: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Enrich with alert status
    const data = tanks.map((tank) => ({
      ...tank,
      isLow: tank.currentStock <= tank.alertThreshold,
      utilizationPct: tank.capacity > 0 ? Math.round((tank.currentStock / tank.capacity) * 100) : 0,
    }))

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('[INVENTORY_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch inventory' },
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
      fuelType,
      currentStock,
      capacity,
      pricePerLiter,
      alertThreshold,
    } = body

    if (!stationId || !fuelType) {
      return NextResponse.json(
        { ok: false, error: 'stationId and fuelType are required' },
        { status: 400 }
      )
    }

    // If id is provided, update; otherwise create
    if (id) {
      const existing = await db.tank.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json(
          { ok: false, error: 'Tank not found' },
          { status: 404 }
        )
      }

      const tank = await db.tank.update({
        where: { id },
        data: {
          ...(fuelType !== undefined && { fuelType }),
          ...(currentStock !== undefined && { currentStock }),
          ...(capacity !== undefined && { capacity }),
          ...(pricePerLiter !== undefined && { pricePerLiter }),
          ...(alertThreshold !== undefined && { alertThreshold }),
        },
        include: {
          station: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json({ ok: true, data: tank })
    }

    // Create new tank
    const tank = await db.tank.create({
      data: {
        stationId,
        fuelType,
        currentStock: currentStock ?? 0,
        capacity: capacity ?? 20000,
        pricePerLiter: pricePerLiter ?? 0,
        alertThreshold: alertThreshold ?? 1000,
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: tank }, { status: 201 })
  } catch (error) {
    console.error('[INVENTORY_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create/update tank' },
      { status: 500 }
    )
  }
}
