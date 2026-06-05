import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiSuccess, badRequest, conflict, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('USERS_GET', async () => {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isGuest: true,
        createdAt: true,
        updatedAt: true,
        stations: { select: { stationId: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return apiSuccess(users.map(u => ({
      ...u,
      status: u.isGuest ? 'guest' : 'active',
      stationCount: u.stations.length,
      lastLogin: u.updatedAt.toISOString()
    })))
  })
}

export async function POST(req: NextRequest) {
  return apiHandler('USERS_POST', async () => {
    const body = await req.json()
    const { name, email, role = 'staff' } = body

    if (!name || !email) {
      return badRequest('Name and email are required')
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return conflict('Email already exists')
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: '$2b$10$demo_hash_not_for_production',
        role,
        isGuest: false,
      }
    })

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'active',
      stationCount: 0,
      lastLogin: user.createdAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
    }, 201)
  })
}
