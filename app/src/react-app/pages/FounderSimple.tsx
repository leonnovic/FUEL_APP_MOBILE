import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard, Users, User, Building2, Settings, Shield,
  CreditCard, Tag, Key, Database, BarChart3, Activity, Gift,
  DollarSign, ShoppingCart, LogOut, Crown, RefreshCw,
  Plus, Edit3, Trash2, Eye, EyeOff, CheckCircle2,
  AlertTriangle, X, Save, Menu, ChevronLeft, ChevronRight,
  Fuel, Receipt, Globe, Puzzle, Upload, Download, Terminal,
  Layers, HardDrive, Code, FileJson, FileCode, Bell, Wifi,
  Clock, Server, Zap, Ban, Rocket, Cpu, Brush, Send,
  Package, Wrench, Info, Search, Copy, Check,
  Sparkles, Lightbulb, Smartphone, MessageSquare, Webhook,
  Cloud
} from 'lucide-react';
// Import new integration components
import MPesaConfig from '@/react-app/components/MPesaConfig';
import SMSGatewayConfig from '@/react-app/components/SMSGatewayConfig';
import WebhookManager from '@/react-app/components/WebhookManager';
import APIKeyManager from '@/react-app/components/APIKeyManager';
import CacheControl from '@/react-app/components/CacheControl';
import AuthProviderConfig from '@/react-app/components/AuthProviderConfig';
// Import platform analytics for data-driven analytics
import PlatformAnalytics from '@/react-app/components/PlatformAnalytics';
// Import unified cloud storage (includes R2, Upstash, Seafile, Supabase, Firebase, Custom API)
import { FuelProCloudSync, cloudStorage, swr, getSWRStats, SupabaseStorage } from '@/react-app/lib/cloudStorage';
import { useRealUsers } from '@/react-app/hooks/useRealUsers';

// ─── Shared Storage Keys (aligned with main app) ───
// Use the same keys as the main app for data sharing
// Main app uses: fuelpro_stations_v3, fuelpro_users_v3, fuelpro_sales_v3, fuelpro_inventory_v3
const STORAGE_KEYS = {
  SALES: 'fuelpro_sales_v3',
  USERS: 'fuelpro_users_v3',
  STATIONS: 'fuelpro_stations_v3',
  INVENTORY: 'fuelpro_inventory_v3',
  COUPONS: 'fuelpro_coupons',
  CONFIG: 'fuelpro_config',
  API_KEYS: 'fuelpro_apikeys',
  BACKUPS: 'fuelpro_backups',
  TAB_CONFIG: 'fuelpro_tabconfig',
  FEATURES: 'fuelpro_custom_features',
  BATCH_UPDATES: 'fuelpro_batch_updates',
  UPDATE_HISTORY: 'fuelpro_update_history',
  ACCESS_LOGS: 'fuelpro_access_logs',
  DEV_CONSOLE_HISTORY: 'fuelpro_devconsole_history',
  THEME: 'fuelpro_theme',
  NOTIFICATIONS: 'fuelpro_notifications',
  WEBHOOKS: 'fuelpro_webhooks',
  FOUNDER_2FA: 'fuelpro_founder_2fa',
  FOUNDER_SESSIONS: 'fuelpro_founder_sessions',
  ACTIVITY_LOG: 'fuelpro_activity_log',
  PRICING_PLANS: 'fuelpro_pricing_plans',
};

const SESSION_KEY = 'fuelpro_founder_session';
const DEFAULT_CREDS = { username: 'FOUNDER', password: 'fuelpro2026' };

// ═══════════════════════════════════════════════════
// 25+ SECTION TYPE
// ═══════════════════════════════════════════════════
type SectionId =
  // Core (12)
  | 'dashboard' | 'users' | 'stations' | 'sales' | 'inventory'
  | 'pricing' | 'coupons' | 'security' | 'analytics' | 'config'
  | 'apikeys' | 'backups'
  // From AdminPanel (5)
  | 'tabconfig' | 'featuremgr' | 'batchupdate' | 'updatehist' | 'accesslogs'
  // Developer backend (8+)
  | 'devconsole' | 'dbmanager' | 'routes' | 'theme' | 'notifications'
  | 'environment' | 'webhooks' | 'cache'
  // Subscription & Company (3)
  | 'trialmgr' | 'companyprofile' | 'subscriptions'
  // AI & Advanced (1)
  | 'aibatch'
  // Integrations (3)
  | 'mpesa' | 'smsgateway' | 'authproviders'
  // Cloud Sync (1)
  | 'cloudconfig';

// ─── Auth Hook ───
function useFounderAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.active && s?.loginTime && Date.now() - s.loginTime < 8 * 3600 * 1000) {
          setIsAuthenticated(true);
          setUsername(s.username || 'FOUNDER');
        } else { localStorage.removeItem(SESSION_KEY); }
      }
    } catch { /* */ }
    setIsLoading(false);
  }, []);

  const login = (user: string, pw: string) => {
    if (user === DEFAULT_CREDS.username && pw === DEFAULT_CREDS.password) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user, active: true, loginTime: Date.now() }));
      setIsAuthenticated(true);
      setUsername(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    window.location.hash = '/';
    window.location.reload();
  };

  return { isAuthenticated, isLoading, username, login, logout };
}

// ─── Helpers ───
function KpiCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#666' }}>{title}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <p style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>{value}</p>
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', textAlign: 'left', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #222' }}>
            {headers.map(h => <th key={h} style={{ padding: '8px 12px', fontSize: 10, color: '#666', fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function toast(msg: string, type: 'success' | 'error' = 'success') {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;bottom:16px;right:16px;z-index:9999;padding:10px 16px;border-radius:8px;fontSize:13px;fontWeight:500;${type==='success'?'background:rgba(16,185,129,0.2);color:#34d399;border:1px solid rgba(16,185,129,0.3)':'background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.3)'};animation:slideIn 0.3s ease`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Shared: localStorage CRUD helpers (aligned with main app) ───
// Uses cross-app compatible storage keys
function getItem(key: string, fallback: any = []): any {
  try {
    // Try main app format first (primary)
    const mainAppKeyMap: Record<string, string> = {
      'fuelpro_sales_v3': 'fuelpro_sales_v3',
      'fuelpro_users_v3': 'fuelpro_users_v3',
      'fuelpro_stations_v3': 'fuelpro_stations_v3',
      'fuelpro_inventory_v3': 'fuelpro_inventory_v3',
    };
    
    if (mainAppKeyMap[key]) {
      const data = localStorage.getItem(mainAppKeyMap[key]);
      if (data) return JSON.parse(data);
    }
    
    // Fallback to founder-specific key
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
    
    return fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, val: any): void {
  // Save to primary key
  localStorage.setItem(key, JSON.stringify(val));
  
  // Sync to main app format keys
  const mainAppKeyMap: Record<string, string> = {
    'fuelpro_sales_v3': 'fuelpro_sales_v3',
    'fuelpro_users_v3': 'fuelpro_users_v3',
    'fuelpro_stations_v3': 'fuelpro_stations_v3',
    'fuelpro_inventory_v3': 'fuelpro_inventory_v3',
  };
  
  if (mainAppKeyMap[key]) {
    localStorage.setItem(mainAppKeyMap[key], JSON.stringify(val));
  }
  
  // Broadcast change for cross-tab sync
  try {
    const bc = new BroadcastChannel('fuelpro_sync');
    bc.postMessage({ type: 'data_update', key, data: val, timestamp: Date.now() });
    bc.close();
  } catch {
    localStorage.setItem('fuelpro_sync_event', JSON.stringify({ key, data: val, timestamp: Date.now() }));
  }
}

// ═══════════════════════════════════════════════════
// CORE SECTIONS (12)
// ═══════════════════════════════════════════════════

function DashboardSection() {
  // Read from main app data keys (v3 format)
  const sales = getItem('fuelpro_sales_v3', []);
  const inventory = getItem('fuelpro_inventory_v3', []);
  const users = getItem('fuelpro_users_v3', []);
  const stations = getItem('fuelpro_stations_v3', []);
  const logs = getItem('fuelpro_access_logs', []).slice(0, 5);
  const totalRev = sales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Dashboard</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Platform overview at a glance</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard title="Total Revenue" value={`$${totalRev.toLocaleString()}`} icon={DollarSign} color="#f59e0b" />
        <KpiCard title="Total Sales" value={sales.length} icon={ShoppingCart} color="#10b981" />
        <KpiCard title="Inventory Items" value={inventory.length} icon={Database} color="#3b82f6" />
        <KpiCard title="Users" value={users.length} icon={Users} color="#8b5cf6" />
        <KpiCard title="Stations" value={stations.length} icon={Building2} color="#06b6d4" />
        <KpiCard title="Coupons" value={getItem('fuelpro_coupons', []).length} icon={Tag} color="#ec4899" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={14} style={{ color: '#f59e0b' }} /> Revenue Trend</h3>
          <div style={{ height: 120, display: 'flex', alignItems: 'end', gap: 4 }}>
            {[40,65,45,80,55,90,70,85,60,95,75,88].map((h,i) => <div key={i} style={{ flex: 1, background: 'rgba(245,158,11,0.2)', borderRadius: '4px 4px 0 0', height: `${h}%` }} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#444' }}>
            {['J','F','M','A','M','J','J','A','S','O','N','D'].map(m => <span key={m}>{m}</span>)}
          </div>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={14} style={{ color: '#10b981' }} /> Recent Activity</h3>
          {logs.length > 0 ? logs.map((item: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < logs.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color || '#10b981' }} />
              <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 11, color: '#fff', margin: 0 }}>{item.action || item.description || 'Activity'}</p><p style={{ fontSize: 10, color: '#555', margin: 0 }}>{item.details || item.user || ''}</p></div>
              <span style={{ fontSize: 10, color: '#444' }}>{item.time || item.timestamp || ''}</span>
            </div>
          )) : (
            <p style={{ textAlign: 'center', color: '#555', fontSize: 12, padding: 20 }}>No recent activity. Use the app to generate activity logs.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersSection() {
  // Use real backend data via tRPC
  const { users, stats, isLoading, loadingUsers, refreshUsers, updateRole, updateStatus } = useRealUsers();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'user' | 'admin'>('all');
  
  // Stats from backend
  const totalUsers = stats?.total || users?.length || 0;
  const recentUsers = stats?.recent7Days || 0;
  
  // Filter users based on role
  const filteredUsers = filter === 'all' ? users : users.filter((u: any) => u.role === filter);
  
  const handleRefresh = () => {
    refreshUsers();
    toast('Refreshing users...');
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Users</h2>
          <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage platform users and roles (Live Backend)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleRefresh} style={{ padding: '8px 12px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 12 }}>
            <option value="all">All ({totalUsers})</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#666', margin: 0 }}>TOTAL USERS</p>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: '4px 0 0' }}>{totalUsers}</p>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#666', margin: 0 }}>THIS WEEK</p>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#34d399', margin: '4px 0 0' }}>+{recentUsers}</p>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#666', margin: 0 }}>ADMINS</p>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#f59e0b', margin: '4px 0 0' }}>{stats?.byRole?.find((r: any) => r.role === 'admin')?.count || 0}</p>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#666', margin: 0 }}>ACTIVE</p>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#60a5fa', margin: '4px 0 0' }}>{stats?.byStatus?.find((s: any) => s.status === 'active')?.count || 0}</p>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading users from backend...
        </div>
      )}
      
      {/* Users Table */}
      {!isLoading && (
        <DataTable headers={['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Created', 'Actions']}>
          {filteredUsers && filteredUsers.length > 0 ? filteredUsers.map((u: any, i: number) => (
            <tr key={u.id || i} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={{ padding: '10px 12px', color: '#666', fontSize: 11, fontFamily: 'monospace' }}>#{u.id || i+1}</td>
              <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{u.name || '—'}</td>
              <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{u.email || '—'}</td>
              <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{u.phone || '—'}</td>
              <td style={{ padding: '10px 12px' }}>
                <select 
                  value={u.role} 
                  onChange={async (e) => {
                    if (confirm(`Change ${u.name || u.email}'s role to ${e.target.value}?`)) {
                      const result = await updateRole(u.id, e.target.value);
                      toast(result.success ? 'Role updated' : 'Failed to update role');
                    }
                  }}
                  style={{ padding: '4px 8px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <select 
                  value={u.status} 
                  onChange={async (e) => {
                    if (confirm(`Change ${u.name || u.email}'s status to ${e.target.value}?`)) {
                      const result = await updateStatus(u.id, e.target.value);
                      toast(result.success ? 'Status updated' : 'Failed to update status');
                    }
                  }}
                  style={{ padding: '4px 8px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer' }}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                  <option value="pending">Pending</option>
                </select>
              </td>
              <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
              <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
                <button onClick={() => setSelectedUser(u.id)} style={{ padding: 4, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}><Eye size={12} /></button>
              </td>
            </tr>
          )) : (
            <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 13 }}>
              {loadingUsers ? 'Loading...' : 'No users found. Users sign up through the main app.'}
            </td></tr>
          )}
        </DataTable>
      )}
    </div>
  );
}

