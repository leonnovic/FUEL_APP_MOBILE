import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('MPESA_PUT', async () => {
    const id = await getPathId(params)
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

    return apiSuccess(transaction)
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('MPESA_DELETE', async () => {
    const id = await getPathId(params)
    await db.mpesaTransaction.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
