import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return apiHandler('RECONCILIATION_GET', async () => {
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

    return apiSuccess(reconciliations)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('RECONCILIATION_POST', async () => {
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
      return badRequest('Missing required fields: stationId, fuelType, bookStock, physicalStock')
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

    return apiSuccess(reconciliation, 201)
  })
}
