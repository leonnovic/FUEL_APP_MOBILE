import { NextRequest } from 'next/server';
import {
  authenticateAndAuthorize,
  createAuditLog,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// ─── Types matching frontend ParseResult ──────────────────────────────────

interface ParsedInflow {
  receipt: string;
  date: string;
  time: string;
  details: string;
  paidIn: number;
  withdrawal: number;
  balance: number;
  category: string;
}

interface BalanceAnalysis {
  trueInflow: number;
  recordedNet: number;
  balanceDelta: number;
  unrecordedInflow: number;
  discrepancyRate: number;
}

interface TopCustomer {
  name: string;
  total: number;
  payments: number;
  period: string;
}

interface ParseResult {
  inflows: ParsedInflow[];
  excluded: ParsedInflow[];
  totalValid: number;
  totalExcluded: number;
  uniqueCustomers: number;
  avgPayment: number;
  lineCount: number;
  rawTextLength: number;
  processingLog: string[];
  topCustomer: TopCustomer | null;
  balanceAnalysis: BalanceAnalysis;
}

// ─── Exclusion patterns ─────────────────────────────────────────────────

const EXCLUSION_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /loan/i, category: 'loan' },
  { pattern: /overdraft/i, category: 'loan' },
  { pattern: /charge/i, category: 'charge' },
  { pattern: /fee/i, category: 'charge' },
  { pattern: /reversal/i, category: 'reversal' },
  { pattern: /reversed/i, category: 'reversal' },
  { pattern: /withdrawal/i, category: 'transfer' },
  { pattern: /transfer\s+to/i, category: 'transfer' },
  { pattern: /sent\s+to/i, category: 'transfer' },
  { pattern: /airtime/i, category: 'charge' },
  { pattern: /paybill\s+payment/i, category: 'transfer' },
  { pattern: /tax/i, category: 'charge' },
  { pattern: /penalty/i, category: 'charge' },
  { pattern: /interest/i, category: 'charge' },
  { pattern: /savings/i, category: 'transfer' },
];

// ─── Transaction line regex patterns ────────────────────────────────────

// Matches lines like: QJK4R2V7G6  1/3/25 9:30 AM  Merchant Payment from John Mwangi  5,000.00  252,850.00
// Or: QJK4R2V7G6  1/3/25  Merchant Payment from John Mwangi  254712345678  KES 5,000.00  252,850.00
const TX_LINE_REGEX = /^([A-Z0-9]{8,12})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?\s*(.+?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)\s*$/i;

