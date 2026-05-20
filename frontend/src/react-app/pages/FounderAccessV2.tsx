import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard, Users, Building2, Fuel, Settings, Shield,
  CreditCard, Tag, Key, Database, Receipt, BarChart3, Activity,
  DollarSign, ShoppingCart, Wrench, ChevronLeft, ChevronRight,
  LogOut, Crown, RefreshCw, Plus, Edit3, Trash2, Eye, EyeOff,
  CheckCircle2, AlertTriangle, X, Save, Moon, Sun, Menu, XCircle,
  ChevronDown, ChevronUp, Search, Globe
} from 'lucide-react';

// ─── Storage Keys ───
const SESSION_KEY = 'fuelpro_founder_session';
const FOUNDER_JWT_KEY = 'fuelpro_founder_jwt';
// Display-only hint — actual auth is performed by the backend.
const DEFAULT_CREDS = { username: 'FOUNDER', password: 'publican1D#20' };
// Mirror the pattern from /lib/backendApi.ts: prefer the env var, otherwise
// use window.location.origin so the ingress proxies /api/* correctly.
const API_BASE = (
  (import.meta as unknown as { env?: Record<string, string> }).env?.REACT_APP_BACKEND_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

// ═══════════════════════════════════════════════════
//  FOUNDER AUTH - Local (ready for tRPC upgrade)
// ═══════════════════════════════════════════════════
function useFounderAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) { setIsLoading(false); return; }
      const s = JSON.parse(raw);
      if (s?.active && s?.loginTime && Date.now() - s.loginTime < 8 * 3600 * 1000) {
        setIsAuthenticated(true);
        setUsername(s.username || 'FOUNDER');
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch { /* */ }
    setIsLoading(false);
  };

  const login = async (user: string, pw: string) => {
    setError('');
    // Defensive trim — common cause of "invalid password" is a copy-paste
    // that brought along a trailing space / newline.
    const cleanUser = (user || '').trim();
    const cleanPw = (pw || '').trim();

    try {
      // Authenticate against the real backend so the founder gets a real
      // JWT (required by /api/founder/integrations, /system-stats, etc.)
      const r = await fetch(`${API_BASE}/api/founder/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPw }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.token) {
          localStorage.setItem(FOUNDER_JWT_KEY, data.token);
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            username: cleanUser || 'FOUNDER',
            active: true,
            loginTime: Date.now(),
            must_change_password: !!data.must_change_password,
          }));
          setIsAuthenticated(true);
          setUsername(cleanUser || 'FOUNDER');
          return true;
        }
      } else if (r.status === 429) {
        setError('Too many failed attempts. Wait an hour or contact support.');
        return false;
      } else if (r.status === 401) {
        // Surface the precise reason from the backend so users aren't guessing.
        const body = await r.json().catch(() => ({}));
        setError(body.detail || 'Invalid password. Default is publican1D#20 (case-sensitive).');
        return false;
      }
      // Fall through to client-side check below (back-compat for offline UX)
    } catch (e) {
      // Network error — fall back to client-side check
      // eslint-disable-next-line no-console
      console.warn('Founder login network error:', e);
    }
    // Back-compat: allow local-only login when username + password match defaults.
    // Username is case-insensitive (e.g. "founder", "Founder", "FOUNDER" all work).
    if (cleanUser.toUpperCase() === DEFAULT_CREDS.username && cleanPw === DEFAULT_CREDS.password) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: 'FOUNDER', active: true, loginTime: Date.now() }));
      setIsAuthenticated(true);
      setUsername('FOUNDER');
      return true;
    }
    setError('Invalid password. Default is "publican1D#20" (case-sensitive). Check Caps Lock + that you didn\'t paste a trailing space.');
    return false;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(FOUNDER_JWT_KEY);
    setIsAuthenticated(false);
    setUsername('');
    window.location.reload();
  };

  return { isAuthenticated, isLoading, username, error, login, logout };
}

// ═══════════════════════════════════════════════════
//  SECTION TYPES
// ═══════════════════════════════════════════════════
type SectionId = 'dashboard' | 'users' | 'stations' | 'sales' | 'inventory'
  | 'pricing' | 'coupons' | 'security' | 'analytics' | 'config'
  | 'apikeys' | 'backups';

// ═══════════════════════════════════════════════════
//  LOGIN COMPONENT
// ═══════════════════════════════════════════════════
function FounderLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('FOUNDER');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useFounderAuth();

  const handleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    const success = await login(username, password);
    setIsSubmitting(false);
    if (success) onLogin();
    else setError('Invalid username or password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <Crown size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Founder Access</h1>
            <p className="text-sm text-gray-500 mt-1">FuelPro Backend Administration</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="FOUNDER"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 text-sm" />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="button" onClick={handleLogin} disabled={isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
              <Shield size={16} /> {isSubmitting ? 'Authenticating...' : 'Access Backend'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  DATA TABLE
// ═══════════════════════════════════════════════════
function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {headers.map(h => <th key={h} className="px-4 py-2 text-xs text-gray-500 font-medium uppercase">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  KPI CARD
// ═══════════════════════════════════════════════════
function KpiCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{title}</span>
        <Icon size={14} className={color} />
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  DASHBOARD SECTION
// ═══════════════════════════════════════════════════
function DashboardSection() {
  const [sales] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fuelpro_sales') || '[]'); } catch { return []; }
  });
  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
  const totalSales = sales.length;
  const inventory = JSON.parse(localStorage.getItem('fuelpro_inventory') || '[]');
  const users = JSON.parse(localStorage.getItem('fuelpro_users') || '[]');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Overview of your FuelPro platform</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} color="text-amber-400" />
        <KpiCard title="Total Sales" value={totalSales} icon={ShoppingCart} color="text-emerald-400" />
        <KpiCard title="Inventory Items" value={inventory.length} icon={Database} color="text-blue-400" />
        <KpiCard title="Users" value={users.length} icon={Users} color="text-purple-400" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><BarChart3 size={14} className="text-amber-400" /> Revenue Trend</h3>
          <div className="h-40 flex items-end gap-2">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
              <div key={i} className="flex-1 bg-amber-500/20 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-600">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><Activity size={14} className="text-emerald-400" /> Recent Activity</h3>
          <div className="space-y-2">
            {[
              { action: 'Sale recorded', detail: 'Fuel sale #1042', time: '2 min ago', color: 'text-emerald-400' },
              { action: 'Inventory updated', detail: 'Tank 1 refilled', time: '15 min ago', color: 'text-blue-400' },
              { action: 'New user', detail: 'Manager account created', time: '1 hour ago', color: 'text-purple-400' },
              { action: 'Price change', detail: 'Petrol updated', time: '3 hours ago', color: 'text-amber-400' },
              { action: 'Backup created', detail: 'Daily auto-backup', time: '5 hours ago', color: 'text-gray-400' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full ${item.color.replace('text', 'bg')}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{item.action}</p>
                  <p className="text-[10px] text-gray-500">{item.detail}</p>
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  USERS SECTION
// ═══════════════════════════════════════════════════
function UsersSection() {
  const [users, setUsers] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('fuelpro_users') || '[]'); } catch { return []; }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Users</h2><p className="text-sm text-gray-500 mt-1">Manage platform users</p></div>
        <button className="px-3 py-2 bg-amber-500/15 text-amber-400 rounded-lg text-xs border border-amber-500/20 flex items-center gap-1"><Plus size={14} /> Add User</button>
      </div>
      <DataTable headers={['ID', 'Name', 'Email', 'Role', 'Status', 'Created', 'Actions']}>
        {users.length > 0 ? users.map((u: any, i: number) => (
          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
            <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{i + 1}</td>
            <td className="px-4 py-3 text-white text-sm">{u.name || '—'}</td>
            <td className="px-4 py-3 text-gray-400 text-xs">{u.email || '—'}</td>
            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400">{u.role || 'user'}</span></td>
            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400">{u.status || 'active'}</span></td>
            <td className="px-4 py-3 text-gray-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
            <td className="px-4 py-3 flex gap-1"><button className="p-1 text-gray-500 hover:text-white"><Edit3 size={12} /></button><button className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button></td>
          </tr>
        )) : (
          <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">No users yet. Add your first user to get started.</td></tr>
        )}
      </DataTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  STATIONS SECTION
// ═══════════════════════════════════════════════════
function StationsSection() {
  const [stations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fuelpro_stations') || '[]'); } catch { return []; }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Stations</h2><p className="text-sm text-gray-500 mt-1">Manage all fuel stations</p></div>
        <button className="px-3 py-2 bg-amber-500/15 text-amber-400 rounded-lg text-xs border border-amber-500/20 flex items-center gap-1"><Plus size={14} /> Add Station</button>
      </div>
      <DataTable headers={['ID', 'Name', 'Location', 'Status', 'Revenue', 'Actions']}>
        {stations.length > 0 ? stations.map((s: any, i: number) => (
          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
            <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{i + 1}</td>
            <td className="px-4 py-3 text-white text-sm font-medium">{s.name || 'Station ' + (i + 1)}</td>
            <td className="px-4 py-3 text-gray-400 text-xs">{s.location || '—'}</td>
            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${s.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{s.status || 'active'}</span></td>
            <td className="px-4 py-3 text-emerald-400 text-sm">${s.revenue || 0}</td>
            <td className="px-4 py-3 flex gap-1"><button className="p-1 text-gray-500 hover:text-white"><Edit3 size={12} /></button><button className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button></td>
          </tr>
        )) : (
          <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">No stations configured yet.</td></tr>
        )}
      </DataTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  SALES SECTION
// ═══════════════════════════════════════════════════
function SalesSection() {
  const [sales] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fuelpro_sales') || '[]'); } catch { return []; }
  });
  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-white">Sales & Revenue</h2><p className="text-sm text-gray-500 mt-1">All sales transactions</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} color="text-amber-400" />
        <KpiCard title="Total Sales" value={sales.length} icon={ShoppingCart} color="text-emerald-400" />
        <KpiCard title="Avg Sale" value={sales.length ? `$${(totalRevenue / sales.length).toFixed(2)}` : '$0.00'} icon={Receipt} color="text-blue-400" />
        <KpiCard title="Today" value={sales.filter((s: any) => s.date && new Date(s.date).toDateString() === new Date().toDateString()).length} icon={Activity} color="text-purple-400" />
      </div>
      <DataTable headers={['ID', 'Fuel Type', 'Qty (L)', 'Price/L', 'Total', 'Method', 'Date']}>
        {sales.length > 0 ? sales.map((s: any, i: number) => (
          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
            <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{i + 1}</td>
            <td className="px-4 py-3 text-white capitalize text-sm">{s.fuelType || '—'}</td>
            <td className="px-4 py-3 text-gray-300 text-sm">{s.quantity || '—'}</td>
            <td className="px-4 py-3 text-gray-300 text-sm">{s.pricePerLiter || '—'}</td>
            <td className="px-4 py-3 text-emerald-400 font-medium text-sm">{s.total || '—'}</td>
            <td className="px-4 py-3 text-gray-400 text-xs">{s.paymentMethod || '—'}</td>
            <td className="px-4 py-3 text-gray-500 text-xs">{s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
          </tr>
        )) : (
          <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">No sales recorded yet. Start adding sales from the main app.</td></tr>
        )}
      </DataTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  INVENTORY SECTION
// ═══════════════════════════════════════════════════
function InventorySection() {
  const [items] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fuelpro_inventory') || '[]'); } catch { return []; }
  });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-white">Inventory</h2><p className="text-sm text-gray-500 mt-1">Fuel stock across all stations</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Total Items" value={items.length} icon={Database} color="text-blue-400" />
        <KpiCard title="Low Stock Alerts" value={items.filter((i: any) => i.currentStock < i.alertThreshold).length} icon={AlertTriangle} color="text-red-400" />
        <KpiCard title="Total Capacity" value={`${items.reduce((sum: number, i: any) => sum + (Number(i.capacity) || 0), 0).toLocaleString()}L`} icon={Fuel} color="text-emerald-400" />
      </div>
      <DataTable headers={['ID', 'Fuel Type', 'Stock', 'Capacity', 'Fill %', 'Price/L', 'Alert']}>
        {items.length > 0 ? items.map((item: any, i: number) => {
          const fill = item.capacity > 0 ? Math.round((item.currentStock / item.capacity) * 100) : 0;
          const low = item.alertThreshold && item.currentStock < item.alertThreshold;
          return (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{i + 1}</td>
              <td className="px-4 py-3 text-white capitalize text-sm">{item.fuelType || '—'}</td>
              <td className="px-4 py-3 text-gray-300 text-sm">{item.currentStock}L</td>
              <td className="px-4 py-3 text-gray-300 text-sm">{item.capacity}L</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${low ? 'bg-red-500' : fill > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(fill, 100)}%` }} /></div>
                  <span className={`text-xs ${low ? 'text-red-400' : 'text-gray-400'}`}>{fill}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-emerald-400 text-sm">{item.pricePerLiter || '—'}</td>
              <td className="px-4 py-3">{low ? <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400">Low</span> : <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400">OK</span>}</td>
            </tr>
          );
        }) : (
          <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">No inventory items yet.</td></tr>
        )}
      </DataTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  PRICING SECTION