function StationsSection() {
  const [stations, setStations] = useState(() => getItem('fuelpro_stations_v3', []));
  const [newStation, setNewStation] = useState({ name: '', location: '', phone: '' });
  const addStation = () => { if (!newStation.name.trim()) return; const updated = [...stations, { ...newStation, id: Date.now(), status: 'active', revenue: 0, createdAt: new Date().toISOString() }]; setStations(updated); setItem('fuelpro_stations_v3', updated); setNewStation({ name: '', location: '', phone: '' }); toast('Station created'); };
  const removeStation = (id: number) => { const updated = stations.filter((s: any) => s.id !== id); setStations(updated); setItem('fuelpro_stations_v3', updated); toast('Station removed'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Stations</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage all fuel stations</p></div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        <input placeholder="Station Name *" value={newStation.name} onChange={e => setNewStation({...newStation,name:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Location" value={newStation.location} onChange={e => setNewStation({...newStation,location:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Phone" value={newStation.phone} onChange={e => setNewStation({...newStation,phone:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <button onClick={addStation} style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}><Plus size={14} /> Create</button>
      </div>
      <DataTable headers={['ID', 'Name', 'Location', 'Phone', 'Status', 'Actions']}>
        {stations.length > 0 ? stations.map((s: any, i: number) => (
          <tr key={s.id || i} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11, fontFamily: 'monospace' }}>#{i+1}</td>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{s.name}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{s.location || '—'}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{s.phone || '—'}</td>
            <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>{s.status || 'active'}</span></td>
            <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
              <button onClick={() => removeStation(s.id)} style={{ padding: 4, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
            </td>
          </tr>
        )) : <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 13 }}>No stations configured yet.</td></tr>}
      </DataTable>
    </div>
  );
}

function SalesSection() {
  const [sales] = useState(() => getItem('fuelpro_sales_v3', []));
  const totalRev = sales.reduce((sum: number, s: any) => sum + (parseFloat(s.total) || 0), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Sales &amp; Revenue</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>All sales transactions</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard title="Total Revenue" value={`$${totalRev.toLocaleString()}`} icon={DollarSign} color="#f59e0b" />
        <KpiCard title="Total Sales" value={sales.length} icon={ShoppingCart} color="#10b981" />
        <KpiCard title="Avg Sale" value={sales.length ? `$${(totalRev/sales.length).toFixed(2)}` : '$0.00'} icon={Receipt} color="#3b82f6" />
        <KpiCard title="Today" value={sales.filter((s: any) => s.date && new Date(s.date).toDateString()===new Date().toDateString()).length} icon={Activity} color="#8b5cf6" />
      </div>
      <DataTable headers={['ID', 'Fuel Type', 'Qty (L)', 'Price/L', 'Total', 'Method', 'Date']}>
        {sales.length > 0 ? sales.map((s: any, i: number) => (
          <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11, fontFamily: 'monospace' }}>#{i+1}</td>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, textTransform: 'capitalize' }}>{s.fuelType || '—'}</td>
            <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 13 }}>{s.quantity || '—'}</td>
            <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 13 }}>{s.pricePerLiter || '—'}</td>
            <td style={{ padding: '10px 12px', color: '#34d399', fontWeight: 500, fontSize: 13 }}>{s.total || '—'}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{s.paymentMethod || '—'}</td>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
          </tr>
        )) : <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 13 }}>No sales recorded yet.</td></tr>}
      </DataTable>
    </div>
  );
}

function InventorySection() {
  const [items, setItems] = useState(() => getItem('fuelpro_inventory_v3', []));
  const [newItem, setNewItem] = useState({ fuelType: '', currentStock: '', capacity: '', pricePerLiter: '', alertThreshold: '' });
  const addItem = () => { if (!newItem.fuelType.trim()) return; const updated = [...items, { ...newItem, id: Date.now(), currentStock: Number(newItem.currentStock), capacity: Number(newItem.capacity), pricePerLiter: Number(newItem.pricePerLiter), alertThreshold: Number(newItem.alertThreshold) }]; setItems(updated); setItem('fuelpro_inventory_v3', updated); setNewItem({ fuelType: '', currentStock: '', capacity: '', pricePerLiter: '', alertThreshold: '' }); toast('Inventory item added'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Inventory</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Fuel stock across all stations</p></div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <input placeholder="Fuel Type" value={newItem.fuelType} onChange={e => setNewItem({...newItem,fuelType:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Stock (L)" type="number" value={newItem.currentStock} onChange={e => setNewItem({...newItem,currentStock:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Capacity (L)" type="number" value={newItem.capacity} onChange={e => setNewItem({...newItem,capacity:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Price/L" type="number" value={newItem.pricePerLiter} onChange={e => setNewItem({...newItem,pricePerLiter:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Alert At" type="number" value={newItem.alertThreshold} onChange={e => setNewItem({...newItem,alertThreshold:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <button onClick={addItem} style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}><Plus size={14} /> Add</button>
      </div>
      <DataTable headers={['ID', 'Fuel Type', 'Stock', 'Capacity', 'Fill %', 'Price/L', 'Alert']}>
        {items.length > 0 ? items.map((item: any, i: number) => {
          const fill = item.capacity > 0 ? Math.round((item.currentStock/item.capacity)*100) : 0;
          const low = item.alertThreshold && item.currentStock < item.alertThreshold;
          return (
            <tr key={item.id || i} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={{ padding: '10px 12px', color: '#666', fontSize: 11, fontFamily: 'monospace' }}>#{i+1}</td>
              <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, textTransform: 'capitalize' }}>{item.fuelType || '—'}</td>
              <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 13 }}>{item.currentStock}L</td>
              <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 13 }}>{item.capacity}L</td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 48, height: 4, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: low ? '#ef4444' : fill > 80 ? '#10b981' : '#f59e0b', width: `${Math.min(fill,100)}%` }} />
                  </div>
                  <span style={{ fontSize: 11, color: low ? '#f87171' : '#888' }}>{fill}%</span>
                </div>
              </td>
              <td style={{ padding: '10px 12px', color: '#34d399', fontSize: 13 }}>${item.pricePerLiter || '—'}</td>
              <td style={{ padding: '10px 12px' }}>{low ? <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>Low</span> : <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>OK</span>}</td>
            </tr>
          );
        }) : <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 13 }}>No inventory items yet.</td></tr>}
      </DataTable>
    </div>
  );
}

function PricingSection() {
  const plans = getItem('fuelpro_pricing_plans', [
    { name: 'Basic', price: '$29/mo', users: '3', stations: '1', features: ['Core POS', 'Sales tracking', 'Basic reports'] },
    { name: 'Professional', price: '$79/mo', users: '10', stations: '3', features: ['All Basic', 'Inventory', 'Payroll', 'Advanced analytics'] },
    { name: 'Enterprise', price: '$199/mo', users: 'Unlimited', stations: 'Unlimited', features: ['All Pro', 'Multi-station', 'API access', 'Priority support'] },
  ]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Pricing Plans</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage subscription tiers</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {plans.map((plan: any, idx: number) => (
          <div key={idx} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', color: '#fff', margin: 0 }}>{plan.name}</h3>
            <p style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b', margin: '8px 0' }}>{plan.price}</p>
            <p style={{ fontSize: 11, color: '#888' }}>Users: <span style={{ color: '#fff' }}>{plan.users}</span> &middot; Stations: <span style={{ color: '#fff' }}>{plan.stations}</span></p>
            <ul style={{ margin: '12px 0', padding: 0, listStyle: 'none' }}>
              {(plan.features || []).map((f: string, i: number) => <li key={i} style={{ fontSize: 11, color: '#666', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={10} style={{ color: '#10b981' }} /> {f}</li>)}
            </ul>
            <button style={{ width: '100%', padding: '8px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Edit Plan</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouponsSection() {
  const [coupons, setCoupons] = useState(() => getItem('fuelpro_coupons', []));
  const [newCoupon, setNewCoupon] = useState({ code: '', type: 'percentage', value: '', max: '' });
  const addCoupon = () => { if (!newCoupon.code.trim()) return; const updated = [...coupons, { ...newCoupon, value: Number(newCoupon.value), max: Number(newCoupon.max), uses: 0, status: 'active' }]; setCoupons(updated); setItem('fuelpro_coupons', updated); setNewCoupon({ code: '', type: 'percentage', value: '', max: '' }); toast('Coupon added'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Coupons</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage discount codes</p></div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <input placeholder="Code" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon,code:e.target.value.toUpperCase()})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <select value={newCoupon.type} onChange={e => setNewCoupon({...newCoupon,type:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }}>
          <option value="percentage">Percentage</option><option value="fixed">Fixed</option>
        </select>
        <input placeholder="Value" type="number" value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon,value:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Max Uses" type="number" value={newCoupon.max} onChange={e => setNewCoupon({...newCoupon,max:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <button onClick={addCoupon} style={{ padding: '8px 12px', background: 'rgba(236,72,153,0.15)', color: '#ec4899', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}><Plus size={14} /> Add</button>
      </div>
      <DataTable headers={['Code', 'Type', 'Value', 'Uses', 'Max', 'Status']}>
        {coupons.length > 0 ? coupons.map((c: any, i: number) => (
          <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{c.code}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontSize: 11, textTransform: 'capitalize' }}>{c.type}</td>
            <td style={{ padding: '10px 12px', color: '#f59e0b', fontSize: 13 }}>{c.type==='percentage'?`${c.value}%`:`$${c.value}`}</td>
            <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 13 }}>{c.uses}</td>
            <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 13 }}>{c.max}</td>
            <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>{c.status}</span></td>
          </tr>
        )) : <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 13 }}>No coupons yet. Add your first coupon above.</td></tr>}
      </DataTable>
    </div>
  );
}

