import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const documents = await db.document.findMany({
      include: { station: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ ok: true, data: documents })
  } catch (error) {
    console.error('[DOCUMENTS_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, type, fileType, size, folder, description, url, stationId } = body

    if (!name || !type) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: name, type' },
        { status: 400 }
      )
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

    return NextResponse.json({ ok: true, data: document }, { status: 201 })
  } catch (error) {
    console.error('[DOCUMENTS_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create document' },
      { status: 500 }
    )
  }
}
