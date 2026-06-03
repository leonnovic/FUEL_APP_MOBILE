import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { code, type, value, maxUses, status } = body

    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    const coupon = await db.coupon.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value }),
        ...(maxUses !== undefined && { maxUses }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json({ ok: true, data: coupon })
  } catch (error) {
    console.error('[COUPON_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update coupon' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Coupon not found' },
        { status: 404 }
      )
    }

    await db.coupon.delete({ where: { id } })

    return NextResponse.json({ ok: true, data: { id } })
  } catch (error) {
    console.error('[COUPON_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete coupon' },
      { status: 500 }
    )
  }
}
