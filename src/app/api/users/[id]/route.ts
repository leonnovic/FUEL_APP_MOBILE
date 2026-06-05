import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiSuccess, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler('USERS_PUT', async () => {
    const id = await getPathId(params)
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

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.isGuest ? 'guest' : 'active',
    })
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler('USERS_DELETE', async () => {
    const id = await getPathId(params)
    await db.user.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
