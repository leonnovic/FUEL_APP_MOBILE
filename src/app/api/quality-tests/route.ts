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

// EPRA fuel quality standards validation
interface ValidationResult {
  result: 'pass' | 'fail';
  failures: string[];
}

function validateEpraStandards(fuelType: string, density?: number | null, sulfur?: number | null, flashPoint?: number | null): ValidationResult {
  const failures: string[] = [];

  if (fuelType === 'PMS') {
    // PMS (Premium Motor Spirit / Petrol)
    if (density != null && (density < 720 || density > 775)) {
      failures.push(`PMS density ${density} kg/m³ out of EPRA range (720-775)`);
    }
    if (sulfur != null && sulfur > 50) {
      failures.push(`PMS sulfur ${sulfur} ppm exceeds EPRA limit (50 ppm max)`);
    }
    if (flashPoint != null && flashPoint < 38) {
      failures.push(`PMS flash point ${flashPoint}°C below EPRA minimum (38°C)`);
    }
  } else if (fuelType === 'AGO') {
    // AGO (Automotive Gas Oil / Diesel)
    if (density != null && (density < 820 || density > 860)) {
      failures.push(`AGO density ${density} kg/m³ out of EPRA range (820-860)`);
    }
    if (sulfur != null && sulfur > 50) {
      failures.push(`AGO sulfur ${sulfur} ppm exceeds EPRA limit (50 ppm max)`);
    }
    if (flashPoint != null && flashPoint < 52) {
      failures.push(`AGO flash point ${flashPoint}°C below EPRA minimum (52°C)`);
    }
  } else if (fuelType === 'DPK') {
    // DPK (Dual Purpose Kerosene)
    if (sulfur != null && sulfur > 50) {
      failures.push(`DPK sulfur ${sulfur} ppm exceeds EPRA limit (50 ppm max)`);
    }
    if (flashPoint != null && flashPoint < 38) {
      failures.push(`DPK flash point ${flashPoint}°C below EPRA minimum (38°C)`);
    }
  }

  return {
    result: failures.length > 0 ? 'fail' : 'pass',
    failures,
  };
}

// GET /api/quality-tests - List quality tests for station
export async function GET(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { stationId } = auth;
  const { page, pageSize, skip, take } = getPaginationParams(request);

  const url = new URL(request.url);
  const fuelType = url.searchParams.get('fuelType');
  const result = url.searchParams.get('result');

  const where: Record<string, unknown> = { stationId };
  if (fuelType) where.fuelType = fuelType;
  if (result) where.result = result;

  const [tests, total] = await Promise.all([
    db.qualityTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    db.qualityTest.count({ where }),
  ]);

  return paginatedResponse(tests, total, page, pageSize);
}

// POST /api/quality-tests - Create quality test with EPRA auto-validation
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const body = await request.json();

    if (!body.fuelType || !body.date) {
      return errorResponse('fuelType and date are required', 400);
    }

    // Auto-validate against EPRA standards
    const validation = validateEpraStandards(
      body.fuelType,
      body.density ?? null,
      body.sulfur ?? null,
      body.flashPoint ?? null
    );

    // If user didn't explicitly set result, auto-determine from EPRA validation
    const result = body.result ?? validation.result;
    const notes = [
      body.notes ?? '',
      validation.failures.length > 0 ? `EPRA Validation Failures: ${validation.failures.join('; ')}` : 'EPRA Validation: Passed',
    ].filter(Boolean).join(' | ');

    const test = await db.qualityTest.create({
      data: {
        stationId,
        date: new Date(body.date),
        batchNo: body.batchNo ?? null,
        fuelType: body.fuelType,
        density: body.density ?? null,
        sulfur: body.sulfur ?? null,
        flashPoint: body.flashPoint ?? null,
        appearance: body.appearance ?? null,
        result,
        testedBy: body.testedBy ?? null,
        notes: notes || null,
        createdBy: user.userId,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'quality_test',
      resourceId: test.id,
      snapshotAfter: test,
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(test, 201);
  } catch (err) {
    console.error('[quality-tests] POST error:', err);
    return errorResponse('Failed to create quality test', 500);
  }
}
