import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return apiHandler('EXPENSES_GET', async () => {
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

    return apiSuccess(expenses)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('EXPENSES_POST', async () => {
    const body = await request.json()
    const { stationId, category, description, amount, date } = body

    if (!stationId || !category || !description || !amount) {
      return badRequest('Missing required fields: stationId, category, description, amount')
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

    return apiSuccess(expense, 201)
  })
}
