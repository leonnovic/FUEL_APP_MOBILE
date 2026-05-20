/**
 * WhatsApp Business invoice share helper.
 *
 * Builds a `https://wa.me/<phone>?text=…` deep link that opens WhatsApp with a
 * pre-filled invoice message. Works without any WhatsApp Business API keys.
 *
 * Use as a Web Share-fallback or a dedicated "Share via WhatsApp" button.
 */

export interface InvoiceShareData {
  invoiceNo: string;
  amount: number;
  currency: string;
  customer?: string;
  dueDate?: string;
  publicUrl?: string;     // e.g. receipt verification URL
  station?: string;
  bankDetails?: string;
}

/** Strip + and dashes; keep only digits. Number must include country code. */
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // 0712… (Kenya local) → 254712…
  if (digits.length === 10 && digits.startsWith('0')) return '254' + digits.slice(1);
  return digits;
}

export function buildInvoiceWhatsAppText(data: InvoiceShareData): string {
  const lines = [
    `*FuelPro Invoice ${data.invoiceNo}*`,
    '',
    data.customer ? `Hi ${data.customer},` : 'Hello,',
    '',
    `Your invoice for *${data.currency} ${data.amount.toLocaleString()}* is ready.`,
    data.dueDate ? `Due: ${data.dueDate}` : null,
    data.station ? `Station: ${data.station}` : null,
    data.bankDetails ? `\nPayment details:\n${data.bankDetails}` : null,
    data.publicUrl ? `\nView / verify: ${data.publicUrl}` : null,
    '',
    'Thank you for your business.',
  ].filter(Boolean);
  return lines.join('\n');
}

/** Build the deep link. Phone optional — without it WhatsApp opens the chooser. */
export function buildWhatsAppShareUrl(phone: string | undefined, text: string): string {
  const encoded = encodeURIComponent(text);
  if (!phone || !phone.trim()) return `https://wa.me/?text=${encoded}`;
  return `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encoded}`;
}

/** One-shot helper: opens WhatsApp with the invoice text. */
export function shareInvoiceViaWhatsApp(phone: string | undefined, data: InvoiceShareData): void {
  const url = buildWhatsAppShareUrl(phone, buildInvoiceWhatsAppText(data));
  window.open(url, '_blank', 'noopener,noreferrer');
}
