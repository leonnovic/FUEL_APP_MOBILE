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

// GET /api/employees - List all employees for the active station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const [employees, total] = await Promise.all([
    db.employee.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.employee.count({ where: { stationId } }),
  ]);

  return paginatedResponse(employees, total, page, pageSize);
}

// POST /api/employees - Create a new employee
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();
    const employee = await db.employee.create({
      data: {
        stationId,
        name: body.name ?? '',
        phone: body.phone,
        role: body.role ?? 'attendant',
        salary: body.salary ?? 0,
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
        status: body.status ?? 'active',
        nationalId: body.nationalId,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'employee',
      resourceId: employee.id,
      snapshotAfter: employee,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(employee, 201);
  } catch (err) {
    console.error('[employees] POST error:', err);
    return errorResponse('Failed to create employee', 500);
  }
}
