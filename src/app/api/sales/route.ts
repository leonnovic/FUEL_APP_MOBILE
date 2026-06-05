import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, notFound, apiHandler } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  return apiHandler('SALES_GET', async () => {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const fuelType = searchParams.get('fuelType')
    const paymentMethod = searchParams.get('paymentMethod')

    const where: Record<string, unknown> = {}
    if (stationId) where.stationId = stationId
    if (fuelType) where.fuelType = fuelType
    if (paymentMethod) where.paymentMethod = paymentMethod

    const sales = await db.sale.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(sales)
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('SALES_POST', async () => {
    const body = await request.json()
    const {
      stationId,
      userId,
      fuelType,
      quantityLiters,
      pricePerLiter,
      paymentMethod,
      mpesaReceipt,
      customerName,
    } = body

    if (!stationId || !userId || !fuelType || !quantityLiters || !pricePerLiter) {
      return badRequest('Missing required fields: stationId, userId, fuelType, quantityLiters, pricePerLiter')
    }

    const totalAmount = quantityLiters * pricePerLiter

    const tank = await db.tank.findFirst({
      where: { stationId, fuelType },
    })

    if (!tank) {
      return notFound(`No ${fuelType} tank found at this station`)
    }

    if (tank.currentStock < quantityLiters) {
      return badRequest(`Insufficient stock. Available: ${tank.currentStock}L, Requested: ${quantityLiters}L`)
    }

    const [sale] = await db.$transaction([
      db.sale.create({
        data: {
          stationId,
          userId,
          fuelType,
          quantityLiters,
          pricePerLiter,
          totalAmount,
          paymentMethod: paymentMethod || 'cash',
          mpesaReceipt: mpesaReceipt || null,
          customerName: customerName || null,
        },
        include: {
          station: { select: { id: true, name: true } },
        },
      }),
      db.tank.update({
        where: { id: tank.id },
        data: { currentStock: tank.currentStock - quantityLiters },
      }),
    ])

    return apiSuccess(sale, 201)
  })
}
