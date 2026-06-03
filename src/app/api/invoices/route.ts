import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
      include: { station: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ ok: true, data: invoices })
  } catch (error) {
    console.error('[INVOICES_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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
      return NextResponse.json(
        { ok: false, error: 'Missing required field: customerName' },
        { status: 400 }
      )
    }

    // Auto-generate invoice number
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

    return NextResponse.json({ ok: true, data: invoice }, { status: 201 })
  } catch (error) {
    console.error('[INVOICES_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
