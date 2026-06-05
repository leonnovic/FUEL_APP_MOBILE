import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, notFound, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('INVENTORY_GET', async () => {
    const tanks = await db.tank.findMany({
      include: {
        station: { select: { id: true, name: true, location: true, county: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = tanks.map((tank) => ({
      ...tank,
      isLow: tank.currentStock <= tank.alertThreshold,
      utilizationPct: tank.capacity > 0 ? Math.round((tank.currentStock / tank.capacity) * 100) : 0,
    }))

    return apiSuccess(data)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('INVENTORY_POST', async () => {
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
      return badRequest('stationId and fuelType are required')
    }

    // Update existing tank
    if (id) {
      const existing = await db.tank.findUnique({ where: { id } })
      if (!existing) {
        return notFound('Tank')
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

      return apiSuccess(tank)
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

    return apiSuccess(tank, 201)
  })
}
