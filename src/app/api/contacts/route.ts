import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const contacts = await db.contact.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ ok: true, data: contacts })
  } catch (error) {
    console.error('[CONTACTS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, phone, email, type, company, address, balance, notes, status } = body

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const contact = await db.contact.create({
      data: {
        name,
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(type && { type }),
        ...(company !== undefined && { company }),
        ...(address !== undefined && { address }),
        ...(balance !== undefined && { balance: parseFloat(balance) }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
    })

    return NextResponse.json({ ok: true, data: contact }, { status: 201 })
  } catch (error) {
    console.error('[CONTACTS_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
