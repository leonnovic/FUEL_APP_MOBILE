import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (stationId) where.stationId = stationId
    if (status) where.status = status

    const transactions = await db.mpesaTransaction.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { initiatedAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: transactions })
  } catch (error) {
    console.error('[MPESA_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch M-Pesa transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, amount, stationId, saleId } = body

    if (!phoneNumber || !amount) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: phoneNumber, amount' },
        { status: 400 }
      )
    }

    // Simulated STK Push: auto-generate receipt number
    const receiptNumber = `QKR${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const checkoutRequestId = `ws_CO_${Date.now()}`
    const merchantRequestId = `mr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const transaction = await db.mpesaTransaction.create({
      data: {
        phoneNumber,
        amount: parseFloat(amount),
        receiptNumber,
        checkoutRequestId,
        merchantRequestId,
        status: 'success',
        resultDesc: 'The service request is processed successfully.',
        stationId: stationId || null,
        saleId: saleId || null,
        completedAt: new Date(),
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: transaction }, { status: 201 })
  } catch (error) {
    console.error('[MPESA_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create M-Pesa transaction' },
      { status: 500 }
    )
  }
}
