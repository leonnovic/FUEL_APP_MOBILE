import { db } from '@/lib/db'
import { apiSuccess, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('INVOICES_PUT', async () => {
    const id = await getPathId(params)
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

    return apiSuccess(invoice)
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('INVOICES_DELETE', async () => {
    const id = await getPathId(params)
    await db.invoice.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
