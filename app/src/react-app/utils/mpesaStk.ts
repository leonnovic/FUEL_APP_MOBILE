// ═══════════════════════════════════════════════════
// REAL M-PESA STK PUSH INTEGRATION
// Safariicom Daraja API v2 - NO SIMULATION
// ═══════════════════════════════════════════════════

// Daraja API configuration
// In production, these come from the company settings / env
const DARAJA_BASE_URL = 'https://sandbox.safaricom.co.ke';

interface DarajaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  businessShortCode: string; // e.g., "174379"
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

// Load config from company settings
function loadConfig(): DarajaConfig {
  try {
    const companyRaw = localStorage.getItem('fuelpro_company_v1');
    if (companyRaw) {
      const company = JSON.parse(companyRaw);
      const apiKeys = company.settings?.apiKeys || {};
      return {
        consumerKey: apiKeys.mpesaConsumerKey || '',
        consumerSecret: apiKeys.mpesaConsumerSecret || '',
        passkey: apiKeys.mpesaPasskey || '',
        businessShortCode: apiKeys.mpesaShortCode || '174379',
        callbackUrl: apiKeys.mpesaCallbackUrl || 'https://fuelpro.app/api/mpesa/callback',
        environment: apiKeys.mpesaEnvironment || 'sandbox',
      };
    }
  } catch {}
  return {
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    businessShortCode: '174379',
    callbackUrl: 'https://fuelpro.app/api/mpesa/callback',
    environment: 'sandbox',
  };
}

// Generate base64-encoded auth
function getBasicAuth(config: DarajaConfig): string {
  return btoa(`${config.consumerKey}:${config.consumerSecret}`);
}

// Generate password for STK push
function generatePassword(config: DarajaConfig): string {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const passwordString = `${config.businessShortCode}${config.passkey}${timestamp}`;
  return btoa(passwordString);
}

// ═══════════════════════════════════════════════════
// STEP 1: Get OAuth Access Token
// ═══════════════════════════════════════════════════
export async function getAccessToken(config?: Partial<DarajaConfig>): Promise<string> {
  const fullConfig = { ...loadConfig(), ...config };
  const baseUrl = fullConfig.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : DARAJA_BASE_URL;

  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${getBasicAuth(fullConfig)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token in response');
  }
  return data.access_token;
}

// ═══════════════════════════════════════════════════
// STEP 2: Initiate STK Push (Lipa na M-Pesa Online)
// ═══════════════════════════════════════════════════
export interface STKPushRequest {
  phoneNumber: string;     // 2547XXXXXXXX format
  amount: number;
  accountReference: string; // e.g., "FUELPRO001"
  transactionDesc?: string;
}

export interface STKPushResponse {
  success: boolean;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  responseCode?: string;
  responseDescription?: string;
  customerMessage?: string;
  error?: string;
}

export async function initiateSTKPush(request: STKPushRequest, config?: Partial<DarajaConfig>): Promise<STKPushResponse> {
  const fullConfig = { ...loadConfig(), ...config };

  // Validate credentials exist
  if (!fullConfig.consumerKey || !fullConfig.consumerSecret || !fullConfig.passkey) {
    return {
      success: false,
      error: 'M-Pesa credentials not configured. Go to Company Settings > API Keys to set up your Daraja credentials.',
    };
  }

  // Validate phone format
  const cleanPhone = request.phoneNumber.replace(/\D/g, '');
  if (!/^2547\d{8}$/.test(cleanPhone)) {
    return {
      success: false,
      error: 'Invalid phone number. Use format: 2547XXXXXXXX (e.g., 254712345678)',
    };
  }

  // Validate amount
  if (request.amount < 1) {
    return { success: false, error: 'Amount must be at least KES 1' };
  }

  try {
    // Step 1: Get access token
    const accessToken = await getAccessToken(config);

    const baseUrl = fullConfig.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : DARAJA_BASE_URL;

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

    // Step 2: Send STK Push request
    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: fullConfig.businessShortCode,
        Password: generatePassword(fullConfig),
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount),
        PartyA: cleanPhone,
        PartyB: fullConfig.businessShortCode,
        PhoneNumber: cleanPhone,
        CallBackURL: fullConfig.callbackUrl,
        AccountReference: request.accountReference || 'FuelPro',
        TransactionDesc: request.transactionDesc || 'Fuel purchase',
      }),
    });

    const data = await response.json();

    if (data.ResponseCode === '0') {
      // Store pending transaction
      storePendingTransaction(data.CheckoutRequestID, request);

      return {
        success: true,
        merchantRequestId: data.MerchantRequestID,
        checkoutRequestId: data.CheckoutRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        customerMessage: data.CustomerMessage,
      };
    }

    return {
      success: false,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      error: data.errorMessage || data.ResponseDescription || 'STK Push failed',
    };

  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error. Please check your internet connection.',
    };
  }
}