// ═══════════════════════════════════════════════════
function PricingSection() {
  const [plans] = useState([
    { name: 'Basic', price: '$29/mo', users: '3', stations: '1', features: ['Core POS', 'Sales tracking', 'Basic reports'] },
    { name: 'Professional', price: '$79/mo', users: '10', stations: '3', features: ['All Basic', 'Inventory', 'Payroll', 'Advanced analytics'] },
    { name: 'Enterprise', price: '$199/mo', users: 'Unlimited', stations: 'Unlimited', features: ['All Pro', 'Multi-station', 'API access', 'Priority support'] },
  ]);

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-white">Pricing Plans</h2><p className="text-sm text-gray-500 mt-1">Manage subscription tiers</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.name} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-amber-500/30 transition-colors">
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            <p className="text-2xl font-bold text-amber-400 mt-2">{plan.price}</p>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-400">Users: <span className="text-white">{plan.users}</span></p>
              <p className="text-xs text-gray-400">Stations: <span className="text-white">{plan.stations}</span></p>
            </div>
            <ul className="mt-4 space-y-1">
              {plan.features.map(f => <li key={f} className="text-xs text-gray-500 flex items-center gap-2"><CheckCircle2 size={10} className="text-emerald-400" /> {f}</li>)}
            </ul>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 py-2 bg-amber-500/15 text-amber-400 rounded-lg text-xs border border-amber-500/20 hover:bg-amber-500/25 transition-colors">Edit</button>
              <button className="py-2 px-3 bg-gray-800 text-gray-400 rounded-lg text-xs hover:text-white transition-colors"><Settings size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  COUPONS SECTION
// ═══════════════════════════════════════════════════
function CouponsSection() {
  const [coupons] = useState([
    { code: 'WELCOME50', type: 'percentage', value: 50, uses: 0, max: 100, status: 'active' },
    { code: 'FUELPRO25', type: 'percentage', value: 25, uses: 12, max: 200, status: 'active' },
    { code: 'STAFF10', type: 'fixed', value: 10, uses: 45, max: 500, status: 'active' },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Coupons</h2><p className="text-sm text-gray-500 mt-1">Manage discount codes</p></div>
        <button className="px-3 py-2 bg-amber-500/15 text-amber-400 rounded-lg text-xs border border-amber-500/20 flex items-center gap-1"><Plus size={14} /> Add Coupon</button>
      </div>
      <DataTable headers={['Code', 'Type', 'Value', 'Uses', 'Max Uses', 'Status', 'Actions']}>
        {coupons.map((c, i) => (
          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
            <td className="px-4 py-3 text-white font-mono text-sm">{c.code}</td>
            <td className="px-4 py-3 text-gray-400 text-xs capitalize">{c.type}</td>
            <td className="px-4 py-3 text-amber-400 text-sm">{c.type === 'percentage' ? `${c.value}%` : `$${c.value}`}</td>
            <td className="px-4 py-3 text-gray-300 text-sm">{c.uses}</td>
            <td className="px-4 py-3 text-gray-300 text-sm">{c.max}</td>
            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{c.status}</span></td>
            <td className="px-4 py-3 flex gap-1"><button className="p-1 text-gray-500 hover:text-white"><Edit3 size={12} /></button><button className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  SECURITY SECTION
// ═══════════════════════════════════════════════════
function SecuritySection() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAStep, setTwoFAStep] = useState<'qr' | 'verify'>('qr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fuelpro_founder_2fa');
      if (saved) { const parsed = JSON.parse(saved); setTwoFAEnabled(parsed.enabled); }
    } catch { /* */ }
  }, []);

  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Min 8 characters'); return; }
    const token = localStorage.getItem('fuelpro_founder_jwt') || '';
    try {
      const r = await fetch(`${API_BASE}/api/founder/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await r.json();
      if (!r.ok) { setPwError(data.detail || 'Change failed'); return; }
      setPwSuccess('Password updated. Use the new password next time you sign in.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'Network error');
    }
  };

  const handleEnable2FA = async () => {
    if (twoFAStep === 'qr') {
      const { genSecret } = await import('@/react-app/lib/totp');
      setTwoFASecret(genSecret());
      setTwoFAStep('verify');
    } else {
      const { verifyCode } = await import('@/react-app/lib/totp');
      if (verifyCode(twoFASecret, twoFACode)) {
        localStorage.setItem('fuelpro_founder_2fa', JSON.stringify({ enabled: true, secret: btoa(twoFASecret) }));
        setTwoFAEnabled(true); setShow2FA(false); setTwoFAStep('qr'); setTwoFACode('');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold text-white">Security</h2><p className="text-sm text-gray-500 mt-1">2FA, password, session control</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><Shield size={14} className="text-amber-400" /> Two-Factor Authentication</h3>
          <p className="text-xs text-gray-500 mb-3">{twoFAEnabled ? '2FA is active.' : 'Protect with TOTP-based 2FA.'}</p>
          {twoFAEnabled && <div className="flex items-center gap-2 mb-3 text-emerald-400 text-xs"><CheckCircle2 size={12} /> 2FA Active</div>}
          <button onClick={() => { setShow2FA(true); setTwoFAStep('qr'); }} className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded-lg text-xs border border-amber-500/20 transition-colors">{twoFAEnabled ? 'Manage 2FA' : 'Configure 2FA'}</button>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><Key size={14} className="text-blue-400" /> Change Password</h3>
          <div className="space-y-3">
            <input type="password" placeholder="Current password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50" />
            <input type="password" placeholder="New password (min 6)" value={newPw} onChange={e => setNewPw(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50" />
            <input type="password" placeholder="Confirm password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50" />
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-emerald-400">{pwSuccess}</p>}
            <button onClick={handleChangePassword} className="w-full py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg text-xs border border-blue-500/20">Update Password</button>
          </div>
        </div>
      </div>

      {show2FA && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Configure 2FA</h3>
              <button onClick={() => setShow2FA(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            {twoFAStep === 'qr' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Scan with your authenticator app:</p>
                {twoFASecret && <div className="flex justify-center"><img src={(() => { try { const { formatSecret } = require('@/react-app/lib/totp'); return formatSecret(twoFASecret, 'FuelPro', 'Founder'); } catch { return ''; } })()} alt="2FA QR" className="w-48 h-48 rounded-lg bg-white p-2" /></div>}
                <div className="bg-gray-800 rounded-lg p-3 flex justify-between"><code className="text-xs text-gray-300 font-mono">{twoFASecret}</code></div>
                <button onClick={handleEnable2FA} className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium">Continue</button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Enter 6-digit code:</p>
                <input type="text" value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} placeholder="000000"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none" />
                <button onClick={handleEnable2FA} disabled={twoFACode.length !== 6} className="w-full py-2.5 bg-amber-500 disabled:bg-gray-700 text-white rounded-xl text-sm font-medium">Verify</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  ANALYTICS SECTION
// ═══════════════════════════════════════════════════
function AnalyticsSection() {
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-white">Analytics</h2><p className="text-sm text-gray-500 mt-1">Platform performance metrics</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Page Views', value: '12,458', change: '+12%', color: 'text-emerald-400' },
          { title: 'Active Sessions', value: '234', change: '+5%', color: 'text-blue-400' },
          { title: 'Conversion Rate', value: '3.2%', change: '+0.4%', color: 'text-purple-400' },
          { title: 'Avg Load Time', value: '1.2s', change: '-0.3s', color: 'text-amber-400' },
        ].map(k => (
          <div key={k.title} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500">{k.title}</p>
            <p className="text-xl font-bold text-white mt-1">{k.value}</p>
            <p className={`text-xs mt-1 ${k.color}`}>{k.change}</p>
          </div>
        ))}
      </div>
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-3">Sales Performance (Last 30 Days)</h3>
        <div className="h-48 flex items-end gap-1">
          {Array.from({ length: 30 }, (_, i) => 20 + Math.random() * 60).map((h, i) => (
            <div key={i} className="flex-1 bg-amber-500/20 rounded-t hover:bg-amber-500/40 transition-colors" style={{ height: `${h}%` }} title={`Day ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  CONFIG SECTION
// ═══════════════════════════════════════════════════
function ConfigSection() {
  const [config, setConfig] = useState({ siteName: 'FuelPro', currency: 'Ksh', timezone: 'UTC', language: 'en', maxStations: '10' });
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold text-white">System Configuration</h2><p className="text-sm text-gray-500 mt-1">Global platform settings</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Site Name', key: 'siteName', type: 'text' },
          { label: 'Currency', key: 'currency', type: 'select', options: ['USD', 'EUR', 'GBP', 'KES', 'NGN'] },
          { label: 'Timezone', key: 'timezone', type: 'select', options: ['UTC', 'Africa/Nairobi', 'America/New_York', 'Europe/London'] },
          { label: 'Language', key: 'language', type: 'select', options: ['en', 'fr', 'es', 'sw'] },
          { label: 'Max Stations', key: 'maxStations', type: 'text' },
        ].map(field => (
          <div key={field.key} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <label className="text-xs text-gray-500 mb-2 block">{field.label}</label>
            {field.type === 'select' ? (
              <select value={(config as any)[field.key]} onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50">
                {(field as any).options.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type="text" value={(config as any)[field.key]} onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500/50" />
            )}
          </div>
        ))}
      </div>
      <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Save size={14} /> Save Changes</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  API KEYS SECTION
// ═══════════════════════════════════════════════════
function ApiKeysSection() {
  const [keys] = useState([
    { name: 'Production API', key: 'fp_live_xxxxxxxxxxxx', status: 'active', created: '2024-01-15' },
    { name: 'Sandbox API', key: 'fp_test_xxxxxxxxxxxx', status: 'active', created: '2024-01-15' },
  ]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">API Keys</h2><p className="text-sm text-gray-500 mt-1">Manage API access tokens</p></div>
        <button className="px-3 py-2 bg-amber-500/15 text-amber-400 rounded-lg text-xs border border-amber-500/20 flex items-center gap-1"><Plus size={14} /> Generate Key</button>
      </div>
      {keys.map((k, i) => (
        <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">{k.name}</h4>
            <code className="text-xs text-gray-500 font-mono mt-1 block">{k.key}</code>
            <p className="text-[10px] text-gray-600 mt-1">Created: {k.created}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${k.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>{k.status}</span>
            <button className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"><Eye size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  BACKUPS SECTION
// ═══════════════════════════════════════════════════
function BackupsSection() {
  const [backups] = useState([
    { name: 'Daily Backup', date: '2024-01-20 03:00', size: '245 MB', status: 'success' },
    { name: 'Weekly Backup', date: '2024-01-14 02:00', size: '1.2 GB', status: 'success' },
  ]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Backups</h2><p className="text-sm text-gray-500 mt-1">Database and file backups</p></div>
        <button className="px-3 py-2 bg-amber-500/15 text-amber-400 rounded-lg text-xs border border-amber-500/20 flex items-center gap-1"><Plus size={14} /> Create Backup</button>
      </div>
      <DataTable headers={['Name', 'Date', 'Size', 'Status', 'Actions']}>
        {backups.map((b, i) => (
          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
            <td className="px-4 py-3 text-white text-sm">{b.name}</td>
            <td className="px-4 py-3 text-gray-400 text-xs">{b.date}</td>
            <td className="px-4 py-3 text-gray-300 text-sm">{b.size}</td>
            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${b.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{b.status}</span></td>
            <td className="px-4 py-3 flex gap-1"><button className="p-1 text-gray-500 hover:text-white"><RefreshCw size={12} /></button><button className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={12} /></button></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  SECTION RENDERER
// ═══════════════════════════════════════════════════
const SECTIONS: { id: SectionId; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'stations', label: 'Stations', icon: Building2 },
  { id: 'sales', label: 'Sales', icon: CreditCard },
  { id: 'inventory', label: 'Inventory', icon: Database },
  { id: 'pricing', label: 'Pricing', icon: Tag },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'config', label: 'Config', icon: Settings },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'backups', label: 'Backups', icon: Database },
];

function renderSection(activeSection: SectionId) {
  switch (activeSection) {
    case 'dashboard': return <DashboardSection />;
    case 'users': return <UsersSection />;
    case 'stations': return <StationsSection />;
    case 'sales': return <SalesSection />;
    case 'inventory': return <InventorySection />;
    case 'pricing': return <PricingSection />;
    case 'coupons': return <CouponsSection />;
    case 'security': return <SecuritySection />;
    case 'analytics': return <AnalyticsSection />;
    case 'config': return <ConfigSection />;
    case 'apikeys': return <ApiKeysSection />;
    case 'backups': return <BackupsSection />;
    default: return <DashboardSection />;
  }
}

// ═══════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function FounderAccessV2() {
  const { isAuthenticated, isLoading, username, logout } = useFounderAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading Founder Access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <FounderLogin onLogin={() => { /* state update in login() already triggers re-render */ }} />;
  }

  const sidebar = (
    <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300`}>
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
            <Crown size={18} className="text-white" />
          </div>
          {!sidebarCollapsed && <span className="text-white font-semibold text-sm">Founder</span>}
        </div>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-500 hover:text-white hidden md:block">
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {SECTIONS.map(section => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => { setActiveSection(section.id); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-amber-500/15 text-amber-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? section.label : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {!sidebarCollapsed && <span>{section.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-800">
        <button onClick={logout} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} className="shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{sidebar}</div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10">{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-gray-400 hover:text-white"><Menu size={20} /></button>
            <h1 className="text-sm font-semibold text-white">{SECTIONS.find(s => s.id === activeSection)?.label || 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">{username}</span>
            <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Crown size={14} className="text-amber-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderSection(activeSection)}
        </div>
      </main>
    </div>
  );
}
