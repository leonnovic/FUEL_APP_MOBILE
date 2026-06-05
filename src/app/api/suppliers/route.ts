import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('SUPPLIERS_GET', async () => {
    const suppliers = await db.supplier.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(suppliers)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('SUPPLIERS_POST', async () => {
    const body = await request.json()
    const { name, contact, fuelTypes, location, status } = body

    if (!name) {
      return badRequest('Supplier name is required')
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

    return apiSuccess(supplier, 201)
  })
}
