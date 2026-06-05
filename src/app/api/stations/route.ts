import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('STATIONS_GET', async () => {
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

    return apiSuccess(data)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('STATIONS_POST', async () => {
    const body = await request.json()
    const { name, location, phone, county, status } = body

    if (!name) {
      return badRequest('Station name is required')
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

    return apiSuccess(station, 201)
  })
}
