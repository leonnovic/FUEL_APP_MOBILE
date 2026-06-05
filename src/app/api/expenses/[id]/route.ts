import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('EXPENSES_PUT', async () => {
    const id = await getPathId(params)
    const body = await request.json()
    const { category, description, amount, date } = body

    const expense = await db.expense.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return apiSuccess(expense)
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('EXPENSES_DELETE', async () => {
    const id = await getPathId(params)
    await db.expense.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
