import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, contact, fuelTypes, location, status } = body

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(contact !== undefined && { contact }),
        ...(fuelTypes !== undefined && { fuelTypes }),
        ...(location !== undefined && { location }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json({ ok: true, data: supplier })
  } catch (error) {
    console.error('[SUPPLIER_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update supplier' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    await db.supplier.delete({ where: { id } })

    return NextResponse.json({ ok: true, data: { id } })
  } catch (error) {
    console.error('[SUPPLIER_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}
