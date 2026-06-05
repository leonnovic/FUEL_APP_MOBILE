import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { apiSuccess, apiHandler } from '@/lib/api-utils'

export async function GET() {
  return apiHandler('COMPANY_GET', async () => {
    let profile = await db.companyProfile.findFirst()

    if (!profile) {
      profile = await db.companyProfile.create({
        data: {
          name: 'FuelPro',
          currency: 'KES',
          taxRate: 16,
        },
      })
    }

    return apiSuccess(profile)
  })
}

export async function PUT(request: NextRequest) {
  return apiHandler('COMPANY_PUT', async () => {
    const body = await request.json()
    const {
      name,
      logo,
      poBox,
      contacts,
      email,
      bankName,
      branchName,
      accountHolder,
      accountNumber,
      currency,
      taxRate,
      receiptFooter,
    } = body

    let profile = await db.companyProfile.findFirst()

    if (!profile) {
      profile = await db.companyProfile.create({
        data: {
          name: name || 'FuelPro',
          logo: logo || null,
          poBox: poBox || null,
          contacts: contacts || null,
          email: email || null,
          bankName: bankName || null,
          branchName: branchName || null,
          accountHolder: accountHolder || null,
          accountNumber: accountNumber || null,
          currency: currency || 'KES',
          taxRate: taxRate !== undefined ? parseFloat(taxRate) : 16,
          receiptFooter: receiptFooter || null,
        },
      })
    } else {
      profile = await db.companyProfile.update({
        where: { id: profile.id },
        data: {
          ...(name !== undefined && { name }),
          ...(logo !== undefined && { logo }),
          ...(poBox !== undefined && { poBox }),
          ...(contacts !== undefined && { contacts }),
          ...(email !== undefined && { email }),
          ...(bankName !== undefined && { bankName }),
          ...(branchName !== undefined && { branchName }),
          ...(accountHolder !== undefined && { accountHolder }),
          ...(accountNumber !== undefined && { accountNumber }),
          ...(currency !== undefined && { currency }),
          ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
          ...(receiptFooter !== undefined && { receiptFooter }),
        },
      })
    }

    return apiSuccess(profile)
  })
}
