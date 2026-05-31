import { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Drop-in helper button that archives a single File to S3 using the user's
 * configured AWS keys. Renders nothing if S3 isn't configured — keeps the
 * UI clean for users who haven't paid for cloud storage yet.
 *
 * Used in MPESAAnalyzer (receipts) and could be added to Invoice, DeliveryNote,
 * etc. without changes.
 */

const API_BASE = (
  import.meta.env.VITE_REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

function authHeader(): Record<string, string> {
  const t = localStorage.getItem('fuelpro_jwt') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function ArchiveToS3Button({
  file,
  category = 'receipts',
}: {
  file: File;
  category?: 'receipts' | 'photos' | 'payroll' | 'documents' | 'logos' | 'misc';
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/storage/config`, { headers: authHeader() })
      .then(r => r.ok ? r.json() : null)
      .then(d => setConfigured(!!d?.configured))
      .catch(() => setConfigured(false));
  }, []);

  const archive = async () => {
    setStatus('uploading'); setErrorMsg('');
    try {
      const presignR = await fetch(`${API_BASE}/api/storage/presign-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'application/pdf',
          category, size: file.size,
        }),
      });
      if (!presignR.ok) {
        const d = await presignR.json().catch(() => ({}));
        throw new Error(d.detail || `Presign failed: ${presignR.status}`);
      }
      const presign = await presignR.json();
      const putR = await fetch(presign.url, {
        method: 'PUT',
        headers: presign.headers || {},
        body: file,
      });
      if (!putR.ok) throw new Error(`S3 PUT ${putR.status}`);
      await fetch(`${API_BASE}/api/storage/confirm-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ key: presign.key, size: file.size }),
      });
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Archive failed');
    }
  };

  if (configured === null) return null;
  if (!configured) return null;  // Gracefully hide unless AWS is wired

  if (status === 'done') {
    return (
      <span title="Archived to S3" className="inline-flex items-center text-emerald-500" data-testid="archive-s3-done">
        <CheckCircle2 size={14} />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <button
        title={errorMsg || 'Retry archive'}
        onClick={archive}
        className="p-1 text-red-500 hover:text-red-600 transition-colors"
        data-testid="archive-s3-error"
      >
        <AlertCircle size={14} />
      </button>
    );
  }
  if (status === 'uploading') {
    return (
      <span className="inline-flex items-center text-sky-500" data-testid="archive-s3-uploading">
        <Loader2 size={14} className="animate-spin" />
      </span>
    );
  }

  return (
    <button
      onClick={archive}
      title="Archive to S3"
      className="p-1 text-gray-400 hover:text-sky-500 transition-colors"
      data-testid="archive-s3-btn"
    >
      <Cloud size={14} />
    </button>
  );
}
