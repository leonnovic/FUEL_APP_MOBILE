import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, conflict, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('COUPONS_GET', async () => {
    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(coupons)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('COUPONS_POST', async () => {
    const body = await request.json()
    const { code, type, value, maxUses, status } = body

    if (!code || value === undefined) {
      return badRequest('Coupon code and value are required')
    }

    const existing = await db.coupon.findUnique({ where: { code } })
    if (existing) {
      return conflict('Coupon code already exists')
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.toUpperCase(),
        type: type || 'percentage',
        value,
        maxUses: maxUses ?? 100,
        status: status || 'active',
      },
    })

    return apiSuccess(coupon, 201)
  })
}