// Simpler pattern for lines without receipt prefix
const TX_LINE_ALT = /^(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s+(.+?)\s+([\d,]+(?:\.\d{2})?)\s*$/i;

function parseAmount(str: string): number {
  return parseFloat(str.replace(/,/g, '')) || 0;
}

function classifyTransaction(details: string): string {
  for (const { pattern, category } of EXCLUSION_PATTERNS) {
    if (pattern.test(details)) return category;
  }
  return 'operating_revenue';
}

function extractCustomerName(details: string): string {
  // Try to extract name from "Merchant Payment from X", "Received from X", "Payment from X"
  const fromMatch = details.match(/(?:from|by)\s+([A-Za-z\s]+?)(?:\s+-|\s+\d|\s*$)/i);
  if (fromMatch && fromMatch[1]) return fromMatch[1].trim();
  // Try "X paid Y"
  const paidMatch = details.match(/^([A-Za-z\s]+?)(?:\s+paid|\s+sent|\s+transferred)/i);
  if (paidMatch && paidMatch[1]) return paidMatch[1].trim();
  return details.substring(0, 40).trim();
}

function parseMpesaText(text: string): ParseResult {
  const log: string[] = ['Starting M-PESA text parsing...'];
  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  log.push(`Found ${lines.length} lines to process`);

  const inflows: ParsedInflow[] = [];
  const excluded: ParsedInflow[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip header/footer lines
    if (
      trimmedLine.length < 10 ||
      /^(date|time|details|receipt|statement|account|balance|total|page|generated)/i.test(trimmedLine) ||
      /^[-=]{3,}$/.test(trimmedLine) ||
      /^M-PESA/i.test(trimmedLine) && trimmedLine.length < 30
    ) {
      continue;
    }

    // Try primary pattern (receipt date time details amount balance)
    let match = trimmedLine.match(TX_LINE_REGEX);
    let receipt = '';
    let date = '';
    let time = '';
    let details = '';
    let paidIn = 0;
    let withdrawal = 0;
    let balance = 0;

    if (match) {
      receipt = match[1];
      date = match[2];
      time = match[3] || '';
      details = match[4].trim();
      // Determine if this is paid-in or withdrawal based on context
      const firstAmount = parseAmount(match[5]);
      const secondAmount = parseAmount(match[6]);
      balance = secondAmount;

      // Check if the line suggests a withdrawal (outgoing)
      if (/withdrawal|sent|transfer|paid\s+to|b2c/i.test(details)) {
        withdrawal = firstAmount;
      } else {
        paidIn = firstAmount;
      }
    } else {
      // Try alternate pattern
      match = trimmedLine.match(TX_LINE_ALT);
      if (match) {
        receipt = '';
        details = match[1].trim();
        date = match[2];
        time = match[3] || '';
        const amount = parseAmount(match[5]);
        // Check direction
        if (/withdrawal|sent|transfer|paid\s+to|b2c/i.test(details)) {
          withdrawal = amount;
        } else {
          paidIn = amount;
        }
      } else {
        // Try a more lenient approach: find any line with amounts
        const amountMatches = trimmedLine.match(/([\d,]+(?:\.\d{2}))/g);
        if (amountMatches && amountMatches.length >= 2) {
          // Extract what we can
          const parts = trimmedLine.split(/\s{2,}|\t/);
          if (parts.length >= 3) {
            receipt = parts[0]?.match(/^[A-Z0-9]{8,12}$/i) ? parts[0] : '';
            details = parts.slice(1, -2).join(' ').trim();
            paidIn = parseAmount(amountMatches[amountMatches.length - 2]);
            balance = parseAmount(amountMatches[amountMatches.length - 1]);
            // Try to find date in the line
            const dateMatch = trimmedLine.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
            date = dateMatch ? dateMatch[1] : '';
            const timeMatch = trimmedLine.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i);
            time = timeMatch ? timeMatch[1] : '';
          }
        } else {
          continue; // Can't parse this line
        }
      }
    }

    if (!details) continue;

    // Classify the transaction
    const category = classifyTransaction(details);

    const parsed: ParsedInflow = {
      receipt,
      date,
      time,
      details,
      paidIn,
      withdrawal,
      balance,
      category,
    };

    if (category === 'operating_revenue') {
      inflows.push(parsed);
    } else {
      excluded.push(parsed);
    }
  }

  log.push(`Parsed ${inflows.length} operating revenue inflows`);
  log.push(`Excluded ${excluded.length} non-operating items`);

  // Calculate metrics
  const totalValid = inflows.reduce((s, i) => s + i.paidIn, 0);
  const totalExcluded = excluded.reduce((s, i) => s + i.paidIn, 0);
  const totalWithdrawals = [...inflows, ...excluded].reduce((s, i) => s + i.withdrawal, 0);

  // Unique customers
  const customerMap = new Map<string, { total: number; count: number }>();
  for (const inflow of inflows) {
    const name = extractCustomerName(inflow.details);
    const existing = customerMap.get(name) || { total: 0, count: 0 };
    existing.total += inflow.paidIn;
    existing.count += 1;
    customerMap.set(name, existing);
  }

  // Top customer
  let topCustomer: TopCustomer | null = null;
  for (const [name, data] of customerMap) {
    if (!topCustomer || data.total > topCustomer.total) {
      topCustomer = {
        name,
        total: data.total,
        payments: data.count,
        period: inflows.length > 0
          ? `${inflows[inflows.length - 1].date} - ${inflows[0].date}`
          : 'N/A',
      };
    }
  }

  const uniqueCustomers = customerMap.size;
  const avgPayment = inflows.length > 0 ? totalValid / inflows.length : 0;

  // Balance analysis
  const lastBalance = inflows.length > 0 ? inflows[0].balance : 0;
  const trueInflow = totalValid;
  const recordedNet = totalValid - totalWithdrawals;
  const balanceDelta = lastBalance > 0 ? Math.abs(trueInflow - recordedNet) : 0;
  const unrecordedInflow = Math.max(0, trueInflow - recordedNet);
  const discrepancyRate = trueInflow > 0 ? (balanceDelta / trueInflow) * 100 : 0;

  log.push(`Total operating revenue: KES ${totalValid.toFixed(2)}`);
  log.push(`Total excluded: KES ${totalExcluded.toFixed(2)}`);
  log.push(`Unique customers: ${uniqueCustomers}`);
  if (topCustomer) {
    log.push(`Top customer: ${topCustomer.name} (${topCustomer.payments} payments)`);
  }
  log.push('Parsing complete');

  return {
    inflows,
    excluded,
    totalValid,
    totalExcluded,
    uniqueCustomers,
    avgPayment,
    lineCount: lines.length,
    rawTextLength: text.length,
    processingLog: log,
    topCustomer,
    balanceAnalysis: {
      trueInflow,
      recordedNet,
      balanceDelta,
      unrecordedInflow,
      discrepancyRate,
    },
  };
}

