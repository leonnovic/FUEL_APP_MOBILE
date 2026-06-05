import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return apiHandler('MPESA_GET', async () => {
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

    return apiSuccess(transactions)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('MPESA_POST', async () => {
    const body = await request.json()
    const { phoneNumber, amount, stationId, saleId } = body

    if (!phoneNumber || !amount) {
      return badRequest('Missing required fields: phoneNumber, amount')
    }

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

    return apiSuccess(transaction, 201)
  })
}
