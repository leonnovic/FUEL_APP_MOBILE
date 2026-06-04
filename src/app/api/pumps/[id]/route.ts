import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      pumpLabel,
      fuelType,
      openingReading,
      closingReading,
      openingLiters,
      closingLiters,
      shiftId,
      status,
      reset,
    } = body

    // If reset is requested, set closing = opening and reset sales
    if (reset) {
      const existing = await db.pump.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json(
          { ok: false, error: 'Pump not found' },
          { status: 404 }
        )
      }

      const pump = await db.pump.update({
        where: { id },
        data: {
          openingReading: existing.closingReading,
          closingReading: existing.closingReading,
          openingLiters: existing.closingLiters,
          closingLiters: existing.closingLiters,
          salesKsh: 0,
          salesLiters: 0,
          status: 'idle',
          lastResetAt: new Date(),
        },
        include: {
          station: { select: { id: true, name: true } },
        },
      })

      return NextResponse.json({ ok: true, data: pump })
    }

    // Auto-calculate sales from readings
    let salesKsh: number | undefined
    let salesLiters: number | undefined

    if (closingReading !== undefined || closingLiters !== undefined) {
      const existing = await db.pump.findUnique({ where: { id } })
      if (existing) {
        const cr = closingReading !== undefined ? parseFloat(closingReading) : existing.closingReading
        const or_ = openingReading !== undefined ? parseFloat(openingReading) : existing.openingReading
        const cl = closingLiters !== undefined ? parseFloat(closingLiters) : existing.closingLiters
        const ol = openingLiters !== undefined ? parseFloat(openingLiters) : existing.openingLiters

        salesKsh = cr - or_
        salesLiters = cl - ol
      }
    }

    const pump = await db.pump.update({
      where: { id },
      data: {
        ...(pumpLabel !== undefined && { pumpLabel }),
        ...(fuelType !== undefined && { fuelType }),
        ...(openingReading !== undefined && { openingReading: parseFloat(openingReading) }),
        ...(closingReading !== undefined && { closingReading: parseFloat(closingReading) }),
        ...(openingLiters !== undefined && { openingLiters: parseFloat(openingLiters) }),
        ...(closingLiters !== undefined && { closingLiters: parseFloat(closingLiters) }),
        ...(salesKsh !== undefined && { salesKsh }),
        ...(salesLiters !== undefined && { salesLiters }),
        ...(shiftId !== undefined && { shiftId }),
        ...(status !== undefined && { status }),
      },
      include: {
        station: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, data: pump })
  } catch (error) {
    console.error('[PUMPS_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update pump' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.pump.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PUMPS_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete pump' },
      { status: 500 }
    )
  }
}
