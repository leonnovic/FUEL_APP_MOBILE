import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      customerName,
      customerEmail,
      customerPhone,
      items,
      subtotal,
      taxAmount,
      totalDue,
      status,
      dueDate,
      stationId,
      notes,
      paidAt,
    } = body

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        ...(customerName !== undefined && { customerName }),
        ...(customerEmail !== undefined && { customerEmail }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(items !== undefined && { items }),
        ...(subtotal !== undefined && { subtotal: parseFloat(subtotal) }),
        ...(taxAmount !== undefined && { taxAmount: parseFloat(taxAmount) }),
        ...(totalDue !== undefined && { totalDue: parseFloat(totalDue) }),
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(stationId !== undefined && { stationId }),
        ...(notes !== undefined && { notes }),
        ...(paidAt !== undefined && { paidAt: paidAt ? new Date(paidAt) : null }),
      },
      include: { station: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ ok: true, data: invoice })
  } catch (error) {
    console.error('[INVOICES_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.invoice.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[INVOICES_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
