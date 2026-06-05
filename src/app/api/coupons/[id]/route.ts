import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, notFound, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('COUPON_PUT', async () => {
    const id = await getPathId(params)
    const body = await request.json()
    const { code, type, value, maxUses, uses, status } = body

    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Coupon')
    }

    const coupon = await db.coupon.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value }),
        ...(maxUses !== undefined && { maxUses }),
        ...(uses !== undefined && { uses }),
        ...(status !== undefined && { status }),
      },
    })

    return apiSuccess(coupon)
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('COUPON_DELETE', async () => {
    const id = await getPathId(params)

    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Coupon')
    }

    await db.coupon.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
