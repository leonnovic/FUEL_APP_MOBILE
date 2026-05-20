import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, Download, Trash2, File as FileIcon, FolderOpen,
  ChevronLeft, Cloud, AlertCircle, CheckCircle2, X,
} from 'lucide-react';
import { useNavigate } from 'react-router';

/**
 * Cloud Storage page — drag-and-drop upload backed by S3 pre-signed URLs.
 *
 * Goes 503 when AWS keys aren't set in Founder → Integration Keys. Once
 * configured, files upload directly browser → S3 (no proxy) using a
 * presigned PUT URL minted by `/api/storage/presign-upload`.
 */

const API_BASE = (
  (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

const CATEGORIES = ['receipts', 'photos', 'payroll', 'documents', 'logos', 'misc'] as const;
type Category = typeof CATEGORIES[number];

type StoredFile = {
  key: string;
  filename: string;
  original_filename?: string;
  category: string;
  content_type: string;
  size?: number;
  status: string;
  created_at: string;
  uploaded_at?: string;
};

type UploadJob = {
  id: string;
  filename: string;
  size: number;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
};

function authHeader(): Record<string, string> {
  const t = localStorage.getItem('fuelpro_jwt') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function formatBytes(n?: number): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function StoragePage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<{ configured: boolean; bucket?: string; region?: string } | null>(null);
  const [category, setCategory] = useState<Category>('receipts');
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/storage/config`, { headers: authHeader() });
      if (r.status === 401) {
        navigate('/');
        return;
      }
      const d = await r.json();
      setConfig({ configured: !!d.configured, bucket: d.bucket, region: d.region });
    } catch {
      setConfig({ configured: false });
    }
  }, [navigate]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/storage/list?category=${category}`, { headers: authHeader() });
      if (!r.ok) { setFiles([]); return; }
      const d = await r.json();
      setFiles(d.items || []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useEffect(() => { loadFiles(); }, [loadFiles]);

  const uploadFile = useCallback(async (file: File) => {
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setUploads(prev => [...prev, {
      id: jobId, filename: file.name, size: file.size,
      progress: 0, status: 'queued',
    }]);

    const setJob = (patch: Partial<UploadJob>) =>
      setUploads(prev => prev.map(u => u.id === jobId ? { ...u, ...patch } : u));

    try {
      // 1) Presign
      const presignR = await fetch(`${API_BASE}/api/storage/presign-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          category,
          size: file.size,
        }),
      });
      if (!presignR.ok) {
        const data = await presignR.json().catch(() => ({}));
        throw new Error(data.detail || `Presign failed: ${presignR.status}`);
      }
      const presign = await presignR.json();
      setJob({ status: 'uploading' });

      // 2) PUT to S3 with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presign.url);
        Object.entries(presign.headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, String(v)));
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setJob({ progress: Math.round((e.loaded / e.total) * 100) });
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 PUT ${xhr.status}`));
        xhr.onerror = () => reject(new Error('S3 network error'));
        xhr.send(file);
      });

      // 3) Confirm
      await fetch(`${API_BASE}/api/storage/confirm-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ key: presign.key, size: file.size }),
      });
      setJob({ status: 'done', progress: 100 });
      // Refresh list
      loadFiles();
    } catch (e) {
      setJob({ status: 'error', error: e instanceof Error ? e.message : 'Upload failed' });
    }
  }, [category, loadFiles]);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    Array.from(list).forEach(uploadFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDownload = async (key: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/storage/presign-download?key=${encodeURIComponent(key)}`, { headers: authHeader() });
      if (!r.ok) throw new Error('Download URL failed');
      const d = await r.json();
      window.open(d.url, '_blank', 'noopener');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Delete this file from S3? This cannot be undone.')) return;
    try {
      await fetch(`${API_BASE}/api/storage/file?key=${encodeURIComponent(key)}`, {
        method: 'DELETE', headers: authHeader(),
      });
      loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-950 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-5 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            data-testid="storage-back-btn"
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <Cloud size={26} className="text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold font-serif">Cloud Storage</h1>
            <p className="text-xs text-gray-400">Receipts, photos, payroll exports — synced to AWS S3</p>
          </div>
        </div>

        {/* Configuration banner */}
        {config && !config.configured && (
          <div
            data-testid="storage-not-configured-banner"
            className="mb-6 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/40 rounded-xl"
          >
            <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-200">S3 storage is not configured</p>
              <p className="text-xs text-amber-100/80 mt-1">
                Paste your AWS keys (Access Key ID, Secret Access Key, Region, Bucket) in
                <span className="font-mono"> Founder → Integration Keys → AWS S3</span>.
                Uploads will start working instantly after you save.
              </p>
            </div>
          </div>
        )}

        {config?.configured && (
          <div className="mb-6 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 size={14} />
            <span>Bucket: <code className="text-emerald-300">{config.bucket}</code> · Region: <code className="text-emerald-300">{config.region}</code></span>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              data-testid={`storage-cat-${c}`}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                category === c
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="storage-dropzone"
          className={`mb-6 flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            dragOver
              ? 'border-sky-400 bg-sky-500/10'
              : config?.configured
                ? 'border-white/15 hover:border-white/30 hover:bg-white/5'
                : 'border-white/10 opacity-60 cursor-not-allowed'
          }`}
        >
          <Upload size={28} className="text-sky-400" />
          <p className="text-sm font-semibold">
            {config?.configured ? 'Drop files here or click to browse' : 'Configure S3 to enable uploads'}
          </p>
          <p className="text-xs text-gray-400">
            Files go directly to <code>users/&lt;your-id&gt;/{category}/</code>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            data-testid="storage-file-input"
            disabled={!config?.configured}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Active uploads */}
        {uploads.length > 0 && (
          <div className="mb-6 space-y-2" data-testid="storage-upload-progress">
            {uploads.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                <FileIcon size={16} className="text-sky-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-mono">{u.filename}</p>
                  <div className="mt-1 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${u.status === 'error' ? 'bg-red-500' : u.status === 'done' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                </div>
                <span className={`text-[10px] uppercase font-semibold ${
                  u.status === 'done' ? 'text-emerald-400' :
                  u.status === 'error' ? 'text-red-400' : 'text-sky-300'
                }`}>{u.status === 'error' ? (u.error || 'failed') : u.status}</span>
                {(u.status === 'done' || u.status === 'error') && (
                  <button
                    onClick={() => setUploads(p => p.filter(x => x.id !== u.id))}
                    className="text-gray-500 hover:text-gray-300"
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* File list */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden" data-testid="storage-file-list">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold flex items-center gap-2"><FolderOpen size={16} /> {category}</h2>
            <span className="text-xs text-gray-400">{files.length} file{files.length === 1 ? '' : 's'}</span>
          </div>
          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
          ) : files.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No files yet. Drop your first {category} above.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {files.map(f => (
                <li key={f.key} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                  <FileIcon size={18} className="text-sky-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.original_filename || f.filename}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {formatBytes(f.size)} · {new Date(f.uploaded_at || f.created_at).toLocaleString()}
                      {f.status === 'pending' && <span className="ml-2 text-amber-400">(upload in progress)</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(f.key)}
                    data-testid={`storage-download-${f.key}`}
                    title="Download"
                    className="p-2 text-gray-300 hover:text-sky-400 hover:bg-white/5 rounded-md transition-colors"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(f.key)}
                    data-testid={`storage-delete-${f.key}`}
                    title="Delete"
                    className="p-2 text-gray-300 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
