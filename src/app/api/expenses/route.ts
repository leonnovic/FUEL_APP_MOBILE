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

// GET /api/expenses - List all expenses for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [expenses, total] = await Promise.all([
    db.expense.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.expense.count({ where: { stationId } }),
  ]);

  return paginatedResponse(expenses, total, page, pageSize);
}

// POST /api/expenses - Create a new expense
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const expense = await db.expense.create({
      data: {
        stationId,
        date: body.date ? new Date(body.date) : new Date(),
        category: body.category ?? 'misc',
        description: body.description,
        amount: body.amount ?? 0,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'expense',
      resourceId: expense.id,
      snapshotAfter: expense,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(expense, 201);
  } catch (err) {
    console.error('[expenses] POST error:', err);
    return errorResponse('Failed to create expense', 500);
  }
}
