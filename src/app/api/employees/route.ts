import { db } from '@/lib/db'
import { apiSuccess, badRequest, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('EMPLOYEES_GET', async () => {
    const employees = await db.employee.findMany({
      include: { station: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(employees)
  })
}

export async function POST(request: Request) {
  return apiHandler('EMPLOYEES_POST', async () => {
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
      return badRequest('Missing required fields: name, position')
    }

    const bs = basicSalary ? parseFloat(basicSalary) : 0
    const ha = houseAllow ? parseFloat(houseAllow) : 0
    const ta = transportAllow ? parseFloat(transportAllow) : 0
    const nhif = nhifDeduction ? parseFloat(nhifDeduction) : 0
    const nssf = nssfDeduction ? parseFloat(nssfDeduction) : 0
    const paye = payeDeduction ? parseFloat(payeDeduction) : 0
    const other = otherDeductions ? parseFloat(otherDeductions) : 0

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

    return apiSuccess(employee, 201)
  })
}
