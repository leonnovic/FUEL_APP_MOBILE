import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // If salary fields are provided, recalculate netPay
    let netPay: number | undefined
    if (
      basicSalary !== undefined ||
      houseAllow !== undefined ||
      transportAllow !== undefined ||
      nhifDeduction !== undefined ||
      nssfDeduction !== undefined ||
      payeDeduction !== undefined ||
      otherDeductions !== undefined
    ) {
      // Fetch current values for fields not provided
      const current = await db.employee.findUnique({ where: { id } })
      if (!current) {
        return NextResponse.json(
          { ok: false, error: 'Employee not found' },
          { status: 404 }
        )
      }

      const bs = basicSalary !== undefined ? parseFloat(basicSalary) : current.basicSalary
      const ha = houseAllow !== undefined ? parseFloat(houseAllow) : current.houseAllow
      const ta = transportAllow !== undefined ? parseFloat(transportAllow) : current.transportAllow
      const nhif = nhifDeduction !== undefined ? parseFloat(nhifDeduction) : current.nhifDeduction
      const nssf = nssfDeduction !== undefined ? parseFloat(nssfDeduction) : current.nssfDeduction
      const paye = payeDeduction !== undefined ? parseFloat(payeDeduction) : current.payeDeduction
      const other = otherDeductions !== undefined ? parseFloat(otherDeductions) : current.otherDeductions

      netPay = bs + ha + ta - nhif - nssf - paye - other
    }

    const employee = await db.employee.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(position !== undefined && { position }),
        ...(basicSalary !== undefined && { basicSalary: parseFloat(basicSalary) }),
        ...(houseAllow !== undefined && { houseAllow: parseFloat(houseAllow) }),
        ...(transportAllow !== undefined && { transportAllow: parseFloat(transportAllow) }),
        ...(nhifDeduction !== undefined && { nhifDeduction: parseFloat(nhifDeduction) }),
        ...(nssfDeduction !== undefined && { nssfDeduction: parseFloat(nssfDeduction) }),
        ...(payeDeduction !== undefined && { payeDeduction: parseFloat(payeDeduction) }),
        ...(otherDeductions !== undefined && { otherDeductions: parseFloat(otherDeductions) }),
        ...(netPay !== undefined && { netPay }),
        ...(stationId !== undefined && { stationId }),
        ...(status !== undefined && { status }),
        ...(dateJoined !== undefined && { dateJoined: new Date(dateJoined) }),
      },
      include: { station: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ ok: true, data: employee })
  } catch (error) {
    console.error('[EMPLOYEES_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update employee' },
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
    await db.employee.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[EMPLOYEES_DELETE]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
