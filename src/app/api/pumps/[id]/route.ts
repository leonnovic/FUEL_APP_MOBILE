import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, notFound, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('PUMPS_PUT', async () => {
    const id = await getPathId(params)
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

    // Reset pump readings
    if (reset) {
      const existing = await db.pump.findUnique({ where: { id } })
      if (!existing) {
        return notFound('Pump')
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
        include: { station: { select: { id: true, name: true } } },
      })

      return apiSuccess(pump)
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
      include: { station: { select: { id: true, name: true } } },
    })

    return apiSuccess(pump)
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('PUMPS_DELETE', async () => {
    const id = await getPathId(params)

    const existing = await db.pump.findUnique({ where: { id } })
    if (!existing) {
      return notFound('Pump')
    }

    await db.pump.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
