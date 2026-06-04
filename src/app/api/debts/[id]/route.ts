import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    let newPaidAmount: number | undefined
    if (paidAmount !== undefined) {
      const existing = await db.debt.findUnique({ where: { id } })
      if (existing) {
        newPaidAmount = existing.paidAmount + parseFloat(paidAmount)
        // Auto-update status if fully paid
        if (newPaidAmount >= existing.amount) {
          const debt = await db.debt.update({
            where: { id },
            data: {
              paidAmount: newPaidAmount,
              status: 'paid',
            },
            include: {
              station: { select: { id: true, name: true } },
            },
          })
          return NextResponse.json({ ok: true, data: debt })
        }
        // Mark as partial if some amount paid but not full
        if (newPaidAmount > 0 && newPaidAmount < existing.amount) {
          const debt = await db.debt.update({
            where: { id },
            data: {
              paidAmount: newPaidAmount,
              status: 'partial',
            },
            include: {
              station: { select: { id: true, name: true } },
            },
          })
          return NextResponse.json({ ok: true, data: debt })
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

    return NextResponse.json({ ok: true, data: debt })
  } catch (error) {
    console.error('[DEBTS_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update debt' },
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
    await db.debt.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DEBTS_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete debt' },
      { status: 500 }
    )
  }
}
