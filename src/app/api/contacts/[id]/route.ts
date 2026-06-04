import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, phone, email, type, company, address, balance, notes, status } = body

    const contact = await db.contact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(type !== undefined && { type }),
        ...(company !== undefined && { company }),
        ...(address !== undefined && { address }),
        ...(balance !== undefined && { balance: parseFloat(balance) }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json({ ok: true, data: contact })
  } catch (error) {
    console.error('[CONTACTS_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update contact' },
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
    await db.contact.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[CONTACTS_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}
