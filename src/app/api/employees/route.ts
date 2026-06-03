import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      include: { station: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ ok: true, data: employees })
  } catch (error) {
    console.error('[EMPLOYEES_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      phone,
      email,
      position,
      basicSalary,
      houseAllow,
      transportAllow,
      nhifDeduction,
      nssfDeduction,
      payeDeduction,
      otherDeductions,
      stationId,
      status,
      dateJoined,
    } = body

    if (!name || !position) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: name, position' },
        { status: 400 }
      )
    }

    const bs = basicSalary ? parseFloat(basicSalary) : 0
    const ha = houseAllow ? parseFloat(houseAllow) : 0
    const ta = transportAllow ? parseFloat(transportAllow) : 0
    const nhif = nhifDeduction ? parseFloat(nhifDeduction) : 0
    const nssf = nssfDeduction ? parseFloat(nssfDeduction) : 0
    const paye = payeDeduction ? parseFloat(payeDeduction) : 0
    const other = otherDeductions ? parseFloat(otherDeductions) : 0

    // Auto-calculate net pay
    const netPay = bs + ha + ta - nhif - nssf - paye - other

    const employee = await db.employee.create({
      data: {
        name,
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        position,
        basicSalary: bs,
        houseAllow: ha,
        transportAllow: ta,
        nhifDeduction: nhif,
        nssfDeduction: nssf,
        payeDeduction: paye,
        otherDeductions: other,
        netPay,
        ...(stationId && { stationId }),
        ...(status && { status }),
        ...(dateJoined && { dateJoined: new Date(dateJoined) }),
      },
      include: { station: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ ok: true, data: employee }, { status: 201 })
  } catch (error) {
    console.error('[EMPLOYEES_POST]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}
