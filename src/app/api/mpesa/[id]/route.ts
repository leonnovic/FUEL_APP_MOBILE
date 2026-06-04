import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, receiptNumber, resultDesc, completedAt } = body

    const transaction = await db.mpesaTransaction.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(receiptNumber !== undefined && { receiptNumber }),
        ...(resultDesc !== undefined && { resultDesc }),
        ...(completedAt !== undefined && { completedAt: new Date(completedAt) }),
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: transaction })
  } catch (error) {
    console.error('[MPESA_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update M-Pesa transaction' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.mpesaTransaction.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[MPESA_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete M-Pesa transaction' },
      { status: 500 }
    )
  }
}
