/**
 * Audit Log dashboard — searchable, filterable view of every action in the
 * user's tenant. Reads from `GET /api/audit-log` which the backend already
 * populates via every mutating endpoint (login, invite, role-change, digest
 * send, AI reconcile, subscription activate, etc.).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { History, Search, Filter, ArrowLeft, Loader2, Calendar, User as UserIcon } from 'lucide-react';

const API_BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

interface AuditRow {
  id: string;
  user_id: string;
  action: string;
  at: string;
  meta?: Record<string, unknown>;
}

const ACTION_COLORS: Record<string, string> = {
  'user.register':            '#3b82f6',
  'user.role_changed':        '#a855f7',
  'auth.password_reset':      '#f59e0b',
  'subscription.activated':   '#22c55e',
  'invite.created':           '#06b6d4',
  'invite.accepted':          '#84cc16',
  'ai.reconcile_mpesa':       '#ec4899',
  'digest.send':              '#10b981',
  'founder.login':            '#eab308',
  'founder.password_changed': '#f97316',
};

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    const token = localStorage.getItem('fuelpro_jwt');
    if (!token) { setError('Please sign in.'); setLoading(false); return; }
    fetch(`${API_BASE}/api/audit-log?limit=500`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setRows(d.items || []); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  const actions = useMemo(() => Array.from(new Set(rows.map(r => r.action))).sort(), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (actionFilter !== 'all' && r.action !== actionFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.action.toLowerCase().includes(q) ||
           JSON.stringify(r.meta || {}).toLowerCase().includes(q);
  }), [rows, search, actionFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pt-12">
        <button onClick={() => navigate(-1)} className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2" data-testid="audit-back-btn">
          <ArrowLeft size={16} /> Back
        </button>

        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <History size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif">Audit Log</h1>
              <p className="text-sm text-gray-400">Every action in your FuelPro tenant, for compliance and forensics.</p>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search action or metadata…"
                  className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-rose-500"
                  data-testid="audit-search"
                />
              </div>
            </div>
            <div className="sm:col-span-5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Action type</label>
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-rose-500"
                  data-testid="audit-filter"
                >
                  <option value="all">All actions ({rows.length})</option>
                  {actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden" data-testid="audit-list">
          {loading && (
            <div className="p-12 flex items-center justify-center text-gray-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading audit log…
            </div>
          )}
          {error && (
            <div className="p-6 text-sm text-red-300" data-testid="audit-error">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-12 text-center text-gray-500 text-sm" data-testid="audit-empty">
              No audit entries match your filter.
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-white/[0.04] max-h-[60vh] overflow-y-auto">
              {filtered.map(row => {
                const colour = ACTION_COLORS[row.action] || '#94a3b8';
                return (
                  <div key={row.id} className="p-4 hover:bg-white/[0.03] flex items-start gap-3" data-testid={`audit-row-${row.id}`}>
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: colour }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold font-mono" style={{ color: colour }}>{row.action}</span>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1"><Calendar size={9} />{new Date(row.at).toLocaleString()}</span>
                        {row.user_id && <span className="text-[10px] text-gray-500 flex items-center gap-1"><UserIcon size={9} />{row.user_id.slice(0, 8)}…</span>}
                      </div>
                      {row.meta && Object.keys(row.meta).length > 0 && (
                        <pre className="text-[10px] text-gray-400 mt-1 bg-black/30 rounded p-2 overflow-x-auto font-mono">
                          {JSON.stringify(row.meta, null, 0)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="p-3 border-t border-white/[0.06] text-[11px] text-gray-500 flex items-center justify-between">
              <span>Showing {filtered.length} of {rows.length} entries</span>
              <span>Newest first</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
