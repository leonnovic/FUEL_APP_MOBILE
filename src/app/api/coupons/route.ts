import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const coupons = await db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: coupons })
  } catch (error) {
    console.error('[COUPONS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch coupons' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, type, value, maxUses, status } = body

    if (!code || value === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Coupon code and value are required' },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const existing = await db.coupon.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'Coupon code already exists' },
        { status: 409 }
      )
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

    return NextResponse.json({ ok: true, data: coupon }, { status: 201 })
  } catch (error) {
    console.error('[COUPONS_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create coupon' },
      { status: 500 }
    )
  }
}
