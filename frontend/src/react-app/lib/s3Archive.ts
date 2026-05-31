/**
 * Helper to push a generated Blob (e.g. PDF, XLSX) into S3 under a given
 * category. Resolves with the S3 key on success. Throws on failure (caller
 * surfaces the error to the user).
 *
 * Drop-in for any export flow that today calls `doc.save(name)` — instead,
 * have the export function return a Blob and pipe it through here.
 */

const API_BASE = (
  import.meta.env.VITE_REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

function authHeader(): Record<string, string> {
  const t = localStorage.getItem('fuelpro_jwt') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function archiveBlobToS3(
  filename: string,
  blob: Blob,
  category: 'receipts' | 'photos' | 'payroll' | 'documents' | 'logos' | 'misc' = 'documents',
): Promise<string> {
  const presignR = await fetch(`${API_BASE}/api/storage/presign-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({
      filename,
      content_type: blob.type || 'application/octet-stream',
      category,
      size: blob.size,
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
    body: blob,
  });
  if (!putR.ok) throw new Error(`S3 PUT ${putR.status}`);
  await fetch(`${API_BASE}/api/storage/confirm-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ key: presign.key, size: blob.size }),
  });
  return presign.key as string;
}

export async function s3IsConfigured(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/api/storage/config`, { headers: authHeader() });
    if (!r.ok) return false;
    const d = await r.json();
    return !!d.configured;
  } catch {
    return false;
  }
}
