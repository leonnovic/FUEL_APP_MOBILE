import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    let profile = await db.companyProfile.findFirst()

    // Create default profile if none exists
    if (!profile) {
      profile = await db.companyProfile.create({
        data: {
          name: 'FuelPro',
          currency: 'KES',
          taxRate: 16,
        },
      })
    }

    return NextResponse.json({ ok: true, data: profile })
  } catch (error) {
    console.error('[COMPANY_GET]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch company profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
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

    // Find existing profile or create one
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

    return NextResponse.json({ ok: true, data: profile })
  } catch (error) {
    console.error('[COMPANY_PUT]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update company profile' },
      { status: 500 }
    )
  }
}
