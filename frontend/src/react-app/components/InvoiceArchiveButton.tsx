import { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { exportInvoicePDF } from '@/react-app/utils/exportUtils';
import { archiveBlobToS3, s3IsConfigured } from '@/react-app/lib/s3Archive';

/**
 * One-click "Archive invoice PDF to cloud storage" button. Renders only when
 * AWS S3 is configured server-side. Generates the same PDF the Export button
 * does, but instead of triggering a local download, uploads the Blob to S3
 * under `documents/`.
 */
export default function InvoiceArchiveButton({
  getInvoicePayload,
}: {
  getInvoicePayload: () => Record<string, unknown>;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<'idle' | 'archiving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    s3IsConfigured().then(setConfigured);
  }, []);

  if (configured === null) return null;
  if (!configured) return null;

  const archive = async () => {
    const payload = getInvoicePayload() as {
      invoiceNumber?: string; customerName?: string;
      invoiceItems?: Array<unknown>;
    };
    if (!payload.customerName || !payload.invoiceItems?.length) {
      setStatus('error');
      setErrorMsg('Add customer details and invoice items first.');
      return;
    }
    setStatus('archiving'); setErrorMsg('');
    try {
      const blob = exportInvoicePDF(payload, 'blob') as Blob;
      if (!blob) throw new Error('Failed to render invoice PDF');
      const safeCustomer = (payload.customerName || 'Customer').replace(/\s+/g, '_');
      await archiveBlobToS3(`Invoice_${payload.invoiceNumber}_${safeCustomer}.pdf`, blob, 'documents');
      setStatus('done');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Archive failed');
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2" data-testid="invoice-archive-row">
      <button
        type="button"
        onClick={archive}
        disabled={status === 'archiving'}
        data-testid="invoice-archive-s3"
        className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {status === 'archiving' ? <Loader2 size={14} className="animate-spin" /> :
         status === 'done' ? <CheckCircle2 size={14} /> :
         status === 'error' ? <AlertCircle size={14} /> :
         <Cloud size={14} />}
        {status === 'archiving' ? 'Archiving…' :
         status === 'done' ? 'Archived to S3' :
         status === 'error' ? 'Retry archive' : 'Archive to cloud (S3)'}
      </button>
      {status === 'error' && errorMsg && (
        <span className="text-xs text-red-500">{errorMsg}</span>
      )}
      {status === 'done' && (
        <span className="text-xs text-emerald-500">Stored under documents/</span>
      )}
    </div>
  );
}
