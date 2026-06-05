import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, notFound, apiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return apiHandler('SHIFTS_GET', async () => {
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

    return apiSuccess(shifts)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('SHIFTS_POST', async () => {
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

    // End existing shift
    if (id) {
      const existing = await db.shift.findUnique({ where: { id } })
      if (!existing) {
        return notFound('Shift')
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

      return apiSuccess(shift)
    }

    // Create new shift
    if (!stationId || !userId || !attendantName || !fuelType) {
      return badRequest('Missing required fields: stationId, userId, attendantName, fuelType')
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

    return apiSuccess(shift, 201)
  })
}