// POST /api/mpesa/parse - Parse M-PESA PDF statement or pasted text
export async function POST(request: NextRequest) {
  const auth = await authenticateAndAuthorize(request);
  if ('error' in auth) return auth.error;

  const { user, stationId, ipAddress, userAgent } = auth;

  try {
    const contentType = request.headers.get('content-type') || '';
    let text = '';
    let fileName = '';
    let mode = 'auto';

    if (contentType.includes('multipart/form-data')) {
      // FormData upload (PDF or text)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const textInput = formData.get('text') as string | null;
      mode = (formData.get('mode') as string) || 'auto';
      const password = formData.get('password') as string | null;

      if (file && file.name.toLowerCase().endsWith('.pdf')) {
        // Parse PDF file
        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require('pdf-parse') as (buf: Buffer, opts?: Record<string, unknown>) => Promise<{ text: string }>;
          const pdfData = await pdfParse(buffer, password ? { password } : undefined);
          text = pdfData.text;
        } catch {
          return errorResponse('Failed to parse PDF. It may be encrypted or corrupted.', 400);
        }
      } else if (textInput) {
        // Raw text input
        text = textInput;
        fileName = 'pasted-text';
      } else if (file) {
        return errorResponse('Only PDF files are supported. For text, use the "text" form field.', 400);
      } else {
        return errorResponse('Please provide a PDF file or paste text', 400);
      }
    } else {
      return errorResponse('Content-Type must be multipart/form-data', 400);
    }

    if (!text.trim()) {
      return errorResponse('No text content found to parse', 400);
    }

    // Parse the text content
    const result = parseMpesaText(text);

    // Log to audit trail
    await createAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userRole: user.role,
      action: 'create',
      resourceType: 'mpesa_parse',
      resourceId: `parse_${Date.now()}`,
      snapshotAfter: {
        fileName: fileName || 'text-input',
        mode,
        totalInflows: result.inflows.length,
        totalAmount: result.totalValid,
        excludedCount: result.excluded.length,
        uniqueCustomers: result.uniqueCustomers,
      },
      ipAddress,
      userAgent,
      stationId,
    });

    return successResponse(result, 201);
  } catch (err) {
    console.error('[mpesa/parse] POST error:', err);
    return errorResponse('Failed to parse M-PESA statement', 500);
  }
}
