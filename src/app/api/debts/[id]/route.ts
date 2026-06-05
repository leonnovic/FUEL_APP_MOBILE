import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('DEBTS_PUT', async () => {
    const id = await getPathId(params)
    const body = await request.json()
    const {
      customerName,
      customerPhone,
      amount,
      fuelType,
      status,
      paidAmount,
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

    // If paying partial, add to existing paidAmount
    if (paidAmount !== undefined) {
      const existing = await db.debt.findUnique({ where: { id } })
      if (existing) {
        const newPaidAmount = existing.paidAmount + parseFloat(paidAmount)
        if (newPaidAmount >= existing.amount) {
          const debt = await db.debt.update({
            where: { id },
            data: { paidAmount: newPaidAmount, status: 'paid' },
            include: { station: { select: { id: true, name: true } } },
          })
          return apiSuccess(debt)
        }
        if (newPaidAmount > 0 && newPaidAmount < existing.amount) {
          const debt = await db.debt.update({
            where: { id },
            data: { paidAmount: newPaidAmount, status: 'partial' },
            include: { station: { select: { id: true, name: true } } },
          })
          return apiSuccess(debt)
        }
      }
    }

    const debt = await db.debt.update({
      where: { id },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(fuelType !== undefined && { fuelType }),
        ...(status !== undefined && { status }),
        ...(tillNumber !== undefined && { tillNumber }),
        ...(bankName !== undefined && { bankName }),
        ...(branchName !== undefined && { branchName }),
        ...(accountHolder !== undefined && { accountHolder }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(contactMethod !== undefined && { contactMethod }),
        ...(contactDetail !== undefined && { contactDetail }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return apiSuccess(debt)
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('DEBTS_DELETE', async () => {
    const id = await getPathId(params)
    await db.debt.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
