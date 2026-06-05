import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, notFound, apiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return apiHandler('DELIVERIES_GET', async () => {
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

    return apiSuccess(deliveries)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('DELIVERIES_POST', async () => {
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
      return badRequest('Missing required fields: stationId, supplierName, fuelType, volumeLiters')
    }

    const tank = await db.tank.findFirst({
      where: { stationId, fuelType },
    })

    if (!tank) {
      return notFound(`No ${fuelType} tank found at this station`)
    }

    const calculatedTotalCost = totalCost ?? (costPerLiter ? costPerLiter * volumeLiters : null)

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

    return apiSuccess(delivery, 201)
  })
}
