import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

const EPRA_MAX_PRICES = {
  Nairobi: { Petrol: 199.63, Diesel: 190.54, Kerosene: 169.48 },
  Mombasa: { Petrol: 196.23, Diesel: 187.14, Kerosene: 166.58 },
  Kisumu: { Petrol: 202.13, Diesel: 193.04, Kerosene: 171.68 },
  Nakuru: { Petrol: 200.83, Diesel: 191.74, Kerosene: 170.58 },
  Eldoret: { Petrol: 201.93, Diesel: 192.84, Kerosene: 171.48 },
  Nyeri: { Petrol: 200.53, Diesel: 191.44, Kerosene: 170.18 },
  Meru: { Petrol: 202.03, Diesel: 192.94, Kerosene: 171.68 },
  Malindi: { Petrol: 197.03, Diesel: 187.94, Kerosene: 167.38 },
  Garissa: { Petrol: 205.63, Diesel: 196.54, Kerosene: 175.28 },
  Lodwar: { Petrol: 208.13, Diesel: 199.04, Kerosene: 177.78 },
}

export async function GET() {
  return apiHandler('COMPLIANCE_GET', async () => {
    const dbPrices = await db.epraPrice.findMany({
      orderBy: { effectiveAt: 'desc' },
    })

    return apiSuccess({
      hardcoded: EPRA_MAX_PRICES,
      database: dbPrices,
      lastUpdated: '2025-01-15',
      currency: 'KES',
      unit: 'per liter',
    })
  })
}

export async function POST(request: NextRequest) {
  return apiHandler('COMPLIANCE_POST', async () => {
    const body = await request.json()
    const {
      sellerTin,
      buyerTin,
      fuelType,
      quantity,
      unitPrice,
    } = body

    if (!sellerTin || !fuelType || !quantity || !unitPrice) {
      return badRequest('Missing required fields: sellerTin, fuelType, quantity, unitPrice')
    }

    const subtotal = quantity * unitPrice
    const vatRate = 0.16
    const vatAmount = subtotal * vatRate
    const totalAmount = subtotal + vatAmount

    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const invoiceNumber = `ETI-${timestamp}-${random}`

    const invoice = await db.complianceInvoice.create({
      data: {
        invoiceNumber,
        sellerTin,
        buyerTin: buyerTin || null,
        fuelType,
        quantity,
        unitPrice,
        vatAmount,
        totalAmount,
      },
    })

    return apiSuccess({
      ...invoice,
      eTIMS: {
        compliant: true,
        vatRate: '16%',
        currency: 'KES',
        issuer: 'FuelPro Kenya',
        standard: 'KRA eTIMS v2.1',
      },
    }, 201)
  })
}
