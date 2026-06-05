import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  getPaginationParams,
  paginatedResponse,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// ─── Kenya Payroll Calculation Helpers ──────────────────────────────────

/** SHA (Social Health Authority) – 2.75% of gross pay */
function calculateSHA(grossPay: number): number {
  return Math.round(grossPay * 0.0275 * 100) / 100;
}

/** NSSF (National Social Security Fund) – Tier I: 6% of first 7,000, Tier II: 6% of 7,001-36,000 */
function calculateNSSF(grossPay: number): number {
  const tier1 = Math.min(grossPay, 7000) * 0.06;
  const tier2 = Math.max(0, Math.min(grossPay - 7000, 29000)) * 0.06;
  return Math.round((tier1 + tier2) * 100) / 100;
}

/** PAYE (Pay As You Earn) – Progressive tax rates (Kenya 2024) */
function calculatePAYE(taxableIncome: number): number {
  if (taxableIncome <= 24000) return Math.round(taxableIncome * 0.10 * 100) / 100;
  if (taxableIncome <= 32333) return Math.round((2400 + (taxableIncome - 24000) * 0.25) * 100) / 100;
  if (taxableIncome <= 500000) return Math.round((4483.25 + (taxableIncome - 32333) * 0.30) * 100) / 100;
  if (taxableIncome <= 800000) return Math.round((144783.25 + (taxableIncome - 500000) * 0.325) * 100) / 100;
  return Math.round((242283.25 + (taxableIncome - 800000) * 0.35) * 100) / 100;
}

// GET /api/payroll - List payroll records for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const url = new URL(request.url);
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const where: Record<string, unknown> = { stationId };

  // Filter by pay period
  const payPeriod = url.searchParams.get('payPeriod');
  if (payPeriod) {
    const [year, month] = payPeriod.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    where.payPeriodStart = { gte: start, lte: end };
  }

  // Filter by status
  const status = url.searchParams.get('status');
  if (status) where.status = status;

  // Filter by employeeId
  const employeeId = url.searchParams.get('employeeId');
  if (employeeId) where.employeeId = employeeId;

  try {
    const [records, total] = await Promise.all([
      db.payroll.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { employee: { select: { name: true, role: true, phone: true, nationalId: true } } },
      }),
      db.payroll.count({ where }),
    ]);

    return paginatedResponse(records, total, page, pageSize);
  } catch (err) {
    console.error('[payroll] GET error:', err);
    return errorResponse('Failed to fetch payroll records', 500);
  }
}

