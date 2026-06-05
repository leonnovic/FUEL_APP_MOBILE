import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, notFound, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('SUPPLIER_PUT', async () => {
    const id = await getPathId(params)
    const body = await request.json()
    const { name, contact, fuelTypes, location, status } = body

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Supplier')
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

    return apiSuccess(supplier)
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('SUPPLIER_DELETE', async () => {
    const id = await getPathId(params)

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Supplier')
    }

    await db.supplier.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
