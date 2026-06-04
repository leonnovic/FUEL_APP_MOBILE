import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    return NextResponse.json({ ok: true, data: document })
  } catch (error) {
    console.error('[DOCUMENTS_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update document' },
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
    await db.document.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DOCUMENTS_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
