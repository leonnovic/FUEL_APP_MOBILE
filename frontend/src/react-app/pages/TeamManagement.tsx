/**
 * Team Members management page.
 *
 * Lets owners/managers:
 *  • Invite teammates by email (server-side, /api/invites)
 *  • Copy invite links to send via WhatsApp / SMS
 *  • See pending / accepted invites
 *  • Revoke unused invites (TODO: backend endpoint)
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, UserPlus, Copy, Mail, Crown, ShieldCheck, UserCheck, Eye,
  CheckCircle2, Clock, Loader2, ArrowLeft, AlertCircle, ExternalLink, Settings,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_REACT_APP_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

interface Invite {
  id: string;
  code: string;
  email: string;
  role: 'owner' | 'manager' | 'staff' | 'auditor';
  station_id: string | null;
  invited_by_name: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

interface TeamUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'staff' | 'auditor';
  tier: string;
  subscription_status: string;
  created_at: string;
}

const ROLE_META: Record<Invite['role'], { label: string; desc: string; icon: typeof Users; color: string }> = {
  owner:   { label: 'Owner',   desc: 'Full control — billing, settings, team',   icon: Crown,       color: '#a855f7' },
  manager: { label: 'Manager', desc: 'Day-to-day operations + invite staff',     icon: ShieldCheck, color: '#3b82f6' },
  staff:   { label: 'Staff',   desc: 'Pump shifts, sales entry',                 icon: UserCheck,   color: '#22c55e' },
  auditor: { label: 'Auditor', desc: 'Read-only access to reports + audit log',  icon: Eye,         color: '#f59e0b' },
};

export default function TeamManagement() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Invite['role']>('staff');
  const [submitting, setSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [roleUpdateMsg, setRoleUpdateMsg] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('fuelpro_jwt');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const token = getToken();
      if (!token) { setError('Please sign in.'); setLoading(false); return; }
      // Fetch invites and team users in parallel
      const [invitesRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/invites`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!invitesRes.ok) throw new Error(`Invites failed: ${invitesRes.status}`);
      const invitesData = await invitesRes.json();
      setInvites(invitesData.items || []);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      } else if (usersRes.status === 403) {
        // Manager-only endpoint — silently skip if user isn't authorised
        setUsers([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load team data');
    } finally { setLoading(false); }
  };

  const changeUserRole = async (userId: string, newRole: TeamUser['role']) => {
    setSavingUserId(userId); setRoleUpdateMsg(null);
    try {
      const token = getToken();
      const r = await fetch(`${API_BASE}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || `Failed (${r.status})`);
      // Update locally so the UI reflects the change immediately
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setRoleUpdateMsg(`Role updated for ${data.user_id?.slice(0, 8) || userId.slice(0, 8)}…`);
      setTimeout(() => setRoleUpdateMsg(null), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to change role');
    } finally { setSavingUserId(null); }
  };

  useEffect(() => { load(); }, []);

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const token = getToken();
      const r = await fetch(`${API_BASE}/api/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Failed to create invite');
      setEmail('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create invite');
    } finally { setSubmitting(false); }
  };

  const copyLink = async (inv: Invite) => {
    const url = `${window.location.origin}/#/join/${inv.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(inv.code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      window.prompt('Copy this invite link:', url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pt-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
          data-testid="team-back-btn"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif">Team Members</h1>
              <p className="text-sm text-gray-400">Invite teammates and assign roles</p>
            </div>
          </div>
        </header>

        {/* Invite form */}
        <form
          onSubmit={createInvite}
          className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 mb-8"
        >
          <h2 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2">
            <UserPlus size={16} /> Send a new invite
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Teammate email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-amber-500"
                  data-testid="team-invite-email"
                  required
                />
              </div>
            </div>
            <div className="sm:col-span-4">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as Invite['role'])}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-amber-500"
                data-testid="team-invite-role"
              >
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="auditor">Auditor</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 text-black rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                data-testid="team-invite-submit"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Invite
              </button>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            We'll email an invite link via Resend (if configured). You can also copy the link from the list below and share via WhatsApp.
          </p>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700/40 rounded-xl flex items-start gap-3" data-testid="team-error">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Invite list */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-400">All invites ({invites.length})</h2>
            <button onClick={load} className="text-xs text-gray-400 hover:text-white">Refresh</button>
          </div>

          {loading && (
            <div className="p-12 flex items-center justify-center text-gray-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          )}

          {!loading && invites.length === 0 && (
            <div className="p-12 text-center text-gray-500 text-sm" data-testid="team-empty-state">
              No invites yet. Send your first one above.
            </div>
          )}

          {!loading && invites.length > 0 && (
            <div className="divide-y divide-white/[0.04]">
              {invites.map(inv => {
                const meta = ROLE_META[inv.role];
                const Icon = meta.icon;
                const expired = new Date(inv.expires_at) < new Date();
                const status = inv.status === 'accepted' ? 'accepted'
                  : expired ? 'expired'
                  : 'pending';
                return (
                  <div key={inv.id} className="p-4 hover:bg-white/[0.03] transition-colors" data-testid={`team-invite-row-${inv.code}`}>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}20`, color: meta.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{inv.email}</p>
                        <p className="text-xs text-gray-400">
                          <span style={{ color: meta.color }}>{meta.label}</span> · invited by {inv.invited_by_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {status === 'accepted' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={11} /> Accepted
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            <Clock size={11} /> Pending
                          </span>
                        )}
                        {status === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            Expired
                          </span>
                        )}
                        {status === 'pending' && (
                          <button
                            onClick={() => copyLink(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] rounded-md text-[11px] font-semibold"
                            data-testid={`team-copy-${inv.code}`}
                          >
                            {copiedCode === inv.code ? <><CheckCircle2 size={11} /> Copied</> : <><Copy size={11} /> Copy link</>}
                          </button>
                        )}
                        {status === 'pending' && (
                          <a
                            href={`/#/join/${inv.code}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] rounded-md text-[11px] font-semibold"
                          >
                            <ExternalLink size={11} /> Open
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Role Management — owner-only section */}
        <div className="mt-8 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden" data-testid="team-roles-section">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-amber-400" />
              <h2 className="text-sm font-bold text-amber-400">Roles & Permissions ({users.length})</h2>
            </div>
            {roleUpdateMsg && (
              <span className="text-[11px] text-green-400 flex items-center gap-1" data-testid="team-role-update-msg">
                <CheckCircle2 size={11} /> {roleUpdateMsg}
              </span>
            )}
          </div>

          {users.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-500 text-sm" data-testid="team-roles-empty">
              Sign in as an owner or manager to manage roles, or no other users exist yet.
            </div>
          )}

          {users.length > 0 && (
            <div className="divide-y divide-white/[0.04]">
              {users.map(u => {
                const meta = ROLE_META[u.role] || ROLE_META.staff;
                const Icon = meta.icon;
                return (
                  <div key={u.id} className="p-4 hover:bg-white/[0.03] transition-colors" data-testid={`team-role-row-${u.id}`}>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${meta.color}20`, color: meta.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.name || u.email}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {u.email} · <span className="capitalize">{u.tier}</span> · {u.subscription_status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={u.role}
                          disabled={savingUserId === u.id}
                          onChange={(e) => changeUserRole(u.id, e.target.value as TeamUser['role'])}
                          className="px-2.5 py-1.5 bg-black/40 border border-white/[0.08] rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                          data-testid={`team-role-select-${u.id}`}
                        >
                          <option value="owner">Owner</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                          <option value="auditor">Auditor</option>
                        </select>
                        {savingUserId === u.id && <Loader2 size={14} className="animate-spin text-amber-400" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 text-[11px] text-gray-500 border-t border-white/[0.06]">
            Only owners can change roles. Manager → Staff → Auditor are progressively read-only.
          </div>
        </div>
      </div>
    </div>
  );
}
