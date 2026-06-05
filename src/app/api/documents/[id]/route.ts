import { db } from '@/lib/db'
import { apiSuccess, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('DOCUMENTS_PUT', async () => {
    const id = await getPathId(params)
    const body = await request.json()
    const { name, type, fileType, size, folder, description, url, stationId } = body

    const document = await db.document.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(fileType !== undefined && { fileType }),
        ...(size !== undefined && { size }),
        ...(folder !== undefined && { folder }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url }),
        ...(stationId !== undefined && { stationId }),
      },
      include: { station: { select: { id: true, name: true } } },
    })

    return apiSuccess(document)
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('DOCUMENTS_DELETE', async () => {
    const id = await getPathId(params)
    await db.document.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
