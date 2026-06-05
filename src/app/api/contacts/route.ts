import { db } from '@/lib/db'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('CONTACTS_GET', async () => {
    const contacts = await db.contact.findMany({
      orderBy: { name: 'asc' },
    })
    return apiSuccess(contacts)
  })
}

export async function POST(request: Request) {
  return apiHandler('CONTACTS_POST', async () => {
    const body = await request.json()
    const { name, phone, email, type, company, address, balance, notes, status } = body

    if (!name) {
      return badRequest('Missing required field: name')
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

    return apiSuccess(contact, 201)
  })
}