// POST /api/payroll - Create payroll record(s)
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();

    // Bulk process: generate payroll for all active employees
    if (body.action === 'process_all') {
      const payPeriod = body.payPeriod; // "2025-01"
      if (!payPeriod) return errorResponse('payPeriod is required (format: YYYY-MM)', 400);

      const [year, month] = payPeriod.split('-').map(Number);
      const payPeriodStart = new Date(year, month - 1, 1);
      const payPeriodEnd = new Date(year, month, 0);

      // Get active employees
      const employees = await db.employee.findMany({
        where: { stationId, status: 'active' },
      });

      if (employees.length === 0) {
        return errorResponse('No active employees found', 404);
      }

      // Check for existing payroll records this period
      const existing = await db.payroll.findMany({
        where: {
          stationId,
          payPeriodStart: { gte: payPeriodStart },
          payPeriodEnd: { lte: payPeriodEnd },
        },
        select: { employeeId: true },
      });
      const existingIds = new Set(existing.map((e) => e.employeeId));

      const newRecords: unknown[] = [];

      for (const emp of employees) {
        if (existingIds.has(emp.id)) continue;

        const basicSalary = emp.salary || 0;
        const allowances = body.allowances || 0;
        const grossPay = basicSalary + allowances;

        const shaDeduction = calculateSHA(grossPay);
        const nssfDeduction = calculateNSSF(grossPay);
        const taxableIncome = Math.max(0, grossPay - nssfDeduction);
        const payeDeduction = calculatePAYE(taxableIncome);
        const advanceDeduction = 0;
        const otherDeductions = 0;
        const totalDeductions = shaDeduction + nssfDeduction + payeDeduction + advanceDeduction + otherDeductions;
        const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

        const record = await db.payroll.create({
          data: {
            stationId,
            employeeId: emp.id,
            payPeriodStart,
            payPeriodEnd,
            basicSalary,
            allowances,
            grossPay,
            shaDeduction,
            nssfDeduction,
            payeDeduction,
            advanceDeduction,
            otherDeductions,
            totalDeductions,
            netPay,
            status: 'pending',
            createdBy: user.userId,
          },
        });

        newRecords.push(record);
      }

      await createAuditLog({
        userId: user.userId,
        userEmail: user.email,
        userRole: user.role,
        action: 'create',
        resourceType: 'payroll',
        resourceId: 'bulk',
        snapshotAfter: { count: newRecords.length, payPeriod },
        ipAddress,
        userAgent,
        stationId,
      });

      return successResponse({ created: newRecords.length, records: newRecords }, 201);
    }

    // Single record creation
    if (body.action === 'update_sha') {
      // Bulk update SHA for all pending records
      const payPeriod = body.payPeriod;
      const shaRate = body.shaRate || 0.0275;

      if (!payPeriod) return errorResponse('payPeriod is required', 400);

      const [year, month] = payPeriod.split('-').map(Number);
      const payPeriodStart = new Date(year, month - 1, 1);
      const payPeriodEnd = new Date(year, month, 0);

      const records = await db.payroll.findMany({
        where: {
          stationId,
          payPeriodStart: { gte: payPeriodStart },
          payPeriodEnd: { lte: payPeriodEnd },
          status: 'pending',
        },
      });

      const updated: unknown[] = [];
      for (const record of records) {
        const newSHA = Math.round(record.grossPay * shaRate * 100) / 100;
        const newTotalDeductions = newSHA + record.nssfDeduction + record.payeDeduction + record.advanceDeduction + record.otherDeductions;
        const newNetPay = Math.round((record.grossPay - newTotalDeductions) * 100) / 100;

        const result = await db.payroll.update({
          where: { id: record.id },
          data: {
            shaDeduction: newSHA,
            totalDeductions: newTotalDeductions,
            netPay: newNetPay,
          },
        });
        updated.push(result);
      }

      return successResponse({ updated: updated.length, records: updated });
    }

    // Mark as paid
    if (body.action === 'mark_paid') {
      const recordIds: string[] = body.recordIds || [];
      if (recordIds.length === 0) return errorResponse('recordIds is required', 400);

      const updated: unknown[] = [];
      for (const id of recordIds) {
        const result = await db.payroll.update({
          where: { id, stationId },
          data: { status: 'paid', paidAt: new Date(), paymentReference: body.paymentReference },
        });
        updated.push(result);
      }

      await createAuditLog({
        userId: user.userId,
        userEmail: user.email,
        userRole: user.role,
        action: 'update',
        resourceType: 'payroll',
        resourceId: 'mark_paid',
        snapshotAfter: { count: updated.length },
        ipAddress,
        userAgent,
        stationId,
      });

      return successResponse({ paid: updated.length });
    }

    // Single record
    const {
      employeeId, payPeriod, basicSalary, allowances = 0,
      advanceDeduction = 0, otherDeductions = 0,
      paymentMethod = 'bank_transfer',
    } = body;

    if (!employeeId || !payPeriod) {
      return errorResponse('employeeId and payPeriod are required', 400);
    }

    const [year, month] = payPeriod.split('-').map(Number);
    const payPeriodStart = new Date(year, month - 1, 1);
    const payPeriodEnd = new Date(year, month, 0);
    const grossPay = (basicSalary || 0) + allowances;

    const shaDeduction = calculateSHA(grossPay);
    const nssfDeduction = calculateNSSF(grossPay);
    const taxableIncome = Math.max(0, grossPay - nssfDeduction);
    const payeDeduction = calculatePAYE(taxableIncome);
    const totalDeductions = shaDeduction + nssfDeduction + payeDeduction + advanceDeduction + otherDeductions;
    const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

    const record = await db.payroll.create({
      data: {
        stationId,
        employeeId,
        payPeriodStart,
        payPeriodEnd,
        basicSalary: basicSalary || 0,
        allowances,
        grossPay,
        shaDeduction,
        nssfDeduction,
        payeDeduction,
        advanceDeduction,
        otherDeductions,
        totalDeductions,
        netPay,
        paymentMethod,
        status: 'pending',
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'payroll',
      resourceId: record.id,
      snapshotAfter: record,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(record, 201);
  } catch (err) {
    console.error('[payroll] POST error:', err);
    return errorResponse('Failed to process payroll', 500);
  }
}
