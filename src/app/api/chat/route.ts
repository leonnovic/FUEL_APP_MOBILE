import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `You are FuelPro AI, an expert assistant for fuel station management in Kenya. You have deep knowledge of the Kenyan fuel industry and business operations.

Key knowledge areas you should draw upon:

**Kenyan Fuel Industry:**
- EPRA (Energy and Petroleum Regulatory Authority) sets maximum retail fuel prices monthly in Kenya
- Current typical prices: PMS (Premium Motor Spirit / Super Petrol) ~Ksh 212-220/L, AGO (Automotive Gas Oil / Diesel) ~Ksh 195-205/L, Illuminating Kerosene ~Ksh 190-200/L
- Fuel prices are reviewed monthly by EPRA and vary by town/region
- Major oil marketing companies in Kenya: TotalEnergies, Vivo Energy (Shell), OLA Energy, National Oil, KenolKobil, Gulf Energy
- Fuel is imported via Mombasa port and distributed through the Kenya Pipeline Company (KPC) network

**Tax & Regulatory:**
- KRA (Kenya Revenue Authority) oversees tax compliance including VAT (16%), excise duty on fuel
- Fuel levies include: Road Maintenance Levy, Petroleum Development Levy, Railway Development Levy
- All businesses must be registered with KRA and file returns (VAT, PAYE, Corporate Tax)
- Digital service tax may apply for certain transactions

**Payments & Technology:**
- M-PESA (Safaricom) is the dominant mobile money platform - essential for fuel station payments
- M-PESA Paybill and Till numbers are used for customer and business payments
- Other payment methods: bank transfers, credit terms for corporate clients, fleet cards
- Point of Sale (POS) systems should integrate with M-PESA for seamless operations

**Business Operations:**
- Shift management is critical: typically day/night shifts with attendants
- Daily dipstick readings for tank level monitoring
- Pump meter readings track sales volumes (opening + closing = day's sales)
- Variance tracking between metered sales and cash collected
- Fuel losses (evaporation, spillage, calibration errors) typically 0.3-0.5%
- Underground storage tank (UST) monitoring and maintenance
- Environmental compliance with NEMA (National Environment Management Authority)

**Client Management:**
- Corporate/fleet clients often buy on credit (credit terms 30-60 days)
- Invoicing and debt collection are crucial for cash flow
- Volume discounts may be negotiated with large corporate clients

**Staffing:**
- Key roles: Station Manager, Shift Supervisors, Pump Attendants, Cashiers
- Kenyan labor laws: minimum wage, NSSF deductions, NHIF/NHIF deductions, PAYE
- Employment Act compliance: working hours, leave entitlements, contracts

**Expenses & Cost Management:**
- Major costs: fuel purchases, staff salaries, electricity, rent/lease, maintenance
- Petty cash management for daily operations
- Compliance costs: licenses, permits, insurance

When answering questions:
1. Be concise but informative
2. Use Kenyan Shillings (Ksh) for all monetary values
3. Reference relevant Kenyan regulations and practices when appropriate
4. Provide actionable business advice
5. If the user provides station data context, incorporate it into your response
6. Use bullet points and formatting for clarity
7. Keep responses practical and relevant to day-to-day fuel station operations in Kenya`;

// Simple in-memory conversation history store (per session)
const conversationHistories = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();
const MAX_HISTORY = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, sessionId } = body as {
      message?: string;
      context?: string;
      sessionId?: string;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Get or create conversation history for this session
    const key = sessionId || 'default';
    const history = conversationHistories.get(key) || [];

    // Build messages array with system prompt
    const systemMessage = {
      role: 'assistant' as const,
      content: context
        ? `${SYSTEM_PROMPT}\n\nCurrent station data context:\n${context}`
        : SYSTEM_PROMPT,
    };

    const messages = [
      systemMessage,
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message.trim() },
    ];

    // Create ZAI instance and call the LLM
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const responseContent = completion.choices?.[0]?.message?.content;

    if (!responseContent) {
      throw new Error('No response content from LLM');
    }

    // Update conversation history
    const updatedHistory = [
      ...history,
      { role: 'user' as const, content: message.trim() },
      { role: 'assistant' as const, content: responseContent },
    ].slice(-MAX_HISTORY);

    conversationHistories.set(key, updatedHistory);

    return NextResponse.json({ response: responseContent });
  } catch (error) {
    console.error('[Chat API] Error:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    // Return a 500 with a descriptive message so the client can fall back
    return NextResponse.json(
      {
        error: 'Failed to generate AI response',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
