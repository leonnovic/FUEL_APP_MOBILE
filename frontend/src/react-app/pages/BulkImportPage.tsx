/**
 * CSV / Excel bulk import — uploads a file, parses via `xlsx` (already in deps),
 * shows a preview, then submits to `POST /api/bulk-import/{collection}`.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';

const API_BASE = import.meta.env.VITE_REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const COLLECTIONS = [
  { id: 'sales',       label: 'Sales',       desc: 'Pump sales, daily transactions' },
  { id: 'deliveries',  label: 'Deliveries',  desc: 'Customer deliveries / dispatches' },
  { id: 'employees',   label: 'Employees',   desc: 'Staff records' },
  { id: 'invoices',    label: 'Invoices',    desc: 'Customer invoices' },
  { id: 'inventory',   label: 'Inventory',   desc: 'Stock + product records' },
  { id: 'expenses',    label: 'Expenses',    desc: 'Operating expenses' },
  { id: 'suppliers',   label: 'Suppliers',   desc: 'Supplier contacts' },
  { id: 'stations',    label: 'Stations',    desc: 'Fuel station list' },
];

export default function BulkImportPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [collection, setCollection] = useState('sales');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFilename(f.name); setStatus(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const parsed: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { raw: false });
      setRows(parsed);
      setStatus({ kind: 'ok', text: `Parsed ${parsed.length} rows from ${f.name}` });
    } catch (err) {
      setStatus({ kind: 'err', text: `Failed to parse: ${err instanceof Error ? err.message : String(err)}` });
      setRows([]);
    }
  };

  const submit = async () => {
    setStatus(null); setLoading(true);
    try {
      const token = localStorage.getItem('fuelpro_jwt');
      const r = await fetch(`${API_BASE}/api/bulk-import/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: rows, mode }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Import failed');
      setStatus({ kind: 'ok', text: `Imported ${data.imported} records into ${data.collection} (mode: ${data.mode})` });
      setRows([]); setFilename('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' });
    } finally { setLoading(false); }
  };

  const preview = rows.slice(0, 5);
  const columns = preview.length > 0 ? Object.keys(preview[0]) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/30 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 pt-12">
        <button onClick={() => navigate(-1)} className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2" data-testid="bulk-back-btn">
          <ArrowLeft size={16} /> Back
        </button>

        <header className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">Bulk Import</h1>
            <p className="text-sm text-gray-400">Upload CSV or Excel — works with any FuelPro collection.</p>
          </div>
        </header>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Target collection</label>
              <select value={collection} onChange={e => setCollection(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-lg text-sm"
                      data-testid="bulk-collection-select">
                {COLLECTIONS.map(c => <option key={c.id} value={c.id}>{c.label} — {c.desc}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value as 'append' | 'replace')}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-lg text-sm"
                      data-testid="bulk-mode-select">
                <option value="append">Append (keep existing rows)</option>
                <option value="replace">Replace (delete all existing first)</option>
              </select>
            </div>
          </div>

          <label className="block border-2 border-dashed border-white/[0.15] hover:border-cyan-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors" data-testid="bulk-dropzone">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFile} className="hidden" data-testid="bulk-file-input" />
            <Upload size={32} className="mx-auto mb-2 text-cyan-400" />
            <p className="text-sm font-semibold">{filename || 'Click to choose .csv / .xlsx / .xls'}</p>
            <p className="text-[11px] text-gray-500 mt-1">First sheet, first row = column headers</p>
          </label>
        </div>

        {status && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${status.kind === 'ok' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`} data-testid="bulk-status">
            {status.kind === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {status.text}
          </div>
        )}

        {rows.length > 0 && (
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden mb-6" data-testid="bulk-preview">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <FileSpreadsheet size={14} /> Preview — first 5 of {rows.length} rows
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-white/5">
                    {columns.map(c => <th key={c} className="text-left px-3 py-2 font-mono text-gray-400 whitespace-nowrap">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-white/[0.04]">
                      {columns.map(c => <td key={c} className="px-3 py-2 whitespace-nowrap">{String(row[c] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-white/[0.06]">
              <button onClick={submit} disabled={loading}
                      className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 text-black rounded-lg text-sm font-bold flex items-center gap-2"
                      data-testid="bulk-submit">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Import {rows.length} rows
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
