import { NextRequest, NextResponse } from 'next/server'

const adminData = {
  users: [
    { id: 1, name: 'Admin User', email: 'admin@fuelpro.ke', role: 'Super Admin', status: 'active', lastLogin: '2026-06-03 10:00 AM' },
    { id: 2, name: 'James Mwangi', email: 'james@fuelpro.ke', role: 'Station Manager', status: 'active', lastLogin: '2026-06-03 06:15 AM' },
    { id: 3, name: 'Sarah Wanjiku', email: 'sarah@fuelpro.ke', role: 'Station Manager', status: 'active', lastLogin: '2026-06-03 06:00 AM' },
    { id: 4, name: 'John Doe', email: 'john@fuelpro.ke', role: 'Attendant', status: 'active', lastLogin: '2026-06-03 06:00 AM' },
    { id: 5, name: 'Jane Smith', email: 'jane@fuelpro.ke', role: 'Attendant', status: 'active', lastLogin: '2026-06-03 06:00 AM' },
    { id: 6, name: 'Mike Johnson', email: 'mike@fuelpro.ke', role: 'Attendant', status: 'inactive', lastLogin: '2026-05-28 14:00 PM' },
  ],
  auditLogs: [
    { id: 1, user: 'Admin User', action: 'Updated fuel price', details: 'Super Petrol: KES 192.00 → KES 195.50', timestamp: '2026-06-03 09:45 AM', severity: 'warning' },
    { id: 2, user: 'James Mwangi', action: 'Started shift', details: 'Nairobi Central - Shift #127', timestamp: '2026-06-03 06:00 AM', severity: 'info' },
    { id: 3, user: 'Admin User', action: 'Added new station', details: 'Kisumu Lake station added', timestamp: '2026-06-02 04:30 PM', severity: 'info' },
    { id: 4, user: 'System', action: 'Price validation failed', details: 'Westlands Hub - Super Petrol exceeds EPRA cap', timestamp: '2026-06-02 08:00 AM', severity: 'error' },
    { id: 5, user: 'Sarah Wanjiku', action: 'Ended shift', details: 'Mombasa Road - Shift #312 reconciled', timestamp: '2026-06-02 10:00 PM', severity: 'info' },
    { id: 6, user: 'System', action: 'Low tank alert', details: 'Nairobi Central - Super Petrol below 15%', timestamp: '2026-06-02 02:15 PM', severity: 'warning' },
    { id: 7, user: 'Admin User', action: 'User role changed', details: 'Mike Johnson: Attendant → Inactive', timestamp: '2026-06-01 11:00 AM', severity: 'warning' },
    { id: 8, user: 'System', action: 'eTIMS sync completed', details: '847 invoices submitted, 3 failed', timestamp: '2026-06-03 10:30 AM', severity: 'info' },
  ],
  config: {
    companyName: 'FuelPro Kenya Ltd.',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    taxRate: 16,
    epraApiKey: '••••••••••••',
    kraEtimsEnabled: true,
    autoReorderLevel: 20,
    shiftDuration: 8,
    receiptFooter: 'Thank you for choosing FuelPro. Drive safely!',
  },
}

export async function GET() {
  return NextResponse.json(adminData)
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    // Update in-memory config (for demo; in production, persist to DB)
    Object.assign(adminData.config, body)
    return NextResponse.json({ ok: true, data: adminData.config })
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to save configuration' }, { status: 500 })
  }
}
