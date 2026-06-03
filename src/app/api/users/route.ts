import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
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
    return NextResponse.json({
      ok: true,
      data: users.map(u => ({
        ...u,
        status: u.isGuest ? 'guest' : 'active',
        stationCount: u.stations.length,
        lastLogin: u.updatedAt.toISOString()
      }))
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, role = 'staff' } = body

    if (!name || !email) {
      return NextResponse.json({ ok: false, error: 'Name and email are required' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Email already exists' }, { status: 409 })
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

    return NextResponse.json({
      ok: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: 'active',
        stationCount: 0,
        lastLogin: user.createdAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to create user' }, { status: 500 })
  }
}
