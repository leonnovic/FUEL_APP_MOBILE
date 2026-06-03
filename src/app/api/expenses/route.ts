import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = {}
    if (stationId) where.stationId = stationId
    if (category) where.category = category

    const expenses = await db.expense.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ ok: true, data: expenses })
  } catch (error) {
    console.error('[EXPENSES_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stationId, category, description, amount, date } = body

    if (!stationId || !category || !description || !amount) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: stationId, category, description, amount' },
        { status: 400 }
      )
    }

    const expense = await db.expense.create({
      data: {
        stationId,
        category,
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: expense }, { status: 201 })
  } catch (error) {
    console.error('[EXPENSES_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}