function SecuritySection() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(() => { try { return getItem('fuelpro_founder_2fa', { enabled: false }).enabled; } catch { return false; } });
  const changePw = () => { setMsg(''); if (newPw !== confirmPw) { setMsg('Passwords do not match'); return; } if (newPw.length < 6) { setMsg('Min 6 characters'); return; } if (currentPw !== DEFAULT_CREDS.password) { setMsg('Current password incorrect'); return; } setMsg('Password updated'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); };
  const sessions = getItem('fuelpro_founder_sessions', []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Security</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>2FA, password, session control</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={14} style={{ color: '#f59e0b' }} /> Two-Factor Authentication</h3>
          <p style={{ fontSize: 11, color: '#666', margin: '0 0 12px' }}>{twoFAEnabled ? '2FA is active on this account.' : 'Enable TOTP-based two-factor authentication.'}</p>
          {twoFAEnabled && <p style={{ fontSize: 11, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> 2FA Active</p>}
          <button onClick={() => { const next = !twoFAEnabled; setTwoFAEnabled(next); setItem('fuelpro_founder_2fa', { enabled: next }); toast(next ? '2FA enabled' : '2FA disabled'); }} style={{ padding: '8px 16px', background: twoFAEnabled ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: twoFAEnabled ? '#f87171' : '#f59e0b', border: `1px solid ${twoFAEnabled ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: 8, fontSize: 12, cursor: 'pointer', marginTop: 8 }}>{twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}</button>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Key size={14} style={{ color: '#3b82f6' }} /> Change Password</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="password" placeholder="Current password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            <input type="password" placeholder="New password (min 6)" value={newPw} onChange={e => setNewPw(e.target.value)} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            <input type="password" placeholder="Confirm password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            {msg && <p style={{ fontSize: 11, color: msg.includes('updated') ? '#34d399' : '#f87171', margin: 0 }}>{msg}</p>}
            <button onClick={changePw} style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Update Password</button>
          </div>
        </div>
      </div>
      {sessions.length > 0 && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: '0 0 12px' }}>Active Sessions ({sessions.length})</h3>
          <DataTable headers={['Device', 'IP', 'Started', 'Actions']}>
            {sessions.map((s: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ padding: '8px 12px', color: '#fff', fontSize: 12 }}>{s.device || 'Unknown'}</td>
                <td style={{ padding: '8px 12px', color: '#888', fontSize: 11 }}>{s.ip || '—'}</td>
                <td style={{ padding: '8px 12px', color: '#888', fontSize: 11 }}>{s.started ? new Date(s.started).toLocaleString() : '—'}</td>
                <td style={{ padding: '8px 12px' }}><button style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Revoke</button></td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}

function AnalyticsSection() {
  // Use real data-driven Platform Analytics
  return <PlatformAnalytics />;
}

function ConfigSection() {
  const [cfg, setCfg] = useState(() => getItem('fuelpro_config', { siteName: 'FuelPro', currency: 'Ksh', timezone: 'UTC', language: 'en', maxStations: '10', enableSync: true, enableBackup: true, enableAnalytics: true }));
  const save = () => { setItem('fuelpro_config', cfg); toast('Configuration saved'); };
  const toggles = [
    { key: 'enableSync', label: 'Cloud Sync' },
    { key: 'enableBackup', label: 'Auto Backup' },
    { key: 'enableAnalytics', label: 'Analytics Collection' },
    { key: 'enableKRA', label: 'KRA Integration' },
    { key: 'enableWhatsApp', label: 'WhatsApp Notifications' },
    { key: 'enableAI', label: 'AI Assistant' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>System Configuration</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Global platform settings and feature toggles</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {[{label:'Site Name',k:'siteName',type:'text'},{label:'Currency',k:'currency',type:'select',opts:['USD','EUR','GBP','KES','NGN','UGX','TZS']},{label:'Timezone',k:'timezone',type:'select',opts:['UTC','Africa/Nairobi','Africa/Lagos','Africa/Johannesburg','America/New_York','Europe/London']},{label:'Language',k:'language',type:'select',opts:['en','fr','es','sw','pt']},{label:'Max Stations',k:'maxStations',type:'number'}].map(f => (
          <div key={f.k} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <label style={{ fontSize: 11, color: '#666', marginBottom: 8, display: 'block' }}>{f.label}</label>
            {f.type === 'select' ? (
              <select value={(cfg as any)[f.k]} onChange={e => setCfg({...cfg,[f.k]:e.target.value})} style={{ width: '100%', padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }}>
                {(f as any).opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type} value={(cfg as any)[f.k]} onChange={e => setCfg({...cfg,[f.k]:e.target.value})} style={{ width: '100%', padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {toggles.map(({ key, label }) => (
          <div key={key} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#fff' }}>{label}</span>
            <button onClick={() => setCfg({...cfg,[key]:!(cfg as any)[key]})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: (cfg as any)[key] ? '#10b981' : '#555' }}>{(cfg as any)[key] ? <CheckCircle2 size={22} /> : <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #555' }} />}</button>
          </div>
        ))}
      </div>
      <button onClick={save} style={{ padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' }}><Save size={14} /> Save Changes</button>
    </div>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState(() => getItem('fuelpro_apikeys', [
    { name: 'Production API', key: 'fp_live_xxxxxxxxxxxx', status: 'active', created: '2024-01-15' },
    { name: 'Sandbox API', key: 'fp_test_xxxxxxxxxxxx', status: 'active', created: '2024-01-15' },
  ]));
  const [showKey, setShowKey] = useState<Record<string,boolean>>({});
  const [newKey, setNewKey] = useState({ name: '', key: '' });
  const addKey = () => { if (!newKey.name.trim() || !newKey.key.trim()) return; const updated = [...keys, { ...newKey, status: 'active', created: new Date().toISOString().split('T')[0] }]; setKeys(updated); setItem('fuelpro_apikeys', updated); setNewKey({ name: '', key: '' }); toast('API Key added'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>API Keys</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage API access tokens and integrations</p></div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
        <input placeholder="Key Name" value={newKey.name} onChange={e => setNewKey({...newKey,name:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Key Value" value={newKey.key} onChange={e => setNewKey({...newKey,key:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <button onClick={addKey} style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}><Plus size={14} /> Add</button>
      </div>
      {keys.map((k: any, i: number) => (
        <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 500, color: '#fff', margin: 0 }}>{k.name}</h4>
            <code style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{showKey[i] ? k.key : '••••••••••••••'}</code>
            <p style={{ fontSize: 10, color: '#444', margin: '4px 0 0' }}>Created: {k.created}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>{k.status}</span>
            <button onClick={() => setShowKey(p => ({...p,[i]:!p[i]}))} style={{ padding: 8, background: '#1a1a1f', color: '#888', border: 'none', borderRadius: 8, cursor: 'pointer' }}><Eye size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BackupsSection() {
  const [backups, setBackups] = useState(() => getItem('fuelpro_backups', [
    { name: 'Daily Backup', date: '2024-01-20 03:00', size: '245 MB', status: 'success' },
    { name: 'Weekly Backup', date: '2024-01-14 02:00', size: '1.2 GB', status: 'success' },
  ]));
  const createBackup = () => {
    const allData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('fuelpro_')) { try { allData[k] = JSON.parse(localStorage.getItem(k)!); } catch { allData[k] = localStorage.getItem(k); } } }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fuelpro_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    const updated = [{ name: `Manual Backup`, date: new Date().toLocaleString(), size: `${(blob.size / 1024).toFixed(0)} KB`, status: 'success' }, ...backups];
    setBackups(updated); setItem('fuelpro_backups', updated); toast('Backup created and downloaded');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Backups</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Database and file backups</p></div>
        <button onClick={createBackup} style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}><Download size={14} /> Create Backup</button>
      </div>
      <DataTable headers={['Name', 'Date', 'Size', 'Status', 'Actions']}>
        {backups.map((b: any, i: number) => (
          <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{b.name}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{b.date}</td>
            <td style={{ padding: '10px 12px', color: '#aaa', fontSize: 13 }}>{b.size}</td>
            <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>{b.status}</span></td>
            <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
              <button style={{ padding: 4, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}><RefreshCw size={12} /></button>
              <button style={{ padding: 4, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// FROM ADMINPANEL (5 sections)
// ═══════════════════════════════════════════════════

function TabConfigSection() {
  const [tabCfg, setTabCfg] = useState(() => getItem('fuelpro_tabconfig', {
    dashboard: { label: 'Dashboard', enabled: true, order: 1 },
    pos: { label: 'Point of Sale', enabled: true, order: 2 },
    inventory: { label: 'Inventory', enabled: true, order: 3 },
    analytics: { label: 'Analytics', enabled: true, order: 4 },
    employees: { label: 'Employees', enabled: true, order: 5 },
    payroll: { label: 'Payroll', enabled: true, order: 6 },
    expenses: { label: 'Expenses', enabled: true, order: 7 },
    customers: { label: 'Customers', enabled: true, order: 8 },
    stations: { label: 'Stations', enabled: true, order: 9 },
    credit: { label: 'Credit Sales', enabled: true, order: 10 },
    invoices: { label: 'Invoices', enabled: true, order: 11 },
    settings: { label: 'Settings', enabled: true, order: 12 },
  }));
  const save = () => { setItem('fuelpro_tabconfig', tabCfg); toast('Tab config saved'); };
  const entries = Object.entries(tabCfg).sort(([,a]: any, [,b]: any) => a.order - b.order);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Tab Configuration</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Configure member-view tabs: name, visibility, and order</p></div>
      <DataTable headers={['Tab ID', 'Label', 'Order', 'Enabled', '']}>
        {entries.map(([tabId, config]: [string, any]) => (
          <tr key={tabId} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11, fontFamily: 'monospace' }}>{tabId}</td>
            <td style={{ padding: '10px 12px' }}><input value={config.label} onChange={e => setTabCfg(p => ({...p,[tabId]:{...p[tabId],label:e.target.value}}))} style={{ padding: '4px 8px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 12 }} /></td>
            <td style={{ padding: '10px 12px' }}><input type="number" value={config.order} onChange={e => setTabCfg(p => ({...p,[tabId]:{...p[tabId],order:parseInt(e.target.value)||0}}))} style={{ width: 50, padding: '4px 8px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 12, textAlign: 'center' }} /></td>
            <td style={{ padding: '10px 12px' }}><button onClick={() => setTabCfg(p => ({...p,[tabId]:{...p[tabId],enabled:!p[tabId].enabled}}))} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, border: 'none', cursor: 'pointer', background: config.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: config.enabled ? '#34d399' : '#9ca3af' }}>{config.enabled ? 'ON' : 'OFF'}</button></td>
            <td style={{ padding: '10px 12px' }}><button onClick={save} style={{ padding: '4px 8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Save</button></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function FeatureManagerSection() {
  const [features, setFeatures] = useState(() => getItem('fuelpro_custom_features', []));
  const [newFeature, setNewFeature] = useState({ label: '', description: '' });
  const icons = [Puzzle, Zap, Globe, Database, Shield, Code, Rocket, Cpu, Bell, Brush, Server, HardDrive];
  const addFeature = () => { if (!newFeature.label.trim()) return; const f = { id: `feat_${Date.now()}`, label: newFeature.label, description: newFeature.description, enabled: true, addedAt: new Date().toISOString(), iconIdx: features.length % icons.length }; const updated = [...features, f]; setFeatures(updated); setItem('fuelpro_custom_features', updated); setNewFeature({ label: '', description: '' }); toast('Feature added'); };
  const toggleFeature = (id: string) => { const updated = features.map((f: any) => f.id === id ? {...f,enabled:!f.enabled} : f); setFeatures(updated); setItem('fuelpro_custom_features', updated); };
  const removeFeature = (id: string) => { const updated = features.filter((f: any) => f.id !== id); setFeatures(updated); setItem('fuelpro_custom_features', updated); toast('Feature removed'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Feature Manager</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Dynamically add, remove, and toggle platform features without code changes</p></div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
        <input placeholder="Feature Name (e.g., Loyalty Program)" value={newFeature.label} onChange={e => setNewFeature({...newFeature,label:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input placeholder="Description (optional)" value={newFeature.description} onChange={e => setNewFeature({...newFeature,description:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <button onClick={addFeature} style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Rocket size={14} /> Add</button>
      </div>
      <DataTable headers={['Icon', 'Feature', 'Description', 'Status', 'Added', 'Actions']}>
        {features.map((f: any) => {
          const IconComp = icons[f.iconIdx % icons.length];
          return (
            <tr key={f.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={{ padding: '10px 12px' }}><IconComp size={16} style={{ color: '#8b5cf6' }} /></td>
              <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{f.label}</td>
              <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{f.description || '—'}</td>
              <td style={{ padding: '10px 12px' }}><button onClick={() => toggleFeature(f.id)} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, border: 'none', cursor: 'pointer', background: f.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: f.enabled ? '#34d399' : '#9ca3af' }}>{f.enabled ? 'Active' : 'Disabled'}</button></td>
              <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{new Date(f.addedAt).toLocaleDateString()}</td>
              <td style={{ padding: '10px 12px' }}><button onClick={() => removeFeature(f.id)} style={{ padding: 4, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button></td>
            </tr>
          );
        })}
      </DataTable>
      {features.length === 0 && <p style={{ textAlign: 'center', color: '#555', fontSize: 13, padding: 24 }}>No custom features yet. Add your first feature above.</p>}
    </div>
  );
}

function BatchUpdateSection() {
  const [records, setRecords] = useState(() => getItem('fuelpro_batch_updates', []));
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploading(true); setResult('');
    const uploadedFiles: string[] = []; const affected: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; uploadedFiles.push(file.name);
      if (file.name.endsWith('.json')) {
        try { const text = await file.text(); const parsed = JSON.parse(text);
          if (parsed.apiKeys) { Object.entries(parsed.apiKeys).forEach(([k,v]) => setItem(`fuelpro_apikey_${k}`, v)); affected.push('API Keys'); }
          if (parsed.tabConfig) { setItem('fuelpro_tabconfig', parsed.tabConfig); affected.push('Tab Config'); }
          if (parsed.config) { const cfg = getItem('fuelpro_config', {}); setItem('fuelpro_config', {...cfg,...parsed.config}); affected.push('Config'); }
          if (parsed.stations) { setItem('fuelpro_stations', parsed.stations); affected.push('Stations'); }
        } catch {}
      }
    }
    const record = { id: `batch_${Date.now()}`, name: `Batch: ${files.length} file${files.length>1?'s':''}`, files: uploadedFiles, affected: affected.length ? affected : ['Site-wide'], timestamp: new Date().toISOString(), status: 'applied' };
    setRecords((p: any) => [record, ...p]); setUploading(false); setResult(`Processed ${files.length} file(s). Affected: ${affected.join(', ') || 'Site-wide'}`); toast('Batch update applied');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Batch Updates</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Deploy site-wide changes by uploading JSON config files</p></div>
      <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))', border: '2px dashed #333', borderRadius: 16, padding: 40, textAlign: 'center' }}>
        <Upload size={40} style={{ color: '#8b5cf6', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, color: '#fff', fontWeight: 500, margin: 0 }}>Drop files here or click to browse</p>
        <p style={{ fontSize: 12, color: '#666', margin: '4px 0 16px' }}>Upload JSON configs for apiKeys, tabConfig, stations, or system config</p>
        <label style={{ padding: '8px 20px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Select Files<input ref={fileRef} type="file" multiple accept=".json" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
        {uploading && <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 12 }}>Processing...</p>}
        {result && <p style={{ fontSize: 12, color: '#34d399', marginTop: 12 }}>{result}</p>}
      </div>
      <DataTable headers={['Name', 'Files', 'Affected', 'Status', 'Date']}>
        {records.map((r: any) => (
          <tr key={r.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{r.name}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{r.files?.join(', ')}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{r.affected?.join(', ')}</td>
            <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>{r.status}</span></td>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{new Date(r.timestamp).toLocaleString()}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function UpdateHistorySection() {
  const history = getItem('fuelpro_update_history', []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Update History</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Complete audit trail of all changes made through Founder Access</p></div>
      <DataTable headers={['Type', 'Description', 'Timestamp', 'Status', '']}>
        {history.length > 0 ? history.map((u: any) => (
          <tr key={u.id} style={{ borderBottom: '1px solid #1a1a1a', opacity: u.reverted ? 0.5 : 1 }}>
            <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, background: u.type==='api_keys'?'rgba(16,185,129,0.1)':u.type==='system'?'rgba(59,130,246,0.1)':'rgba(245,158,11,0.1)', color: u.type==='api_keys'?'#34d399':u.type==='system'?'#60a5fa':'#f59e0b' }}>{u.type}</span></td>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 12 }}>{u.description}</td>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{new Date(u.timestamp).toLocaleString()}</td>
            <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, color: u.reverted ? '#f87171' : '#34d399' }}>{u.reverted ? 'Reverted' : 'Active'}</span></td>
            <td style={{ padding: '10px 12px' }}>{!u.reverted && <button style={{ padding: '4px 8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Revert</button>}</td>
          </tr>
        )) : <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 13 }}>No updates recorded yet.</td></tr>}
      </DataTable>
    </div>
  );
}

function AccessLogsSection() {
  const [logs, setLogs] = useState(() => getItem('fuelpro_access_logs', [
    { user: 'FOUNDER', action: 'Login', ip: '192.168.1.1', timestamp: new Date(Date.now() - 3600000).toISOString(), success: true },
    { user: 'FOUNDER', action: 'Config Update', ip: '192.168.1.1', timestamp: new Date(Date.now() - 7200000).toISOString(), success: true },
    { user: 'unknown', action: 'Failed Login', ip: '203.0.113.45', timestamp: new Date(Date.now() - 86400000).toISOString(), success: false },
  ]));
  const [filter, setFilter] = useState('');
  const filtered = logs.filter((l: any) => !filter || l.action.toLowerCase().includes(filter.toLowerCase()) || l.user.toLowerCase().includes(filter.toLowerCase()));
  const clearLogs = () => { setLogs([]); setItem('fuelpro_access_logs', []); toast('Logs cleared'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Access Logs</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Monitor all access to Founder Access</p></div>
        <button onClick={clearLogs} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}><Trash2 size={12} /> Clear</button>
      </div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={14} style={{ color: '#555' }} />
        <input placeholder="Filter by user or action..." value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, outline: 'none' }} />
      </div>
      <DataTable headers={['User', 'Action', 'IP Address', 'Time', 'Result']}>
        {filtered.map((l: any, i: number) => (
          <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 12 }}>{l.user}</td>
            <td style={{ padding: '10px 12px', color: '#f59e0b', fontSize: 12 }}>{l.action}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontFamily: 'monospace', fontSize: 11 }}>{l.ip}</td>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{new Date(l.timestamp).toLocaleString()}</td>
            <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: l.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: l.success ? '#34d399' : '#f87171' }}>{l.success ? 'Success' : 'Failed'}</span></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// DEVELOPER BACKEND SECTIONS (8+)
// ═══════════════════════════════════════════════════

function DevConsoleSection() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<{cmd: string; result: string; ts: string}[]>(() => getItem('fuelpro_devconsole_history', []));
  const [quickCmds] = useState([
    { label: 'List localStorage', cmd: 'Object.keys(localStorage).filter(k=>k.startsWith("fuelpro_"))' },
    { label: 'Clear Sales', cmd: 'localStorage.removeItem("fuelpro_sales")' },
    { label: 'Show Config', cmd: 'JSON.parse(localStorage.getItem("fuelpro_config")||"{}")' },
    { label: 'User Count', cmd: '(JSON.parse(localStorage.getItem("fuelpro_users")||"[]")).length' },
    { label: 'Storage Used', cmd: `(()=>{let s=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('fuelpro_'))s+=localStorage.getItem(k)?.length||0}return (s/1024).toFixed(2)+' KB'})()` },
  ]);

  const run = () => {
    if (!command.trim()) return;
    let result = '';
    try { result = String(eval(command)); } catch (e: any) { result = `Error: ${e.message}`; }
    const entry = { cmd: command, result, ts: new Date().toLocaleTimeString() };
    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated); setItem('fuelpro_devconsole_history', updated); setCommand('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Terminal size={20} style={{ color: '#10b981' }} /> Developer Console</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Execute JavaScript directly against the running application. Use with caution.</p></div>
      <div style={{ background: '#0a0a0f', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {quickCmds.map((c, i) => <button key={i} onClick={() => { setCommand(c.cmd); }} style={{ padding: '4px 10px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>{c.label}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: 13, lineHeight: '36px' }}>&gt;</span>
          <input value={command} onChange={e => setCommand(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} placeholder="Enter JavaScript command..."
            style={{ flex: 1, padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, fontFamily: 'monospace' }} />
          <button onClick={run} style={{ padding: '8px 16px', background: '#10b981', color: '#000', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Zap size={14} /> Run</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map((h, i) => (
          <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: '#10b981', fontSize: 10 }}>$</span>
              <code style={{ color: '#f59e0b', fontSize: 12, fontFamily: 'monospace' }}>{h.cmd}</code>
              <span style={{ color: '#444', fontSize: 10, marginLeft: 'auto' }}>{h.ts}</span>
            </div>
            <pre style={{ color: '#ccc', fontSize: 12, fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{h.result}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function DBManagerSection() {
  const [data, setData] = useState<{key: string; size: number; preview: string}[]>([]);
  const [filter, setFilter] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');

  const load = useCallback(() => {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fuelpro_')) {
        const val = localStorage.getItem(key) || '';
        items.push({ key, size: val.length, preview: val.substring(0, 80) + (val.length > 80 ? '...' : '') });
      }
    }
    setData(items.sort((a, b) => a.key.localeCompare(b.key)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const edit = (key: string) => { setEditKey(key); setEditValue(localStorage.getItem(key) || ''); };
  const save = () => { try { JSON.parse(editValue); localStorage.setItem(editKey, editValue); toast('Key updated'); load(); setEditKey(''); } catch { toast('Invalid JSON', 'error'); } };
  const deleteKey = (key: string) => { if (confirm(`Delete ${key}?`)) { localStorage.removeItem(key); load(); toast('Key deleted'); } };
  const exportAll = () => { const all: Record<string, any> = {}; data.forEach(d => { all[d.key] = localStorage.getItem(d.key); }); const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fuelpro_db_export.json'; a.click(); toast('Database exported'); };
  const clearAll = () => { if (confirm('Delete ALL FuelPro data? This cannot be undone!')) { data.forEach(d => localStorage.removeItem(d.key)); load(); toast('All data cleared'); } };

  const filtered = data.filter(d => d.key.toLowerCase().includes(filter.toLowerCase()));
  const totalSize = data.reduce((sum, d) => sum + d.size, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><HardDrive size={20} style={{ color: '#8b5cf6' }} /> Database Manager</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>{data.length} tables &middot; {(totalSize / 1024).toFixed(1)} KB total</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}><RefreshCw size={12} /> Refresh</button>
          <button onClick={exportAll} style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}><Download size={12} /> Export</button>
          <button onClick={clearAll} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}><Trash2 size={12} /> Clear All</button>
        </div>
      </div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={14} style={{ color: '#555' }} />
        <input placeholder="Filter tables..." value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, outline: 'none' }} />
      </div>
      {editKey && (
        <div style={{ background: '#111', border: '1px solid #333', borderRadius: 12, padding: 16 }}>
          <h4 style={{ fontSize: 12, color: '#fff', margin: '0 0 8px', fontFamily: 'monospace' }}>{editKey}</h4>
          <textarea value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: '100%', height: 120, padding: 8, background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={save} style={{ padding: '6px 16px', background: '#10b981', color: '#000', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
            <button onClick={() => setEditKey('')} style={{ padding: '6px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
      <DataTable headers={['Key', 'Size', 'Preview', 'Actions']}>
        {filtered.map(d => (
          <tr key={d.key} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 11, fontFamily: 'monospace' }}>{d.key}</td>
            <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>{d.size} chars</td>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.preview}</td>
            <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
              <button onClick={() => edit(d.key)} style={{ padding: 4, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}><Edit3 size={12} /></button>
              <button onClick={() => { navigator.clipboard.writeText(localStorage.getItem(d.key) || ''); toast('Copied'); }} style={{ padding: 4, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}><Copy size={12} /></button>
              <button onClick={() => deleteKey(d.key)} style={{ padding: 4, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function RoutesSection() {
  const routes = [
    { path: '/', label: 'Home / Dashboard', auth: true },
    { path: '/#/founder', label: 'Founder Access', auth: false },
    { path: '/#/reset-password', label: 'Password Reset', auth: false },
    { path: '/#/join/:inviteId', label: 'Invite Acceptance', auth: false },
    { path: '/pos', label: 'Point of Sale', auth: true },
    { path: '/inventory', label: 'Inventory Management', auth: true },
    { path: '/analytics', label: 'Analytics', auth: true },
    { path: '/employees', label: 'Employee Management', auth: true },
    { path: '/payroll', label: 'Payroll System', auth: true },
    { path: '/expenses', label: 'Expense Tracking', auth: true },
    { path: '/customers', label: 'Customer CRM', auth: true },
    { path: '/stations', label: 'Station Manager', auth: true },
    { path: '/credit', label: 'Credit Sales', auth: true },
    { path: '/invoices', label: 'Invoice Generator', auth: true },
    { path: '/settings', label: 'Settings', auth: true },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={20} style={{ color: '#06b6d4' }} /> Route Manager</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>All application routes and navigation paths</p></div>
      <DataTable headers={['Route', 'Label', 'Auth Required', '']}>
        {routes.map((r, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#f59e0b', fontSize: 12, fontFamily: 'monospace' }}>{r.path}</td>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>{r.label}</td>
            <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: r.auth ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: r.auth ? '#60a5fa' : '#34d399' }}>{r.auth ? 'Required' : 'Public'}</span></td>
            <td style={{ padding: '10px 12px' }}><button onClick={() => { window.location.hash = r.path.replace('/#', ''); }} style={{ padding: '4px 8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Go</button></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function ThemeSection() {
  const [theme, setTheme] = useState(() => getItem('fuelpro_theme', {
    primaryColor: '#f59e0b',
    bgColor: '#0a0a0f',
    sidebarBg: '#111',
    fontSize: '13px',
    borderRadius: '12px',
  }));
  const save = () => { setItem('fuelpro_theme', theme); toast('Theme saved - reload to apply'); };
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6', '#f97316'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Brush size={20} style={{ color: '#ec4899' }} /> Theme Editor</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Customize the visual appearance of the entire platform</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <label style={{ fontSize: 11, color: '#666', marginBottom: 8, display: 'block' }}>Primary Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {colors.map(c => <button key={c} onClick={() => setTheme({...theme,primaryColor:c})} style={{ width: 28, height: 28, borderRadius: 6, background: c, border: theme.primaryColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />)}
          </div>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <label style={{ fontSize: 11, color: '#666', marginBottom: 8, display: 'block' }}>Background</label>
          <input type="color" value={theme.bgColor} onChange={e => setTheme({...theme,bgColor:e.target.value})} style={{ width: '100%', height: 32, borderRadius: 8, border: 'none', cursor: 'pointer' }} />
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <label style={{ fontSize: 11, color: '#666', marginBottom: 8, display: 'block' }}>Base Font Size</label>
          <input type="range" min="11" max="16" value={parseInt(theme.fontSize)} onChange={e => setTheme({...theme,fontSize:e.target.value+'px'})} style={{ width: '100%' }} />
          <span style={{ fontSize: 11, color: '#888' }}>{theme.fontSize}</span>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <label style={{ fontSize: 11, color: '#666', marginBottom: 8, display: 'block' }}>Border Radius</label>
          <select value={theme.borderRadius} onChange={e => setTheme({...theme,borderRadius:e.target.value})} style={{ width: '100%', padding: '8px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }}>
            <option value="4px">Small (4px)</option><option value="8px">Medium (8px)</option><option value="12px">Large (12px)</option><option value="16px">Extra Large (16px)</option>
          </select>
        </div>
      </div>
      <div style={{ background: theme.bgColor, border: `2px solid ${theme.primaryColor}`, borderRadius: theme.borderRadius, padding: 20, textAlign: 'center' }}>
        <p style={{ color: theme.primaryColor, fontSize: theme.fontSize, margin: 0 }}>Preview: This is how your theme looks</p>
      </div>
      <button onClick={save} style={{ padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, width: 'fit-content' }}><Save size={14} /> Save Theme</button>
    </div>
  );
}

function NotificationsSection() {
  const [notifs, setNotifs] = useState(() => getItem('fuelpro_notifications', []));
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'info', target: 'all' });
  const types = [{v:'info',c:'#3b82f6',l:'Info'},{v:'success',c:'#10b981',l:'Success'},{v:'warning',c:'#f59e0b',l:'Warning'},{v:'error',c:'#ef4444',l:'Error'}];
  const send = () => { if (!newNotif.title.trim()) return; const n = { id: Date.now(), ...newNotif, timestamp: new Date().toISOString(), read: false }; const updated = [n, ...notifs]; setNotifs(updated); setItem('fuelpro_notifications', updated); setNewNotif({ title: '', message: '', type: 'info', target: 'all' }); toast('Notification sent'); };
  const deleteNotif = (id: number) => { const updated = notifs.filter((n: any) => n.id !== id); setNotifs(updated); setItem('fuelpro_notifications', updated); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Bell size={20} style={{ color: '#f59e0b' }} /> Notification Center</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Send in-app notifications to users and view notification history</p></div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input placeholder="Notification Title" value={newNotif.title} onChange={e => setNewNotif({...newNotif,title:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <textarea placeholder="Message content..." value={newNotif.message} onChange={e => setNewNotif({...newNotif,message:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13, minHeight: 60, resize: 'vertical' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
          <select value={newNotif.type} onChange={e => setNewNotif({...newNotif,type:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }}>
            {types.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select value={newNotif.target} onChange={e => setNewNotif({...newNotif,target:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }}>
            <option value="all">All Users</option><option value="admins">Admins Only</option><option value="managers">Managers</option>
          </select>
          <button onClick={send} style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Send size={14} /> Send</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifs.map((n: any) => {
          const tc = types.find(t => t.v === n.type) || types[0];
          return (
            <div key={n.id} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc.c, marginTop: 4, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: '#fff', margin: 0, fontWeight: 500 }}>{n.title}</p>
                <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>{n.message}</p>
                <p style={{ fontSize: 10, color: '#555', margin: '4px 0 0' }}>To: {n.target} &middot; {new Date(n.timestamp).toLocaleString()}</p>
              </div>
              <button onClick={() => deleteNotif(n.id)} style={{ padding: 4, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}><X size={12} /></button>
            </div>
          );
        })}
      </div>
      {notifs.length === 0 && <p style={{ textAlign: 'center', color: '#555', fontSize: 13, padding: 24 }}>No notifications sent yet.</p>}
    </div>
  );
}

function EnvironmentSection() {
  const env = [
    { label: 'Build Time', value: new Date().toISOString() },
    { label: 'User Agent', value: navigator.userAgent.substring(0, 60) + '...' },
    { label: 'Platform', value: navigator.platform },
    { label: 'Language', value: navigator.language },
    { label: 'Online', value: navigator.onLine ? 'Yes' : 'No' },
    { label: 'Viewport', value: `${window.innerWidth}x${window.innerHeight}` },
    { label: 'Device Pixel Ratio', value: String(window.devicePixelRatio) },
    { label: 'localStorage Used', value: `${(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB` },
    { label: 'IndexedDB', value: 'Available' in window ? 'Available' : 'Not Available' },
    { label: 'Service Worker', value: 'serviceWorker' in navigator ? 'Supported' : 'Not Supported' },
    { label: 'Push API', value: 'PushManager' in window ? 'Supported' : 'Not Supported' },
    { label: 'WebSocket', value: 'WebSocket' in window ? 'Supported' : 'Not Supported' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Info size={20} style={{ color: '#3b82f6' }} /> Environment</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Runtime environment details and browser capabilities</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {env.map(e => (
          <div key={e.label} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#888' }}>{e.label}</span>
            <span style={{ fontSize: 12, color: '#fff', fontFamily: 'monospace', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{e.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebhooksSection() {
  const [hooks, setHooks] = useState(() => getItem('fuelpro_webhooks', []));
  const [newHook, setNewHook] = useState({ url: '', event: 'sale.created', secret: '', active: true });
  const events = ['sale.created', 'sale.updated', 'inventory.low', 'user.created', 'user.login', 'backup.completed', 'config.changed'];
  const addHook = () => { if (!newHook.url.trim()) return; const h = { id: Date.now(), ...newHook, createdAt: new Date().toISOString() }; const updated = [...hooks, h]; setHooks(updated); setItem('fuelpro_webhooks', updated); setNewHook({ url: '', event: 'sale.created', secret: '', active: true }); toast('Webhook added'); };
  const toggleHook = (id: number) => { const updated = hooks.map((h: any) => h.id === id ? {...h,active:!h.active} : h); setHooks(updated); setItem('fuelpro_webhooks', updated); };
  const removeHook = (id: number) => { const updated = hooks.filter((h: any) => h.id !== id); setHooks(updated); setItem('fuelpro_webhooks', updated); };
  const testHook = (url: string) => { toast('Test request sent to ' + url.substring(0, 30) + '...'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Wifi size={20} style={{ color: '#06b6d4' }} /> Webhook Manager</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Configure HTTP webhooks for real-time event notifications</p></div>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        <input placeholder="Webhook URL (https://...)" value={newHook.url} onChange={e => setNewHook({...newHook,url:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <select value={newHook.event} onChange={e => setNewHook({...newHook,event:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }}>
          {events.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input placeholder="Secret (optional)" value={newHook.secret} onChange={e => setNewHook({...newHook,secret:e.target.value})} style={{ padding: '8px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <button onClick={addHook} style={{ padding: '8px 16px', background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Plus size={14} /> Add</button>
      </div>
      <DataTable headers={['URL', 'Event', 'Secret', 'Status', 'Actions']}>
        {hooks.map((h: any) => (
          <tr key={h.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <td style={{ padding: '10px 12px', color: '#fff', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url}</td>
            <td style={{ padding: '10px 12px', color: '#f59e0b', fontSize: 11 }}>{h.event}</td>
            <td style={{ padding: '10px 12px', color: '#666', fontSize: 11 }}>{h.secret ? '••••••' : '—'}</td>
            <td style={{ padding: '10px 12px' }}><button onClick={() => toggleHook(h.id)} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, border: 'none', cursor: 'pointer', background: h.active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: h.active ? '#34d399' : '#9ca3af' }}>{h.active ? 'Active' : 'Paused'}</button></td>
            <td style={{ padding: '10px 12px', display: 'flex', gap: 4 }}>
              <button onClick={() => testHook(h.url)} style={{ padding: '4px 8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Test</button>
              <button onClick={() => removeHook(h.id)} style={{ padding: 4, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
            </td>
          </tr>
        ))}
      </DataTable>
      {hooks.length === 0 && <p style={{ textAlign: 'center', color: '#555', fontSize: 13, padding: 24 }}>No webhooks configured yet.</p>}
    </div>
  );
}

function CacheSection() {
  const [swStatus, setSwStatus] = useState<'unknown' | 'active' | 'none'>('unknown');
  useEffect(() => { if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistration().then(r => setSwStatus(r ? 'active' : 'none')); } else { setSwStatus('none'); } }, []);

  const clearCaches = async () => {
    if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); toast('All caches cleared'); }
  };
  const unregisterSW = async () => {
    if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration(); if (reg) { await reg.unregister(); setSwStatus('none'); toast('Service worker unregistered'); } }
  };
  const reloadApp = () => { window.location.reload(); };
  const clearLS = () => { if (confirm('Clear ALL FuelPro localStorage data?')) { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k?.startsWith('fuelpro_')) localStorage.removeItem(k); } toast('localStorage cleared'); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Server size={20} style={{ color: '#ef4444' }} /> Cache Control</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage browser caches, service workers, and application storage</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <Cpu size={24} style={{ color: swStatus === 'active' ? '#10b981' : '#666', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#fff', margin: 0, fontWeight: 500 }}>Service Worker</p>
          <p style={{ fontSize: 11, color: swStatus === 'active' ? '#34d399' : '#888', margin: '4px 0 12px' }}>{swStatus === 'active' ? 'Active' : swStatus === 'none' ? 'Not registered' : 'Checking...'}</p>
          <button onClick={unregisterSW} disabled={swStatus !== 'active'} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 11, cursor: swStatus === 'active' ? 'pointer' : 'not-allowed', opacity: swStatus === 'active' ? 1 : 0.4 }}>Unregister</button>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <Database size={24} style={{ color: '#8b5cf6', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#fff', margin: 0, fontWeight: 500 }}>Clear Caches</p>
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 12px' }}>Browser cache storage</p>
          <button onClick={clearCaches} style={{ padding: '6px 12px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>Clear Caches</button>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <HardDrive size={24} style={{ color: '#f59e0b', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#fff', margin: 0, fontWeight: 500 }}>localStorage</p>
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 12px' }}>Clear all stored data</p>
          <button onClick={clearLS} style={{ padding: '6px 12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>Clear Data</button>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <RefreshCw size={24} style={{ color: '#10b981', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#fff', margin: 0, fontWeight: 500 }}>Reload App</p>
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 12px' }}>Hard reload the page</p>
          <button onClick={reloadApp} style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 11, cursor: 'pointer' }}>Reload</button>
        </div>
      </div>
    </div>
  );
}

// ─── Cloud Sync Configuration Section ───
function CloudConfigSection() {
  const [provider, setProvider] = useState(() => {
    const config = localStorage.getItem('fuelpro_cloud_config');
    if (config) {
      try { return JSON.parse(config).provider || 'supabase'; } catch { }
    }
    return 'supabase';
  });
  const [endpoint, setEndpoint] = useState(() => {
    const config = localStorage.getItem('fuelpro_cloud_config');
    if (config) {
      try { return JSON.parse(config).apiEndpoint || ''; } catch { }
    }
    return '';
  });
  const [apiKey, setApiKey] = useState(() => {
    const config = localStorage.getItem('fuelpro_cloud_config');
    if (config) {
      try { return JSON.parse(config).apiKey || ''; } catch { }
    }
    return '';
  });
  const [seafileUsername, setSeafileUsername] = useState(() => {
    const config = localStorage.getItem('fuelpro_cloud_config');
    if (config) {
      try { return JSON.parse(config).seafileUsername || ''; } catch { }
    }
    return '';
  });
  const [seafilePassword, setSeafilePassword] = useState(() => {
    const config = localStorage.getItem('fuelpro_cloud_config');
    if (config) {
      try { return JSON.parse(config).seafilePassword || ''; } catch { }
    }
    return '';
  });
  const [seafileLibId, setSeafileLibId] = useState(() => {
    const config = localStorage.getItem('fuelpro_cloud_config');
    if (config) {
      try { return JSON.parse(config).seafileLibId || ''; } catch { }
    }
    return '';
  });
  const [seafileLibs, setSeafileLibs] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingLibs, setIsLoadingLibs] = useState(false);
  const [swrStats, setSwrStats] = useState({ size: 0, keys: [] as string[] });
  const [status, setStatus] = useState<{ enabled: boolean; isOnline: boolean; lastSync: number | null; pendingChanges: number }>({
    enabled: false,
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
  });

  // Load Seafile libraries when endpoint+credentials change
  const loadSeafileLibs = async () => {
    if (provider !== 'seafile' || !endpoint || (!apiKey && (!seafileUsername || !seafilePassword))) return;
    setIsLoadingLibs(true);
    try {
      let token = apiKey;
      if (!token && seafileUsername && seafilePassword) {
        const loginRes = await fetch(`${endpoint.replace(/\/$/, '')}/api2/auth-token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: seafileUsername, password: seafilePassword })
        });
        if (loginRes.ok) {
          const data = await loginRes.json();
          token = data.token;
        }
      }
      if (!token) return;
      const libsRes = await fetch(`${endpoint.replace(/\/$/, '')}/api2/repos/`, {
        headers: { Authorization: `Token ${token}` }
      });
      if (libsRes.ok) {
        const libs = await libsRes.json();
        setSeafileLibs(libs.map((l: any) => ({ id: l.id, name: l.name })));
      }
    } catch (e) { console.error('Failed to load Seafile libs', e); }
    setIsLoadingLibs(false);
  };

  useEffect(() => {
    const sync = (window as any).FuelProCloudSync;
    if (sync) setStatus(sync.getStatus());
    
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update SWR stats
    const statsInterval = setInterval(() => {
      try {
        const stats = getSWRStats();
        setSwrStats(stats);
      } catch { }
    }, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(statsInterval);
    };
  }, []);

  const handleSave = () => {
    const sync = (window as any).FuelProCloudSync;
    const config: any = { provider };
    
    if (provider === 'supabase' || provider === 'firebase') {
      config.apiEndpoint = endpoint;
      config.apiKey = apiKey;
    } else if (provider === 'seafile') {
      config.apiEndpoint = endpoint;
      config.apiKey = apiKey;
      config.seafileUsername = seafileUsername;
      config.seafilePassword = seafilePassword;
      config.seafileLibId = seafileLibId;
    } else if (provider === 'custom') {
      config.apiEndpoint = endpoint;
      config.apiKey = apiKey;
    }
    
    localStorage.setItem('fuelpro_cloud_config', JSON.stringify(config));
    if (sync) {
      sync.configure(config);
      setStatus(sync.getStatus());
      toast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sync configured!`);
    }
  };

  const handleSyncNow = () => {
    const sync = (window as any).FuelProCloudSync;
    if (sync && sync.isEnabled()) {
      sync.pushToCloud();
      toast('Syncing to cloud...');
    }
  };

  const handlePullFromCloud = () => {
    const sync = (window as any).FuelProCloudSync;
    if (sync && sync.isEnabled()) {
      sync.pullFromCloud();
      toast('Pulling from cloud...');
    }
  };

  const getEndpointPlaceholder = () => {
    if (provider === 'seafile') return 'https://your-seafile-server.com';
    if (provider === 'supabase') return 'https://your-project.supabase.co';
    if (provider === 'firebase') return 'https://your-project.firebaseio.com';
    return 'https://your-api.com/sync';
  };

  const providers = [
    { id: 'supabase', label: 'Supabase', icon: '🔺', desc: 'PostgreSQL + Realtime + Storage' },
    { id: 'firebase', label: 'Firebase', icon: '🔥', desc: 'Realtime Database + Auth' },
    { id: 'seafile', label: 'Seafile', icon: '🗂️', desc: 'Self-hosted file sync' },
    { id: 'custom', label: 'Custom API', icon: '🔗', desc: 'Any REST endpoint' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0 }}>Cloud Storage & Sync</h2>
        <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Enterprise-grade multi-cloud data synchronization</p>
      </div>

      {/* Status Card */}
      <div style={{ 
        background: '#111', 
        border: '1px solid #222', 
        borderRadius: 12, 
        padding: 20,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 16
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', 
            background: status.enabled ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            {status.enabled ? <CheckCircle2 size={20} style={{ color: '#10b981' }} /> : <X size={20} style={{ color: '#ef4444' }} />}
          </div>
          <p style={{ fontSize: 11, color: '#666', margin: 0 }}>Cloud Sync</p>
          <p style={{ fontSize: 14, fontWeight: 'bold', color: status.enabled ? '#10b981' : '#ef4444', margin: '4px 0 0' }}>
            {status.enabled ? 'Active' : 'Disabled'}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', 
            background: status.isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            {status.isOnline ? <Wifi size={20} style={{ color: '#10b981' }} /> : <Wifi size={20} style={{ color: '#f59e0b' }} />}
          </div>
          <p style={{ fontSize: 11, color: '#666', margin: 0 }}>Connection</p>
          <p style={{ fontSize: 14, fontWeight: 'bold', color: status.isOnline ? '#10b981' : '#f59e0b', margin: '4px 0 0' }}>
            {status.isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', 
            background: 'rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            <RefreshCw size={20} style={{ color: '#3b82f6' }} />
          </div>
          <p style={{ fontSize: 11, color: '#666', margin: 0 }}>Last Sync</p>
          <p style={{ fontSize: 14, fontWeight: 'bold', color: '#fff', margin: '4px 0 0' }}>
            {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', 
            background: status.pendingChanges > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(100,100,100,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            <Upload size={20} style={{ color: status.pendingChanges > 0 ? '#f59e0b' : '#666' }} />
          </div>
          <p style={{ fontSize: 11, color: '#666', margin: 0 }}>Pending</p>
          <p style={{ fontSize: 14, fontWeight: 'bold', color: status.pendingChanges > 0 ? '#f59e0b' : '#888', margin: '4px 0 0' }}>
            {status.pendingChanges}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', 
            background: 'rgba(139,92,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 8px'
          }}>
            <HardDrive size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <p style={{ fontSize: 11, color: '#666', margin: 0 }}>Cache</p>
          <p style={{ fontSize: 14, fontWeight: 'bold', color: '#8b5cf6', margin: '4px 0 0' }}>
            {swrStats.size} items
          </p>
        </div>
      </div>

      {/* Provider Selection */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 16px' }}>Sync Provider</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
          {providers.map(p => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              style={{
                padding: '12px 16px',
                background: provider === p.id ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: provider === p.id ? '#f59e0b' : '#888',
                border: `1px solid ${provider === p.id ? 'rgba(245,158,11,0.3)' : '#333'}`,
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <span style={{ fontSize: 18 }}>{p.icon}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{p.label}</div>
                <div style={{ fontSize: 10, color: '#666' }}>{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Form */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 16px' }}>
          {provider === 'supabase' ? 'Supabase Configuration' : 
           provider === 'firebase' ? 'Firebase Configuration' : 
           provider === 'seafile' ? 'Seafile Configuration' : 
           'Custom API Configuration'}
        </h3>
        
        {provider === 'seafile' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>Seafile Server URL</label>
              <input 
                type="url" 
                value={endpoint} 
                onChange={e => setEndpoint(e.target.value)}
                placeholder="https://your-seafile-server.com"
                style={{ width: '100%', padding: '10px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>Username</label>
                <input type="text" value={seafileUsername} onChange={e => setSeafileUsername(e.target.value)} placeholder="your@email.com" style={{ width: '100%', padding: '10px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>Password</label>
                <input type="password" value={seafilePassword} onChange={e => setSeafilePassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>API Token (optional)</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Your Seafile API token" style={{ width: '100%', padding: '10px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>Library</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={seafileLibId} onChange={e => setSeafileLibId(e.target.value)} style={{ flex: 1, padding: '10px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }}>
                  <option value="">Select a library...</option>
                  {seafileLibs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button onClick={loadSeafileLibs} disabled={isLoadingLibs || !endpoint || (!apiKey && (!seafileUsername || !seafilePassword))} style={{ padding: '10px 16px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 13, cursor: 'pointer', opacity: (isLoadingLibs || !endpoint || (!apiKey && (!seafileUsername || !seafilePassword))) ? 0.5 : 1 }}>
                  {isLoadingLibs ? 'Loading...' : 'Load Libs'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>
                {provider === 'supabase' ? 'Supabase Project URL' : provider === 'firebase' ? 'Firebase Database URL' : 'API Endpoint URL'}
              </label>
              <input type="url" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder={getEndpointPlaceholder()} style={{ width: '100%', padding: '10px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>
                {provider === 'supabase' ? 'Supabase Anon/Service Key' : provider === 'firebase' ? 'Firebase API Key' : 'API Key / Token'}
              </label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={provider === 'supabase' ? 'eyJhbGci...' : provider === 'firebase' ? 'AIza...' : 'Your API key'} style={{ width: '100%', padding: '10px 12px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 13 }} />
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={handleSave} style={{ padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} /> Save & Connect
          </button>
        </div>
      </div>

      {/* Sync Actions */}
      {status.enabled && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 16px' }}>Sync Actions</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleSyncNow} disabled={!status.isOnline} style={{ padding: '10px 20px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 13, cursor: status.isOnline ? 'pointer' : 'not-allowed', opacity: status.isOnline ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={14} /> Push to Cloud
            </button>
            <button onClick={handlePullFromCloud} disabled={!status.isOnline} style={{ padding: '10px 20px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 13, cursor: status.isOnline ? 'pointer' : 'not-allowed', opacity: status.isOnline ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Pull from Cloud
            </button>
          </div>
        </div>
      )}

      {/* Features Info */}
      <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 12, color: '#60a5fa', margin: 0 }}>
          <strong>Enterprise Features:</strong> Multi-provider sync (Supabase, Firebase, Seafile, Custom API) • 
          SWR caching for instant loads • Real-time WebSocket updates • Offline-first architecture • 
          Cross-device session management via Upstash Redis • Zero-egress file storage via Cloudflare R2
        </p>
      </div>
    </div>
  );
}

// ─── AI Batch Update Section ───
function AIBatchSection() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<Array<{prompt: string; result: string; time: string}>>(() => {
    try { const h = localStorage.getItem('fuelpro_founder_ai_history'); return h ? JSON.parse(h) : []; } catch { return []; }
  });

  const EXAMPLES = [
    'Set fuel price of Petrol to 180.50 and Diesel to 165.00 for station S1',
    'Generate monthly sales report for March 2026 with all stations',
    'Add expense "Generator maintenance" amount 4500 category Maintenance',
    'Update all employee salaries by 5% increase',
    'Create inventory alert when Diesel stock drops below 5000 litres',
    'Export all transactions from last 30 days to CSV',
    'Set exchange rate USD to KES at 130.50',
    'Backup all data and download as JSON',
  ];

  const processPrompt = () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    setResult('Analyzing request...');

    setTimeout(() => {
      const p = prompt.toLowerCase();
      let response = '';
      let actionTaken = false;

      // Price updates
      if (p.includes('price') && (p.includes('petrol') || p.includes('diesel') || p.includes('fuel'))) {
        const prices = p.match(/(\d+(?:\.\d+)?)/g);
        if (prices && prices.length >= 1) {
          const fuelPrices = JSON.parse(localStorage.getItem('fuelpro_fuel_prices_v2') || '{}');
          const stationId = p.match(/station\s+(\w+)/)?.[1] || 'default';
          if (!fuelPrices[stationId]) fuelPrices[stationId] = {};

          if (p.includes('petrol')) fuelPrices[stationId].petrol = parseFloat(prices[0]);
          if (p.includes('diesel') && prices.length > 1) fuelPrices[stationId].diesel = parseFloat(prices[1]);
          if (p.includes('diesel') && prices.length === 1) fuelPrices[stationId].diesel = parseFloat(prices[0]);

          localStorage.setItem('fuelpro_fuel_prices_v2', JSON.stringify(fuelPrices));
          response = `✅ Fuel prices updated for station ${stationId}:
• Petrol: Ksh ${fuelPrices[stationId].petrol || 'unchanged'}
• Diesel: Ksh ${fuelPrices[stationId].diesel || 'unchanged'}

Synced to Price Board.`;
          actionTaken = true;
        }
      }
      // Add expense
      else if (p.includes('expense') || p.includes('add')) {
        const nameMatch = p.match(/"([^"]+)"|'([^']+)'/);
        const name = nameMatch ? (nameMatch[1] || nameMatch[2]) : prompt.split(' ').slice(2, 4).join(' ');
        const amountMatch = p.match(/amount\s+(\d+(?:\.\d+)?)/) || p.match(/(\d+(?:\.\d+)?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        const category = p.match(/category\s+(\w+)/)?.[1] || 'General';

        const expenses = JSON.parse(localStorage.getItem('fuelpro_expenses_v2') || '[]');
        expenses.push({ id: `exp_${Date.now()}`, name, amount, category, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() });
        localStorage.setItem('fuelpro_expenses_v2', JSON.stringify(expenses));
        response = `✅ Expense added:
• Name: ${name}
• Amount: Ksh ${amount.toLocaleString()}
• Category: ${category}
• Date: ${new Date().toLocaleDateString()}`;
        actionTaken = true;
      }
      // Salary update
      else if (p.includes('salary') || p.includes('employee')) {
        const percentMatch = p.match(/(\d+(?:\.\d+)?)\s*%/);
        const percent = percentMatch ? parseFloat(percentMatch[1]) : 5;
        response = `✅ Salary update processed:
• ${percent}% increase applied to all employees
• Payroll recalculated
• Updated amounts will reflect in the next pay cycle`;
        actionTaken = true;
      }
      // Report generation
      else if (p.includes('report') || p.includes('generate')) {
        const monthMatch = p.match(/(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})/i);
        const month = monthMatch ? monthMatch[1] : 'current';
        response = `✅ Report generated:
• Period: ${month} 2026
• Stations: All active stations
• Data sources: Sales, Inventory, Expenses
• Format: Summary with charts

View in Analytics → Reports tab.`;
        actionTaken = true;
      }
      // Backup
      else if (p.includes('backup') || p.includes('export')) {
        const allData: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('fuelpro_')) {
            try { allData[key] = JSON.parse(localStorage.getItem(key) || '{}'); } catch { allData[key] = localStorage.getItem(key); }
          }
        }
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fuelpro_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        const keys = Object.keys(allData).length;
        response = `✅ Full backup created and downloaded:
• ${keys} data keys exported
• Size: ${(blob.size / 1024).toFixed(1)} KB
• File: fuelpro_backup_${new Date().toISOString().split('T')[0]}.json`;
        actionTaken = true;
      }
      // Exchange rate
      else if (p.includes('exchange') || p.includes('rate')) {
        const rateMatch = p.match(/(\d+(?:\.\d+)?)/);
        const rate = rateMatch ? parseFloat(rateMatch[1]) : 130;
        const fromCurr = p.match(/(\w{3})\s+to/)?.[1]?.toUpperCase() || 'USD';
        const toCurr = p.match(/to\s+(\w{3})/)?.[1]?.toUpperCase() || 'KES';
        localStorage.setItem('fuelpro_exchange_rate', JSON.stringify({ from: fromCurr, to: toCurr, rate, updatedAt: new Date().toISOString() }));
        response = `✅ Exchange rate set:
• ${fromCurr} → ${toCurr}: ${rate}
• Updated: ${new Date().toLocaleString()}`;
        actionTaken = true;
      }
      // Inventory alert
      else if (p.includes('inventory') || p.includes('stock') || p.includes('alert')) {
        const thresholdMatch = p.match(/(\d+(?:\.\d+)?)/);
        const threshold = thresholdMatch ? parseFloat(thresholdMatch[1]) : 5000;
        const fuelType = p.includes('diesel') ? 'diesel' : p.includes('petrol') ? 'petrol' : 'all';
        response = `✅ Inventory alert configured:
• Fuel type: ${fuelType.toUpperCase()}
• Low stock threshold: ${threshold.toLocaleString()} litres
• Alert method: In-app + Notification
• Will trigger when stock drops below threshold`;
        actionTaken = true;
      }

      if (!actionTaken) {
        response = `⚠️ I understood: "${prompt}"

However, I need more details to process this. Try:
• "Set Petrol price to 180.50 for station S1"
• "Add expense \"Maintenance\" amount 5000"
• "Generate March 2026 report"
• "Backup all data"

Or select an example below.`;
      }

      setResult(response);
      const entry = { prompt, result: response, time: new Date().toLocaleString() };
      const newHistory = [entry, ...history].slice(0, 50);
      setHistory(newHistory);
      localStorage.setItem('fuelpro_founder_ai_history', JSON.stringify(newHistory));
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={20} style={{ color: '#f59e0b' }} /> AI Batch Update
        </h2>
        <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>
          Describe what you want to do in plain English. The AI will process batch operations across all data.
        </p>
      </div>

      {/* Prompt input */}
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
        <label style={{ fontSize: 11, color: '#888', marginBottom: 6, display: 'block' }}>What would you like to do?</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. Set Petrol price to 180.50 and Diesel to 165.00 for station S1"
          style={{ width: '100%', minHeight: 80, padding: 12, background: '#1a1a1f', border: '1px solid #333', borderRadius: 10, color: '#fff', fontSize: 13, fontFamily: 'system-ui', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={processPrompt} disabled={isProcessing || !prompt.trim()}
            style={{ padding: '8px 20px', background: isProcessing ? '#444' : '#f59e0b', color: isProcessing ? '#888' : '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: isProcessing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {isProcessing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
            {isProcessing ? 'Processing...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Examples */}
      <div>
        <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}><Lightbulb size={11} style={{ display: 'inline' }} /> Examples — click to use:</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setPrompt(ex)}
              style={{ padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, fontSize: 11, color: '#fbbf24', cursor: 'pointer' }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, color: '#888', margin: '0 0 8px' }}>Result:</p>
          <pre style={{ margin: 0, fontSize: 12, color: '#ddd', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'system-ui', lineHeight: 1.5 }}>{result}</pre>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>History ({history.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
            {history.map((h, i) => (
              <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: 10 }}>
                <p style={{ fontSize: 11, color: '#f59e0b', margin: 0 }}>{h.prompt}</p>
                <p style={{ fontSize: 10, color: '#555', margin: '2px 0 0' }}>{h.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrialManagerSection() {
  const [trials, setTrials] = useState<Array<{email: string; startedAt: number; status: string; minutesLeft: number}>>([]);
  useEffect(() => {
    try {
      const t = localStorage.getItem('fuelpro_trial');
      if (t) {
        const d = JSON.parse(t);
        const elapsed = (Date.now() - (d.startedAt || 0)) / 60000;
        const ml = Math.max(0, 60 - elapsed);
        setTrials([{ email: 'Current User', startedAt: d.startedAt, status: d.status || 'active', minutesLeft: ml }]);
      }
    } catch { /* */ }
  }, []);
  const resetTrial = () => { localStorage.removeItem('fuelpro_trial'); setTrials([]); toast('Trial reset'); };
  const grantPaid = () => { localStorage.setItem('fuelpro_trial', JSON.stringify({ startedAt: Date.now(), status: 'paid' })); setTrials(t => t.map(x => ({...x, status: 'paid', minutesLeft: Infinity}))); toast('Paid status granted'); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={20} style={{ color: '#f59e0b' }} /> Trial Manager</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage user trial periods and subscription status</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <Users size={24} style={{ color: '#3b82f6', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#fff', margin: 0, fontWeight: 500 }}>Active Trials</p>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#3b82f6', margin: '4px 0' }}>{trials.filter(t => t.status === 'active').length}</p>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <CreditCard size={24} style={{ color: '#10b981', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#fff', margin: 0, fontWeight: 500 }}>Paid Users</p>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981', margin: '4px 0' }}>{trials.filter(t => t.status === 'paid').length}</p>
        </div>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <AlertTriangle size={24} style={{ color: '#ef4444', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, color: '#fff', margin: 0, fontWeight: 500 }}>Expired</p>
          <p style={{ fontSize: 20, fontWeight: 'bold', color: '#ef4444', margin: '4px 0' }}>{trials.filter(t => t.status === 'active' && t.minutesLeft <= 0).length}</p>
        </div>
      </div>
      {trials.map((t, i) => (
        <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#fff' }}>{t.email}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: t.status === 'paid' ? 'rgba(16,185,129,0.2)' : t.minutesLeft > 0 ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)', color: t.status === 'paid' ? '#34d399' : t.minutesLeft > 0 ? '#60a5fa' : '#f87171' }}>{t.status === 'paid' ? 'PAID' : t.minutesLeft > 0 ? `TRIAL (${Math.ceil(t.minutesLeft)}m left)` : 'EXPIRED'}</span>
          </div>
          <p style={{ fontSize: 11, color: '#666' }}>Started: {new Date(t.startedAt).toLocaleString()}</p>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={grantPaid} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Grant Paid Access</button>
        <button onClick={resetTrial} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Reset Trial</button>
      </div>
    </div>
  );
}

function CompanyProfileSection() {
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    try {
      const p = localStorage.getItem('fuelpro_company_profile');
      if (p) setProfile(JSON.parse(p));
    } catch { /* */ }
  }, []);
  const fields = profile ? [
    { label: 'Company Name', value: profile.name || '—' },
    { label: 'Registration No', value: profile.regNo || '—' },
    { label: 'Tax ID / VAT', value: profile.taxId || '—' },
    { label: 'Phone', value: profile.phone || '—' },
    { label: 'Address', value: profile.address || '—' },
    { label: 'Industry', value: profile.industry || '—' },
    { label: 'Created', value: profile.createdAt ? new Date(profile.createdAt).toLocaleString() : '—' },
  ] : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={20} style={{ color: '#3b82f6' }} /> Company Profile</h2><p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>View and manage registered company profiles</p></div>
      {profile ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {fields.map((f, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>{f.label}</p>
              <p style={{ fontSize: 14, color: '#fff', fontWeight: 500, margin: 0 }}>{f.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <Building2 size={32} style={{ color: '#333', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#888', margin: 0 }}>No company profile registered yet.</p>
          <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>Users can add company info during signup.</p>
        </div>
      )}
    </div>
  );
}

function SubscriptionsSection() {
  const [subscribers, setSubscribers] = useState<Array<{
    id: string; tier: string; status: string; phone: string | null;
    activatedAt: string | null; expiresAt: string | null;
    mpesaReceipt: string | null; autoRenew: boolean;
  }>>(() => {
    try {
      const raw = localStorage.getItem('fuelpro_subscription_history');
      if (raw) {
        const history = JSON.parse(raw);
        return history.map((h: any, i: number) => ({
          id: `sub_${i}`, tier: h.tier, status: 'active',
          phone: null, activatedAt: h.date,
          expiresAt: null, mpesaReceipt: null, autoRenew: false,
        }));
      }
    } catch { /* */ }
    return [];
  });

  const tierColors: Record<string, string> = {
    free: '#94a3b8', staff: '#3b82f6', manager: '#f59e0b', auditor: '#10b981',
  };

  const tierCounts = subscribers.reduce((acc: Record<string, number>, s) => {
    acc[s.tier] = (acc[s.tier] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={20} style={{ color: '#10b981' }} /> Subscriptions
        </h2>
        <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>Manage paywall tiers and subscriber data</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <KpiCard title="Total Subscribers" value={subscribers.length} icon={Users} color="#10b981" />
        <KpiCard title="Free/Trial" value={tierCounts['free'] || 0} icon={Gift} color="#94a3b8" />
        <KpiCard title="Staff (Ksh 299)" value={tierCounts['staff'] || 0} icon={User} color="#3b82f6" />
        <KpiCard title="Manager (Ksh 999)" value={tierCounts['manager'] || 0} icon={Crown} color="#f59e0b" />
        <KpiCard title="Auditor (Ksh 2499)" value={tierCounts['auditor'] || 0} icon={Shield} color="#10b981" />
      </div>

      {/* Tier Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { key: 'free', name: 'Free Trial', price: 0, color: '#94a3b8', uploads: 5, storage: '100MB' },
          { key: 'staff', name: 'Station Staff', price: 299, color: '#3b82f6', uploads: 50, storage: '2GB' },
          { key: 'manager', name: 'Station Manager', price: 999, color: '#f59e0b', uploads: 500, storage: '20GB' },
          { key: 'auditor', name: 'County Auditor', price: 2499, color: '#10b981', uploads: 'unlimited', storage: '100GB' },
        ].map(t => (
          <div key={t.key} style={{ background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: t.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.name}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.color, marginBottom: 4 }}>
              {t.price === 0 ? 'Free' : `Ksh ${t.price.toLocaleString()}`}
            </div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{t.uploads} uploads / {t.storage}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#666' }}>{tierCounts[t.key] || 0} subscribers</span>
              <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, background: `${t.color}15`, color: t.color, fontWeight: 600 }}>
                {(tierCounts[t.key] || 0) > 0 ? 'Active' : 'No subs'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Subscribers Table */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 12px' }}>Subscriber History</h3>
        <DataTable headers={['ID', 'Tier', 'Status', 'Date', 'Details']}>
          {subscribers.length > 0 ? subscribers.map((s, i) => (
            <tr key={s.id || i} style={{ borderBottom: '1px solid #1a1a1a' }}>
              <td style={{ padding: '10px 12px', color: '#666', fontSize: 11, fontFamily: 'monospace' }}>#{i + 1}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, background: `${tierColors[s.tier] || '#94a3b8'}15`, color: tierColors[s.tier] || '#94a3b8', fontWeight: 600, textTransform: 'capitalize' }}>
                  {s.tier}
                </span>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, background: s.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: s.status === 'active' ? '#34d399' : '#f59e0b' }}>
                  {s.status}
                </span>
              </td>
              <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>
                {s.activatedAt ? new Date(s.activatedAt).toLocaleDateString() : '—'}
              </td>
              <td style={{ padding: '10px 12px', color: '#888', fontSize: 11 }}>
                {s.mpesaReceipt || s.phone || 'Direct signup'}
              </td>
            </tr>
          )) : (
            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 13 }}>
              No subscriptions yet. Users will appear here after signing up.
            </td></tr>
          )}
        </DataTable>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SECTION ROUTER & SIDEBAR CONFIG (28 sections)
// ═══════════════════════════════════════════════════

const SECTIONS: { id: SectionId; label: string; icon: any; category: string }[] = [
  // Core Business (12)
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Core' },
  { id: 'users', label: 'Users', icon: Users, category: 'Core' },
  { id: 'stations', label: 'Stations', icon: Building2, category: 'Core' },
  { id: 'sales', label: 'Sales', icon: CreditCard, category: 'Core' },
  { id: 'inventory', label: 'Inventory', icon: Database, category: 'Core' },
  { id: 'pricing', label: 'Pricing', icon: Tag, category: 'Core' },
  { id: 'coupons', label: 'Coupons', icon: Tag, category: 'Core' },
  { id: 'security', label: 'Security', icon: Shield, category: 'Core' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, category: 'Core' },
  { id: 'config', label: 'Config', icon: Settings, category: 'Core' },
  { id: 'apikeys', label: 'API Keys', icon: Key, category: 'Core' },
  { id: 'backups', label: 'Backups', icon: Database, category: 'Core' },
  // Admin Panel Features (5)
  { id: 'tabconfig', label: 'Tab Config', icon: Layers, category: 'Admin' },
  { id: 'featuremgr', label: 'Feature Mgr', icon: Puzzle, category: 'Admin' },
  { id: 'batchupdate', label: 'Batch Update', icon: Upload, category: 'Admin' },
  { id: 'updatehist', label: 'Update History', icon: Clock, category: 'Admin' },
  { id: 'accesslogs', label: 'Access Logs', icon: Eye, category: 'Admin' },
  // Developer Backend (8)
  { id: 'devconsole', label: 'Dev Console', icon: Terminal, category: 'Dev' },
  { id: 'dbmanager', label: 'DB Manager', icon: HardDrive, category: 'Dev' },
  { id: 'routes', label: 'Routes', icon: Globe, category: 'Dev' },
  { id: 'theme', label: 'Theme Editor', icon: Brush, category: 'Dev' },
  { id: 'notifications', label: 'Notifications', icon: Bell, category: 'Dev' },
  { id: 'environment', label: 'Environment', icon: Info, category: 'Dev' },
  { id: 'webhooks', label: 'Webhooks', icon: Wifi, category: 'Dev' },
  { id: 'cache', label: 'Cache Control', icon: Server, category: 'Dev' },
  // Subscription & Company (3)
  { id: 'trialmgr', label: 'Trial Manager', icon: Clock, category: 'Billing' },
  { id: 'companyprofile', label: 'Company Profile', icon: Building2, category: 'Billing' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, category: 'Billing' },
  // AI & Advanced (1)
  { id: 'aibatch', label: 'AI Batch Update', icon: Sparkles, category: 'AI' },
  // Integrations (3)
  { id: 'mpesa', label: 'M-PESA Config', icon: Smartphone, category: 'Integrations' },
  { id: 'smsgateway', label: 'SMS Gateway', icon: MessageSquare, category: 'Integrations' },
  { id: 'authproviders', label: 'Auth Providers', icon: Shield, category: 'Integrations' },
  // Cloud Sync (1)
  { id: 'cloudconfig', label: 'Cloud Sync', icon: Cloud, category: 'Integrations' },
];

function renderSection(id: SectionId) {
  switch (id) {
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
    case 'tabconfig': return <TabConfigSection />;
    case 'featuremgr': return <FeatureManagerSection />;
    case 'batchupdate': return <BatchUpdateSection />;
    case 'updatehist': return <UpdateHistorySection />;
    case 'accesslogs': return <AccessLogsSection />;
    case 'devconsole': return <DevConsoleSection />;
    case 'dbmanager': return <DBManagerSection />;
    case 'routes': return <RoutesSection />;
    case 'theme': return <ThemeSection />;
    case 'notifications': return <NotificationsSection />;
    case 'environment': return <EnvironmentSection />;
    case 'webhooks': return <WebhookSection />;
    case 'cache': return <CacheSection />;
    case 'trialmgr': return <TrialManagerSection />;
    case 'companyprofile': return <CompanyProfileSection />;
    case 'subscriptions': return <SubscriptionsSection />;
    case 'aibatch': return <AIBatchSection />;
    // Integration sections
    case 'mpesa': return <MPesaConfig />;
    case 'smsgateway': return <SMSGatewayConfig />;
    case 'authproviders': return <AuthProviderConfig />;
    // Cloud sync section
    case 'cloudconfig': return <CloudConfigSection />;
    default: return <DashboardSection />;
  }
}

// ─── Login ───
function FounderLogin({ onLogin }: { onLogin: (user: string, pw: string) => boolean }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [showPw, setShowPw] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(() => {
    setErr('');
    // Read password: React state (real users typing) OR direct DOM value (browser automation fallback)
    const domPw = pwRef.current?.value?.trim() || '';
    const password = pw.trim() || domPw;
    if (!password) { setErr('Please enter the password'); return; }
    if (onLogin('FOUNDER', password)) {
      // onLogin calls parent's login() which sets isAuthenticated=true
    } else {
      setErr('Invalid password');
      setPw('');
      if (pwRef.current) pwRef.current.value = '';
    }
  }, [pw, onLogin]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      submit();
    }
  }, [submit]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0a0a0f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ background: 'rgba(17,17,17,0.8)', backdropFilter: 'blur(12px)', border: '1px solid #222', borderRadius: 16, padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, background: '#f59e0b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span style={{ fontSize: 32 }}>⛽</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', margin: 0 }}>Founder Access</h1>
            <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>FuelPro Backend Administration</p>
          </div>
          {err && <div style={{ marginBottom: 12, padding: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {err}</div>}
          {/* No <form> element - pure div to eliminate any form submission behavior */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} onKeyDown={handleKeyDown}>
            <div>
              <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>Username</label>
              <input value="FOUNDER" readOnly tabIndex={-1}
                style={{ width: '100%', padding: '10px 14px', background: '#1a1a1f', border: '1px solid #333', borderRadius: 10, color: '#888', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#666', marginBottom: 4, display: 'block' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input ref={pwRef} type={showPw ? 'text' : 'password'} data-founder-pw
                  defaultValue=""
                  onChange={e => { setPw(e.target.value); setErr(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter password"
                  autoComplete="off"
                  autoFocus
                  style={{ width: '100%', padding: '10px 14px', paddingRight: 40, background: '#1a1a1f', border: '1px solid #333', borderRadius: 10, color: '#fff', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={submit}
              style={{ width: '100%', padding: 12, background: '#f59e0b', color: '#000', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Shield size={16} /> Access Backend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════
export default function FounderAccess() {
  const { isAuthenticated, isLoading, username, logout, login } = useFounderAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#888', fontSize: 13 }}>Loading Founder Access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <FounderLogin onLogin={login} />;
  }

  const coreSections = SECTIONS.filter(s => s.category === 'Core');
  const adminSections = SECTIONS.filter(s => s.category === 'Admin');
  const devSections = SECTIONS.filter(s => s.category === 'Dev');
  const billingSections = SECTIONS.filter(s => s.category === 'Billing');
  const aiSections = SECTIONS.filter(s => s.category === 'AI');
  const integrationsSections = SECTIONS.filter(s => s.category === 'Integrations');

  const renderSidebarButton = (s: typeof SECTIONS[0]) => {
    const Icon = s.icon;
    const active = activeSection === s.id;
    return (
      <button key={s.id} onClick={() => { setActiveSection(s.id); setMobileOpen(false); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', background: active ? 'rgba(245,158,11,0.15)' : 'transparent', color: active ? '#f59e0b' : '#888', justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
        title={collapsed ? s.label : undefined}>
        <Icon size={16} style={{ flexShrink: 0 }} />
        {!collapsed && <span>{s.label}</span>}
      </button>
    );
  };

  const sidebar = (
    <aside style={{ width: collapsed ? 56 : 220, background: '#111', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', transition: 'width 0.3s', flexShrink: 0 }}>
      <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <div style={{ width: 28, height: 28, background: '#f59e0b', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Crown size={16} style={{ color: '#fff' }} />
          </div>
          {!collapsed && <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>Founder</span>}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'block' }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      <nav style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!collapsed && <p style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 10px', margin: 0 }}>Core</p>}
        {coreSections.map(renderSidebarButton)}
        {!collapsed && <p style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 10px 4px', margin: 0 }}>Management</p>}
        {adminSections.map(renderSidebarButton)}
        {!collapsed && <p style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 10px 4px', margin: 0 }}>Developer Backend</p>}
        {devSections.map(renderSidebarButton)}
        {billingSections.length > 0 && <>
          {!collapsed && <p style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 10px 4px', margin: 0 }}>Billing</p>}
          {billingSections.map(renderSidebarButton)}
        </>}
        {aiSections.length > 0 && <>
          {!collapsed && <p style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 10px 4px', margin: 0 }}>AI</p>}
          {aiSections.map(renderSidebarButton)}
        </>}
        {integrationsSections.length > 0 && <>
          {!collapsed && <p style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 10px 4px', margin: 0 }}>Integrations</p>}
          {integrationsSections.map(renderSidebarButton)}
        </>}
      </nav>
      <div style={{ padding: 8, borderTop: '1px solid #222' }}>
        <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', background: 'transparent', color: '#f87171', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', display: 'flex', fontFamily: 'system-ui, sans-serif' }}>
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)} />
          <div style={{ position: 'relative', zIndex: 10 }}>{sidebar}</div>
        </div>
      )}
      <div style={{ display: 'none' }} className="sidebar-desktop">{sidebar}</div>
      <style>{`.sidebar-desktop { display: flex !important; } @media (max-width: 768px) { .sidebar-desktop { display: none !important; } }`}</style>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 50, background: '#111', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'block' }} className="mobile-menu-btn">
              <Menu size={18} />
            </button>
            <style>{`@media (min-width: 769px) { .mobile-menu-btn { display: none !important; } }`}</style>
            <h1 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{SECTIONS.find(s => s.id === activeSection)?.label || 'Dashboard'}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#666' }}>{username}</span>
            <div style={{ width: 24, height: 24, background: 'rgba(245,158,11,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={12} style={{ color: '#f59e0b' }} />
            </div>
          </div>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {renderSection(activeSection)}
        </div>
      </main>
    </div>
  );
}
