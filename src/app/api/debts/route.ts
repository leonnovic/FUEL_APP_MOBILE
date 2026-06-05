import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return apiHandler('DEBTS_GET', async () => {
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

    return apiSuccess(debts)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('DEBTS_POST', async () => {
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
      return badRequest('Missing required fields: customerName, amount')
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

    return apiSuccess(debt, 201)
  })
}
