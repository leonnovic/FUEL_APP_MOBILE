import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return apiHandler('PUMPS_GET', async () => {
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

    return apiSuccess(pumps)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('PUMPS_POST', async () => {
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
      return badRequest('Missing required fields: stationId, pumpLabel, fuelType')
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

    return apiSuccess(pump, 201)
  })
}