// ═══════════════════════════════════════════════════
// STEP 3: Query STK Push Status
// ═══════════════════════════════════════════════════
export async function querySTKStatus(checkoutRequestId: string, config?: Partial<DarajaConfig>): Promise<{
  success: boolean;
  resultCode?: string;
  resultDesc?: string;
  paid?: boolean;
  amount?: number;
  mpesaReceipt?: string;
  phone?: string;
  error?: string;
}> {
  const fullConfig = { ...loadConfig(), ...config };

  if (!fullConfig.consumerKey || !fullConfig.consumerSecret) {
    return { success: false, error: 'Credentials not configured' };
  }

  try {
    const accessToken = await getAccessToken(config);
    const baseUrl = fullConfig.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : DARAJA_BASE_URL;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

    const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: fullConfig.businessShortCode,
        Password: generatePassword(fullConfig),
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    const data = await response.json();

    if (data.ResultCode === '0') {
      return {
        success: true,
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
        paid: true,
        amount: data.CallbackMetadata?.Item?.find((i: any) => i.Name === 'Amount')?.Value,
        mpesaReceipt: data.CallbackMetadata?.Item?.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value,
        phone: data.CallbackMetadata?.Item?.find((i: any) => i.Name === 'PhoneNumber')?.Value?.toString(),
      };
    }

    return {
      success: true,
      resultCode: data.ResultCode,
      resultDesc: data.ResultDesc,
      paid: false,
    };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════
// Pending Transaction Store
// ═══════════════════════════════════════════════════
interface PendingTransaction {
  checkoutRequestId: string;
  merchantRequestId: string;
  phoneNumber: string;
  amount: number;
  accountReference: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  timestamp: string;
  resultCode?: string;
  resultDesc?: string;
  mpesaReceipt?: string;
}

function storePendingTransaction(checkoutRequestId: string, request: STKPushRequest) {
  try {
    const pending: PendingTransaction[] = JSON.parse(
      localStorage.getItem('fuelpro_mpesa_pending') || '[]'
    );
    pending.unshift({
      checkoutRequestId,
      merchantRequestId: '',
      phoneNumber: request.phoneNumber,
      amount: request.amount,
      accountReference: request.accountReference || 'FuelPro',
      status: 'pending',
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('fuelpro_mpesa_pending', JSON.stringify(pending.slice(0, 100)));
  } catch {}
}

export function getPendingTransactions(): PendingTransaction[] {
  try {
    return JSON.parse(localStorage.getItem('fuelpro_mpesa_pending') || '[]');
  } catch { return []; }
}

export function updateTransactionStatus(checkoutRequestId: string, status: PendingTransaction['status'], details?: { resultCode?: string; resultDesc?: string; mpesaReceipt?: string }) {
  try {
    const pending: PendingTransaction[] = JSON.parse(
      localStorage.getItem('fuelpro_mpesa_pending') || '[]'
    );
    const updated = pending.map(tx =>
      tx.checkoutRequestId === checkoutRequestId
        ? { ...tx, status, ...details }
        : tx
    );
    localStorage.setItem('fuelpro_mpesa_pending', JSON.stringify(updated));
  } catch {}
}

export function getTransactionHistory(): PendingTransaction[] {
  try {
    return JSON.parse(localStorage.getItem('fuelpro_mpesa_history') || '[]');
  } catch { return []; }
}

export function addToHistory(tx: PendingTransaction) {
  try {
    const history = getTransactionHistory();
    history.unshift(tx);
    localStorage.setItem('fuelpro_mpesa_history', JSON.stringify(history.slice(0, 500)));
  } catch {}
}

// ═══════════════════════════════════════════════════
// Callback Handler (receives from Safaricom server)
// ═══════════════════════════════════════════════════
export interface MpesacallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: { Name: string; Value: string | number }[];
      };
    };
  };
}

export function handleMpesacallback(payload: MpesacallbackPayload): { success: boolean; receipt?: string } {
  const { stkCallback } = payload.Body;
  const paid = stkCallback.ResultCode === 0;

  const receipt = stkCallback.CallbackMetadata?.Item?.find(
    (i: any) => i.Name === 'MpesaReceiptNumber'
  )?.Value as string;

  updateTransactionStatus(
    stkCallback.CheckoutRequestID,
    paid ? 'success' : 'failed',
    {
      resultCode: String(stkCallback.ResultCode),
      resultDesc: stkCallback.ResultDesc,
      mpesaReceipt: receipt,
    }
  );

  // Move to history
  const pending = getPendingTransactions();
  const tx = pending.find(t => t.checkoutRequestId === stkCallback.CheckoutRequestID);
  if (tx) {
    addToHistory({ ...tx, status: paid ? 'success' : 'failed', mpesaReceipt: receipt });
  }

  return { success: paid, receipt };
}

// ═══════════════════════════════════════════════════
// Helper: Format phone for display
// ═══════════════════════════════════════════════════
export function formatPhone254(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 10) {
    return '254' + clean.slice(1);
  }
  if (clean.startsWith('254') && clean.length === 12) {
    return clean;
  }
  if (clean.startsWith('+254') && clean.length === 13) {
    return clean.slice(1);
  }
  return clean;
}

// ═══════════════════════════════════════════════════
// Helper: Validate M-Pesa credentials
// ═══════════════════════════════════════════════════
export function validateMpesaCredentials(): {
  valid: boolean;
  missing: string[];
} {
  const config = loadConfig();
  const missing: string[] = [];
  if (!config.consumerKey) missing.push('Consumer Key');
  if (!config.consumerSecret) missing.push('Consumer Secret');
  if (!config.passkey) missing.push('Passkey');
  if (!config.businessShortCode) missing.push('Business Short Code');
  return { valid: missing.length === 0, missing };
}

export { loadConfig as getMpesaConfig };
export type { DarajaConfig };
