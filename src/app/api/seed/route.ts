import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Check if data already exists
    const stationCount = await db.station.count()
    if (stationCount > 0) {
      return NextResponse.json(
        { ok: false, error: 'Database already seeded. Reset first.' },
        { status: 409 }
      )
    }

    // 1. Create a demo user
    const user = await db.user.create({
      data: {
        email: 'admin@fuelpro.ke',
        name: 'Admin User',
        passwordHash: '$2b$10$dummyhashnotforproduction',
        role: 'owner',
        tier: 'pro',
      },
    })

    // 2. Create 3 stations
    const station1 = await db.station.create({
      data: {
        name: 'FuelPro Nairobi CBD',
        location: 'Kenyatta Avenue, Nairobi',
        phone: '+254712345001',
        county: 'Nairobi',
        status: 'active',
      },
    })

    const station2 = await db.station.create({
      data: {
        name: 'FuelPro Mombasa Road',
        location: 'Mombasa Road, Nairobi',
        phone: '+254712345002',
        county: 'Nairobi',
        status: 'active',
      },
    })

    const station3 = await db.station.create({
      data: {
        name: 'FuelPro Thika',
        location: 'Thika Town, Kiambu',
        phone: '+254712345003',
        county: 'Kiambu',
        status: 'active',
      },
    })

    // Add user as member to all stations
    await db.stationMember.createMany({
      data: [
        { userId: user.id, stationId: station1.id, role: 'owner' },
        { userId: user.id, stationId: station2.id, role: 'owner' },
        { userId: user.id, stationId: station3.id, role: 'owner' },
      ],
    })

    // 3. Create tanks for each station
    const tankData = [
      // Station 1 tanks
      { stationId: station1.id, fuelType: 'Petrol', currentStock: 15000, capacity: 20000, pricePerLiter: 199.63, alertThreshold: 3000 },
      { stationId: station1.id, fuelType: 'Diesel', currentStock: 12000, capacity: 20000, pricePerLiter: 190.54, alertThreshold: 3000 },
      { stationId: station1.id, fuelType: 'Kerosene', currentStock: 4500, capacity: 10000, pricePerLiter: 169.48, alertThreshold: 2000 },

      // Station 2 tanks
      { stationId: station2.id, fuelType: 'Petrol', currentStock: 18000, capacity: 25000, pricePerLiter: 199.63, alertThreshold: 4000 },
      { stationId: station2.id, fuelType: 'Diesel', currentStock: 22000, capacity: 25000, pricePerLiter: 190.54, alertThreshold: 4000 },

      // Station 3 tanks
      { stationId: station3.id, fuelType: 'Petrol', currentStock: 2500, capacity: 15000, pricePerLiter: 199.63, alertThreshold: 3000 },
      { stationId: station3.id, fuelType: 'Diesel', currentStock: 800, capacity: 15000, pricePerLiter: 190.54, alertThreshold: 3000 },
      { stationId: station3.id, fuelType: 'Kerosene', currentStock: 600, capacity: 8000, pricePerLiter: 169.48, alertThreshold: 2000 },
    ]

    const tanks = await db.tank.createMany({ data: tankData })

    // 4. Create some sales (today and recent)
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const salesData = [
      { stationId: station1.id, userId: user.id, fuelType: 'Petrol', quantityLiters: 50, pricePerLiter: 199.63, totalAmount: 9981.5, paymentMethod: 'mpesa', mpesaReceipt: 'QKR3L5M7X9' },
      { stationId: station1.id, userId: user.id, fuelType: 'Diesel', quantityLiters: 120, pricePerLiter: 190.54, totalAmount: 22864.8, paymentMethod: 'card', customerName: 'Kenya Logistics Ltd' },
      { stationId: station2.id, userId: user.id, fuelType: 'Petrol', quantityLiters: 30, pricePerLiter: 199.63, totalAmount: 5988.9, paymentMethod: 'cash' },
      { stationId: station2.id, userId: user.id, fuelType: 'Diesel', quantityLiters: 200, pricePerLiter: 190.54, totalAmount: 38108.0, paymentMethod: 'mpesa', mpesaReceipt: 'PNT8K2J4R6', customerName: 'Transline Express' },
      { stationId: station3.id, userId: user.id, fuelType: 'Kerosene', quantityLiters: 20, pricePerLiter: 169.48, totalAmount: 3389.6, paymentMethod: 'cash' },
    ]

    const salesWithDates = salesData.map((s, i) => ({
      ...s,
      createdAt: [oneHourAgo, twoHoursAgo, now, yesterday, oneHourAgo][i],
    }))

    const sales = await db.sale.createMany({ data: salesWithDates })

    // 5. Create shifts
    const shiftsData = [
      { stationId: station1.id, userId: user.id, attendantName: 'James Mwangi', fuelType: 'Petrol', openingReading: 145230.5, status: 'active' },
      { stationId: station1.id, userId: user.id, attendantName: 'Grace Wanjiku', fuelType: 'Diesel', openingReading: 98420.0, status: 'active' },
      { stationId: station2.id, userId: user.id, attendantName: 'Peter Ochieng', fuelType: 'Petrol', openingReading: 267890.3, closingReading: 267980.3, litersSold: 90, cashCollected: 17966.7, status: 'completed', endedAt: oneHourAgo },
    ]

    const shifts = await db.shift.createMany({ data: shiftsData })

    // 6. Create suppliers
    const suppliers = await db.supplier.createMany({
      data: [
        { name: 'KenolKobil Supplies', contact: '+254720100200', fuelTypes: 'Petrol,Diesel', location: 'Nairobi', status: 'active' },
        { name: 'TotalEnergies Kenya', contact: '+254720300400', fuelTypes: 'Petrol,Diesel,Kerosene', location: 'Mombasa', status: 'active' },
        { name: 'Vivo Energy Kenya', contact: '+254720500600', fuelTypes: 'Petrol,Diesel', location: 'Nakuru', status: 'active' },
        { name: 'Oryx Energies', contact: '+254720700800', fuelTypes: 'Kerosene,Diesel', location: 'Eldoret', status: 'active' },
      ],
    })

    // 7. Create EPRA prices
    const effectiveDate = new Date('2025-01-15')
    const epraPrices = await db.epraPrice.createMany({
      data: [
        { fuelType: 'Petrol', region: 'Nairobi', maxPrice: 199.63, effectiveAt: effectiveDate },
        { fuelType: 'Diesel', region: 'Nairobi', maxPrice: 190.54, effectiveAt: effectiveDate },
        { fuelType: 'Kerosene', region: 'Nairobi', maxPrice: 169.48, effectiveAt: effectiveDate },
        { fuelType: 'Petrol', region: 'Mombasa', maxPrice: 196.23, effectiveAt: effectiveDate },
        { fuelType: 'Diesel', region: 'Mombasa', maxPrice: 187.14, effectiveAt: effectiveDate },
        { fuelType: 'Kerosene', region: 'Mombasa', maxPrice: 166.58, effectiveAt: effectiveDate },
        { fuelType: 'Petrol', region: 'Kisumu', maxPrice: 202.13, effectiveAt: effectiveDate },
        { fuelType: 'Diesel', region: 'Kisumu', maxPrice: 193.04, effectiveAt: effectiveDate },
        { fuelType: 'Kerosene', region: 'Kisumu', maxPrice: 171.68, effectiveAt: effectiveDate },
      ],
    })

    // 8. Create a coupon
    const coupon = await db.coupon.create({
      data: {
        code: 'FUEL10',
        type: 'percentage',
        value: 10,
        maxUses: 500,
        uses: 0,
        status: 'active',
      },
    })

    // 9. Create some deliveries
    const deliveries = await db.delivery.createMany({
      data: [
        { stationId: station1.id, supplierName: 'KenolKobil Supplies', fuelType: 'Petrol', volumeLiters: 5000, costPerLiter: 185.0, totalCost: 925000, deliveredAt: twoHoursAgo },
        { stationId: station2.id, supplierName: 'TotalEnergies Kenya', fuelType: 'Diesel', volumeLiters: 8000, costPerLiter: 178.5, totalCost: 1428000, deliveredAt: yesterday },
        { stationId: station3.id, supplierName: 'Vivo Energy Kenya', fuelType: 'Kerosene', volumeLiters: 3000, costPerLiter: 155.0, totalCost: 465000, deliveredAt: yesterday },
      ],
    })

    // 10. Create a reconciliation record
    const reconciliation = await db.reconciliation.create({
      data: {
        stationId: station1.id,
        fuelType: 'Petrol',
        bookStock: 15050,
        physicalStock: 15000,
        deliveryReceived: 5000,
        variance: -50,
        variancePct: 0.33,
        flag: 'normal',
        notes: 'Minor variance within acceptable range',
      },
    })

    return NextResponse.json({
      ok: true,
      data: {
        user: user.id,
        stations: 3,
        tanks: tankData.length,
        sales: salesData.length,
        shifts: shiftsData.length,
        suppliers: 4,
        epraPrices: 9,
        coupon: coupon.code,
        deliveries: 3,
        reconciliations: 1,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[SEED_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to seed database' },
      { status: 500 }
    )
  }
}
