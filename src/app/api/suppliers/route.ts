import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const suppliers = await db.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ok: true, data: suppliers })
  } catch (error) {
    console.error('[SUPPLIERS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, contact, fuelTypes, location, status } = body

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    const supplier = await db.supplier.create({
      data: {
        name,
        contact: contact || null,
        fuelTypes: fuelTypes || null,
        location: location || null,
        status: status || 'active',
      },
    })

    return NextResponse.json({ ok: true, data: supplier }, { status: 201 })
  } catch (error) {
    console.error('[SUPPLIERS_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}
