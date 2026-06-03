import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, email, role, status } = body

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role) updateData.role = role
    if (status !== undefined) updateData.isGuest = status === 'guest'

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      ok: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.isGuest ? 'guest' : 'active',
      }
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to delete user' }, { status: 500 })
  }
}
