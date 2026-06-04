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

    const debts = await db.debt.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: debts })
  } catch (error) {
    console.error('[DEBTS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch debts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerName,
      customerPhone,
      amount,
      fuelType,
      stationId,
      tillNumber,
      bankName,
      branchName,
      accountHolder,
      accountNumber,
      contactMethod,
      contactDetail,
      dueDate,
      notes,
    } = body

    if (!customerName || !amount) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: customerName, amount' },
        { status: 400 }
      )
    }

    const debt = await db.debt.create({
      data: {
        customerName,
        customerPhone: customerPhone || null,
        amount: parseFloat(amount),
        fuelType: fuelType || null,
        stationId: stationId || null,
        tillNumber: tillNumber || null,
        bankName: bankName || null,
        branchName: branchName || null,
        accountHolder: accountHolder || null,
        accountNumber: accountNumber || null,
        contactMethod: contactMethod || null,
        contactDetail: contactDetail || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: debt }, { status: 201 })
  } catch (error) {
    console.error('[DEBTS_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create debt' },
      { status: 500 }
    )
  }
}
