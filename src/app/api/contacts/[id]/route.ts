import { db } from '@/lib/db'
import { apiSuccess, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('CONTACTS_PUT', async () => {
    const id = await getPathId(params)
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

    return apiSuccess(contact)
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('CONTACTS_DELETE', async () => {
    const id = await getPathId(params)
    await db.contact.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
