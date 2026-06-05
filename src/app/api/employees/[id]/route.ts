import { db } from '@/lib/db'
import { apiSuccess, notFound, apiHandler, getPathId } from '@/lib/api-utils'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('EMPLOYEES_PUT', async () => {
    const id = await getPathId(params)
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
      const current = await db.employee.findUnique({ where: { id } })
      if (!current) {
        return notFound('Employee')
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

    return apiSuccess(employee)
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler('EMPLOYEES_DELETE', async () => {
    const id = await getPathId(params)
    await db.employee.delete({ where: { id } })
    return apiSuccess({ id })
  })
}
