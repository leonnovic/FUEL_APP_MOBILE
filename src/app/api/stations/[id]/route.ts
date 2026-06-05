import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, notFound, apiHandler, getPathId } from '@/lib/api-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('STATION_GET', async () => {
    const id = await getPathId(params)
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
      return notFound('Station')
    }

    return apiSuccess(station)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('STATION_PUT', async () => {
    const id = await getPathId(params)
    const body = await request.json()
    const { name, location, phone, county, status, tankId, pricePerLiter, alertThreshold } = body

    const existing = await db.station.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Station')
    }

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

    return apiSuccess(station)
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('STATION_DELETE', async () => {
    const id = await getPathId(params)

    const existing = await db.station.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Station')
    }

    await db.station.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
