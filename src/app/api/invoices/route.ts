import { db } from '@/lib/db'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('INVOICES_GET', async () => {
    const invoices = await db.invoice.findMany({
      include: { station: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(invoices)
  })
}

export async function POST(request: Request) {
  return apiHandler('INVOICES_POST', async () => {
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
    } = body

    if (!customerName) {
      return badRequest('Missing required field: customerName')
    }

    const count = await db.invoice.count()
    const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        customerName,
        ...(customerEmail !== undefined && { customerEmail }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(items !== undefined && { items }),
        subtotal: subtotal ? parseFloat(subtotal) : 0,
        taxAmount: taxAmount ? parseFloat(taxAmount) : 0,
        totalDue: totalDue ? parseFloat(totalDue) : 0,
        ...(status && { status }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(stationId && { stationId }),
        ...(notes !== undefined && { notes }),
      },
      include: { station: { select: { id: true, name: true } } },
    })

    return apiSuccess(invoice, 201)
  })
}
