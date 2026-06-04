import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// M-PESA transaction line patterns
const MERCHANT_PAYMENT_REGEX = /Merchant\s+Payment\s+from\s+([A-Za-z\s]+)\s*-\s*(\d[\d\s]+)/i;
const AMOUNT_REGEX = /KES?[\s,]*([\d,]+(?:\.\d{2})?)/i;
const DATE_REGEX = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?/i;
const TRANSACTION_ID_REGEX = /([A-Z0-9]{10,12})\s+Merchant/i;

// Exclusion patterns for non-inflow transactions
const EXCLUSION_PATTERNS = [
  /loan/i,
  /charge/i,
  /fee/i,
  /reversal/i,
  /withdrawal/i,
  /transfer\s+to/i,
  /airtime/i,
  /paybill/i,
  /tax/i,
  /penalty/i,
  /interest/i,
];

interface ParsedTransaction {
  transactionId: string;
  date: string;
  sender: string;
  senderPhone: string;
  amount: number;
  rawLine: string;
}

interface MpesaParseResult {
  inflows: ParsedTransaction[];
  totalValid: number;
  excluded: { rawLine: string; reason: string }[];
  summary: {
    totalInflows: number;
    totalAmount: number;
    excludedCount: number;
    parsedAt: string;
    stationId: string;
  };
}

function parseMpesaTransactions(text: string): MpesaParseResult {
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  const inflows: ParsedTransaction[] = [];
  const excluded: { rawLine: string; reason: string }[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if this line contains a merchant payment (inflow)
    const merchantMatch = trimmedLine.match(MERCHANT_PAYMENT_REGEX);
    if (!merchantMatch) continue;

    // Check exclusion patterns
    let isExcluded = false;
    let exclusionReason = '';
    for (const pattern of EXCLUSION_PATTERNS) {
      if (pattern.test(trimmedLine)) {
        isExcluded = true;
        exclusionReason = `Matched exclusion pattern: ${pattern.source}`;
        break;
      }
    }

    if (isExcluded) {
      excluded.push({ rawLine: trimmedLine, reason: exclusionReason });
      continue;
    }

    // Extract amount
    const amountMatch = trimmedLine.match(AMOUNT_REGEX);
    const amount = amountMatch
      ? parseFloat(amountMatch[1].replace(/,/g, ''))
      : 0;

    // Extract date
    const dateMatch = trimmedLine.match(DATE_REGEX);
    const date = dateMatch ? dateMatch[1] : '';

    // Extract transaction ID
    const txMatch = trimmedLine.match(TRANSACTION_ID_REGEX);
    const transactionId = txMatch ? txMatch[1] : '';

    // Extract sender info
    const sender = merchantMatch[1]?.trim() || 'Unknown';
    const senderPhone = merchantMatch[2]?.trim() || '';

    inflows.push({
      transactionId,
      date,
      sender,
      senderPhone,
      amount,
      rawLine: trimmedLine,
    });
  }

  const totalAmount = inflows.reduce((sum, tx) => sum + tx.amount, 0);

  return {
    inflows,
    totalValid: inflows.length,
    excluded,
    summary: {
      totalInflows: inflows.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      excludedCount: excluded.length,
      parsedAt: new Date().toISOString(),
      stationId: '', // Will be filled by the route handler
    },
  };
}

// POST /api/mpesa/parse - Parse M-PESA PDF statement
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('PDF file is required (form field: "file")', 400);
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return errorResponse('Only PDF files are supported', 400);
    }

    // Read file as ArrayBuffer and convert to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import for pdf-parse (ESM compatibility)
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Parse M-PESA transaction lines
    const result = parseMpesaTransactions(text);
    result.summary.stationId = stationId;

    // Log to audit trail
    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'mpesa_parse',
      resourceId: `parse_${Date.now()}`,
      snapshotAfter: {
        fileName: file.name,
        totalInflows: result.summary.totalInflows,
        totalAmount: result.summary.totalAmount,
        excludedCount: result.summary.excludedCount,
      },
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(result, 201);
  } catch (err) {
    console.error('[mpesa/parse] POST error:', err);
    return errorResponse('Failed to parse M-PESA PDF', 500);
  }
}
