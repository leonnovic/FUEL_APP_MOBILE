import { db } from '@/lib/db'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('DOCUMENTS_GET', async () => {
    const documents = await db.document.findMany({
      include: { station: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(documents)
  })
}

export async function POST(request: Request) {
  return apiHandler('DOCUMENTS_POST', async () => {
    const body = await request.json()
    const { name, type, fileType, size, folder, description, url, stationId } = body

    if (!name || !type) {
      return badRequest('Missing required fields: name, type')
    }

    const document = await db.document.create({
      data: {
        name,
        type,
        ...(fileType !== undefined && { fileType }),
        ...(size !== undefined && { size }),
        ...(folder && { folder }),
        ...(description !== undefined && { description }),
        ...(url !== undefined && { url }),
        ...(stationId && { stationId }),
      },
      include: { station: { select: { id: true, name: true } } },
    })

    return apiSuccess(document, 201)
  })
}
