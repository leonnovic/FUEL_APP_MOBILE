'use client';

import { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Building,
  DollarSign,
  Tag,
  Shield,
  ToggleLeft,
  LayoutGrid,
  Key,
  FileText,
  Terminal,
  CreditCard,
  Bot,
  Palette,
  Link,
  Database,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Edit,
  Ban,
  Trash,
  Eye,
  Crown,
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useAuthStore } from '@/store/auth-store';

// ─── Chart configs ──────────────────────────────────────────────────────────

const growthConfig: ChartConfig = {
  users: { label: 'Users', color: '#f59e0b' },
  active: { label: 'Active', color: '#22c55e' },
};

const stationDistConfig: ChartConfig = {
  value: { label: 'Stations' },
  nairobi: { label: 'Nairobi', color: '#f59e0b' },
  mombasa: { label: 'Mombasa', color: '#22c55e' },
  kisumu: { label: 'Kisumu', color: '#3b82f6' },
  nakuru: { label: 'Nakuru', color: '#a855f7' },
  other: { label: 'Other', color: '#64748b' },
};

// ─── Sidebar items ──────────────────────────────────────────────────────────

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'stations', label: 'Stations', icon: Building },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'pricing', label: 'Pricing', icon: Tag },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'features', label: 'Feature Manager', icon: ToggleLeft },
  { id: 'tab-config', label: 'Tab Config', icon: LayoutGrid },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'access-logs', label: 'Access Logs', icon: FileText },
  { id: 'dev-console', label: 'Dev Console', icon: Terminal },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'ai-batch', label: 'AI Batch Update', icon: Bot },
  { id: 'theme-editor', label: 'Theme Editor', icon: Palette },
  { id: 'webhooks', label: 'Webhooks', icon: Link },
  { id: 'backups', label: 'Backups', icon: Database },
  { id: 'cache', label: 'Cache Control', icon: Trash2 },
];

// ─── Mock data ──────────────────────────────────────────────────────────────

const mockUsers = [
  { id: '1', name: 'John Mwangi', email: 'john@fuelpro.ke', role: 'owner', station: 'Shell Westlands', status: 'active', lastLogin: '2025-01-15 09:30' },
  { id: '2', name: 'Sarah Akinyi', email: 'sarah@fuelpro.ke', role: 'manager', station: 'Total Uhuru Hwy', status: 'active', lastLogin: '2025-01-15 08:15' },
  { id: '3', name: 'Peter Kamau', email: 'peter@fuelpro.ke', role: 'staff', station: 'Shell Westlands', status: 'active', lastLogin: '2025-01-14 17:45' },
  { id: '4', name: 'Grace Wanjiku', email: 'grace@fuelpro.ke', role: 'auditor', station: 'KenolKobil Kilimani', status: 'active', lastLogin: '2025-01-13 12:00' },
  { id: '5', name: 'David Otieno', email: 'david@fuelpro.ke', role: 'manager', station: 'OilLibya Mombasa Rd', status: 'suspended', lastLogin: '2025-01-10 14:20' },
  { id: '6', name: 'Mary Njeri', email: 'mary@fuelpro.ke', role: 'staff', station: 'Gulf Energy Thika Rd', status: 'active', lastLogin: '2025-01-15 06:30' },
  { id: '7', name: 'James Kipchoge', email: 'james@fuelpro.ke', role: 'owner', station: 'Rubis Langata', status: 'active', lastLogin: '2025-01-14 10:00' },
  { id: '8', name: 'Alice Chebet', email: 'alice@fuelpro.ke', role: 'staff', station: 'Total Kiambu Rd', status: 'active', lastLogin: '2025-01-15 07:00' },
];

const mockStations = [
  { id: 'S1', name: 'Shell Westlands', location: 'Westlands, Nairobi', owner: 'John Mwangi', users: 5, status: 'active', created: '2024-03-15' },
  { id: 'S2', name: 'Total Energies Uhuru Highway', location: 'Uhuru Hwy, Nairobi', owner: 'Sarah Akinyi', users: 8, status: 'active', created: '2024-04-01' },
  { id: 'S3', name: 'KenolKobil Kilimani', location: 'Kilimani, Nairobi', owner: 'Grace Wanjiku', users: 4, status: 'active', created: '2024-05-20' },
  { id: 'S4', name: 'OilLibya Mombasa Road', location: 'Mombasa Rd, Nairobi', owner: 'David Otieno', users: 6, status: 'maintenance', created: '2024-06-10' },
  { id: 'S5', name: 'Gulf Energy Thika Road', location: 'Thika Rd, Nairobi', owner: 'Mary Njeri', users: 3, status: 'active', created: '2024-07-01' },
  { id: 'S6', name: 'Rubis Langata', location: 'Langata, Nairobi', owner: 'James Kipchoge', users: 7, status: 'active', created: '2024-08-15' },
];

const mockFeatures = [
  { id: 'f1', name: 'AI Assistant', description: 'AI-powered chatbot for station management and insights', enabled: true, stationId: 'all' },
  { id: 'f2', name: 'Loyalty Program', description: 'Customer loyalty points and rewards system', enabled: false, stationId: 'S1' },
  { id: 'f3', name: 'Advanced Analytics', description: 'Deep analytics with predictive models and trend analysis', enabled: true, stationId: 'all' },
  { id: 'f4', name: 'M-PESA Integration', description: 'Direct M-PESA Daraja API payment processing', enabled: true, stationId: 'all' },
  { id: 'f5', name: 'Multi-Station View', description: 'Dashboard overview across multiple stations', enabled: false, stationId: 'S2' },
];

const mockCommandHistory = [
  { id: '1', command: 'Set Petrol price to 180.50 for station S1', status: 'success', timestamp: '2025-01-15 10:30' },
  { id: '2', command: 'Add 5000 liters of Diesel to station S3', status: 'success', timestamp: '2025-01-15 10:15' },
  { id: '3', command: 'Deactivate user david@fuelpro.ke', status: 'error', timestamp: '2025-01-15 09:45' },
  { id: '4', command: 'Create shift for Peter Kamau at station S1', status: 'success', timestamp: '2025-01-14 16:00' },
];

const mockAccessLogs = [
  { id: '1', user: 'founder@fuelpro.ke', action: 'login', resource: 'Dashboard', ip: '192.168.1.100', timestamp: '2025-01-15 10:30:00' },
  { id: '2', user: 'founder@fuelpro.ke', action: 'read', resource: 'Users List', ip: '192.168.1.100', timestamp: '2025-01-15 10:31:15' },
  { id: '3', user: 'founder@fuelpro.ke', action: 'update', resource: 'Station S1 Pricing', ip: '192.168.1.100', timestamp: '2025-01-15 10:35:00' },
  { id: '4', user: 'founder@fuelpro.ke', action: 'delete', resource: 'User #5', ip: '192.168.1.100', timestamp: '2025-01-15 10:40:00' },
  { id: '5', user: 'founder@fuelpro.ke', action: 'export', resource: 'Sales Report', ip: '192.168.1.100', timestamp: '2025-01-15 11:00:00' },
  { id: '6', user: 'founder@fuelpro.ke', action: 'login', resource: 'Dashboard', ip: '10.0.0.5', timestamp: '2025-01-14 09:00:00' },
];

const mockSubscribers = [
  { id: '1', name: 'John Mwangi', email: 'john@fuelpro.ke', tier: 'Manager', status: 'active', renewalDate: '2025-02-15' },
  { id: '2', name: 'Sarah Akinyi', email: 'sarah@fuelpro.ke', tier: 'Staff', status: 'active', renewalDate: '2025-02-01' },
  { id: '3', name: 'Grace Wanjiku', email: 'grace@fuelpro.ke', tier: 'Auditor', status: 'active', renewalDate: '2025-03-20' },
  { id: '4', name: 'James Kipchoge', email: 'james@fuelpro.ke', tier: 'Manager', status: 'trialing', renewalDate: '2025-01-25' },
  { id: '5', name: 'Mary Njeri', email: 'mary@fuelpro.ke', tier: 'Free', status: 'active', renewalDate: '-' },
  { id: '6', name: 'Alice Chebet', email: 'alice@fuelpro.ke', tier: 'Staff', status: 'cancelled', renewalDate: '2025-01-10' },
];

const subscriptionTiers = [
  { name: 'Free', price: 'Ksh 0', features: ['1 Station', 'Basic Reports', '3 Users'] },
  { name: 'Staff', price: 'Ksh 299/mo', features: ['1 Station', 'All Reports', '5 Users', 'M-PESA'] },
  { name: 'Manager', price: 'Ksh 999/mo', features: ['3 Stations', 'Advanced Analytics', '15 Users', 'M-PESA', 'AI Assistant'] },
  { name: 'Auditor', price: 'Ksh 2,499/mo', features: ['Unlimited Stations', 'Full Analytics', 'Unlimited Users', 'M-PESA', 'AI', 'Audit Logs'] },
];

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const roleColors: Record<string, string> = {
  founder: 'bg-amber-500/20 text-amber-400',
  owner: 'bg-purple-500/20 text-purple-400',
  manager: 'bg-blue-500/20 text-blue-400',
  staff: 'bg-green-500/20 text-green-400',
  auditor: 'bg-cyan-500/20 text-cyan-400',
  guest: 'bg-slate-500/20 text-slate-400',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  suspended: 'bg-red-500/20 text-red-400',
  trialing: 'bg-amber-500/20 text-amber-400',
  cancelled: 'bg-slate-500/20 text-slate-400',
  maintenance: 'bg-orange-500/20 text-orange-400',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function FounderPanel() {
  const user = useAuthStore((s) => s.user);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [aiCommand, setAiCommand] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [featureStates, setFeatureStates] = useState(mockFeatures.map((f) => ({ ...f })));

  // Access control: only visible to founder
  const isFounder = user?.role === 'founder';

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return mockUsers;
    const q = userSearch.toLowerCase();
    return mockUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.station.toLowerCase().includes(q)
    );
  }, [userSearch]);

  // Growth chart data
  const growthData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toLocaleDateString('en-KE', { weekday: 'short' }),
        users: Math.round(120 + (6 - i) * 8 + Math.random() * 10),
        active: Math.round(80 + (6 - i) * 5 + Math.random() * 8),
      });
    }
    return days;
  }, []);

  // Station distribution data
  const stationDistData = useMemo(() => [
    { name: 'Nairobi', value: 45, fill: 'var(--color-nairobi)' },
    { name: 'Mombasa', value: 20, fill: 'var(--color-mombasa)' },
    { name: 'Kisumu', value: 15, fill: 'var(--color-kisumu)' },
    { name: 'Nakuru', value: 12, fill: 'var(--color-nakuru)' },
    { name: 'Other', value: 8, fill: 'var(--color-other)' },
  ], []);

  // Recent activity
  const recentActivity = useMemo(() => [
    { id: '1', text: 'New station registered: Rubis Langata', time: '2 min ago', type: 'info' as const },
    { id: '2', text: 'User david@fuelpro.ke suspended', time: '15 min ago', type: 'warning' as const },
    { id: '3', text: 'M-PESA payment of Ksh 45,000 received', time: '30 min ago', type: 'success' as const },
    { id: '4', text: 'System backup completed', time: '1 hr ago', type: 'info' as const },
    { id: '5', text: 'Price update: Petrol set to Ksh 195.50', time: '2 hrs ago', type: 'info' as const },
    { id: '6', text: 'New subscriber: Manager tier', time: '3 hrs ago', type: 'success' as const },
  ], []);

  if (!isFounder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="size-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-sm text-slate-400">This panel is only accessible to the platform founder.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleFeature = (featureId: string) => {
    setFeatureStates((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, enabled: !f.enabled } : f))
    );
  };

  // ─── Render Dashboard Tab ──────────────────────────────────────────────────

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Subscribers', value: '168', change: '+12%', up: true, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Active Trials', value: '23', change: '+5%', up: true, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Monthly Recurring Revenue', value: formatKsh(485000), change: '+18%', up: true, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Churn Rate', value: '3.2%', change: '-0.5%', up: false, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20' },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`size-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`size-5 ${kpi.color}`} />
                </div>
                <Badge className={`text-[10px] ${kpi.up ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {kpi.up ? <TrendingUp className="size-3 mr-0.5" /> : <TrendingDown className="size-3 mr-0.5" />}
                  {kpi.change}
                </Badge>
              </div>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User Growth Chart */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">User Growth (7 Days)</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Total vs active users</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={growthConfig} className="h-[200px] w-full">
              <LineChart data={growthData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="active" stroke="var(--color-active)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Station Distribution PieChart */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Station Distribution</CardTitle>
            <CardDescription className="text-slate-400 text-xs">By region across Kenya</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={stationDistConfig} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={stationDistData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  strokeWidth={2}
                  stroke="#1e293b"
                >
                  {stationDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {stationDistData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-[10px] text-slate-400">{d.name} ({d.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-amber-400" />
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white">
              <RefreshCw className="size-3 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
                <div className={`size-2 rounded-full shrink-0 ${a.type === 'success' ? 'bg-green-400' : a.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <span className="text-xs text-slate-300 flex-1">{a.text}</span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render Users Tab ──────────────────────────────────────────────────────

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search users by name, email, role, or station..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="pl-9 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
          />
        </div>
        <Badge className="bg-slate-700/50 text-slate-300">{filteredUsers.length} users</Badge>
      </div>

      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Role</TableHead>
                  <TableHead className="text-slate-400">Station</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Last Login</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="border-slate-700/30 hover:bg-slate-700/20">
                    <TableCell className="font-medium text-sm">{u.name}</TableCell>
                    <TableCell className="text-xs text-slate-300">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${roleColors[u.role] || 'bg-slate-500/20 text-slate-400'}`}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">{u.station}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[u.status] || 'bg-slate-500/20 text-slate-400'}`}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{u.lastLogin}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="size-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                          <Edit className="size-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="size-7 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                          <Ban className="size-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="size-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render Stations Tab ───────────────────────────────────────────────────

  const renderStations = () => (
    <div className="space-y-4">
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Location</TableHead>
                  <TableHead className="text-slate-400">Owner</TableHead>
                  <TableHead className="text-slate-400"># Users</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockStations.map((s) => (
                  <TableRow key={s.id} className="border-slate-700/30 hover:bg-slate-700/20">
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell className="text-xs text-slate-300">{s.location}</TableCell>
                    <TableCell className="text-xs text-slate-300">{s.owner}</TableCell>
                    <TableCell>
                      <Badge className="text-[10px] bg-slate-700/50 text-slate-300">{s.users}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[s.status] || 'bg-slate-500/20 text-slate-400'}`}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{s.created}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-7 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                            <Eye className="size-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700 text-white">
                          <DialogHeader>
                            <DialogTitle className="text-amber-400">{s.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            {[
                              { label: 'Station ID', value: s.id },
                              { label: 'Location', value: s.location },
                              { label: 'Owner', value: s.owner },
                              { label: 'Users', value: `${s.users} active` },
                              { label: 'Status', value: s.status },
                              { label: 'Created', value: s.created },
                            ].map((item) => (
                              <div key={item.label} className="flex justify-between bg-slate-700/40 rounded-lg p-2">
                                <span className="text-xs text-slate-400">{item.label}</span>
                                <span className="text-xs font-semibold">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render Feature Manager Tab ────────────────────────────────────────────

  const renderFeatures = () => (
    <div className="space-y-4">
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ToggleLeft className="size-4 text-amber-400" />
            <div>
              <CardTitle className="text-sm font-semibold">Feature Manager</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Toggle features on/off per station</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {featureStates.map((feature) => (
            <div key={feature.id} className="bg-slate-700/30 rounded-xl p-4 border border-slate-700/40">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{feature.name}</span>
                    <Badge className={`text-[10px] ${feature.enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
                      {feature.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">{feature.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Select defaultValue={feature.stationId}>
                    <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-700/50 border-slate-600/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="all">All Stations</SelectItem>
                      {mockStations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch
                    checked={feature.enabled}
                    onCheckedChange={() => toggleFeature(feature.id)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render AI Batch Update Tab ────────────────────────────────────────────

  const renderAiBatch = () => (
    <div className="space-y-4">
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-amber-400" />
            <div>
              <CardTitle className="text-sm font-semibold">AI Batch Update</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Execute natural language commands across the platform</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder='e.g. "Set Petrol price to 180.50 for station S1"'
            value={aiCommand}
            onChange={(e) => setAiCommand(e.target.value)}
            className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 min-h-[100px]"
          />
          <div className="flex items-center gap-2">
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogTrigger asChild>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  disabled={!aiCommand.trim()}
                >
                  <Play className="size-4 mr-1" /> Execute Command
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-amber-400">Confirm AI Command</DialogTitle>
                </DialogHeader>
                <div className="bg-slate-700/40 rounded-lg p-4">
                  <p className="text-sm text-slate-300">{aiCommand}</p>
                </div>
                <p className="text-xs text-slate-400">This action will be executed across the platform and logged for audit purposes.</p>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" className="text-slate-400">Cancel</Button>
                  </DialogClose>
                  <Button
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setAiCommand('');
                    }}
                  >
                    <CheckCircle className="size-4 mr-1" /> Confirm & Execute
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50"
              onClick={() => setAiCommand('Set Petrol price to 180.50 for station S1')}
            >
              Example Command
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Command History */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Command History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {mockCommandHistory.map((cmd) => (
              <div key={cmd.id} className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
                {cmd.status === 'success' ? (
                  <CheckCircle className="size-4 text-green-400 shrink-0" />
                ) : (
                  <XCircle className="size-4 text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{cmd.command}</p>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{cmd.timestamp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render Access Logs Tab ────────────────────────────────────────────────

  const renderAccessLogs = () => (
    <div className="space-y-4">
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-amber-400" />
            <div>
              <CardTitle className="text-sm font-semibold">Founder Access Logs</CardTitle>
              <CardDescription className="text-slate-400 text-xs">SOC-2 compliant audit trail for founder-level access</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Timestamp</TableHead>
                  <TableHead className="text-slate-400">Action</TableHead>
                  <TableHead className="text-slate-400">Resource</TableHead>
                  <TableHead className="text-slate-400">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAccessLogs.map((log) => (
                  <TableRow key={log.id} className="border-slate-700/30 hover:bg-slate-700/20">
                    <TableCell className="text-xs text-slate-400 font-mono">{log.timestamp}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${log.action === 'delete' ? 'bg-red-500/20 text-red-400' : log.action === 'update' ? 'bg-amber-500/20 text-amber-400' : log.action === 'login' ? 'bg-green-500/20 text-green-400' : log.action === 'export' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-600/50 text-slate-300'}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">{log.resource}</TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">{log.ip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render Subscriptions Tab ──────────────────────────────────────────────

  const renderSubscriptions = () => (
    <div className="space-y-4">
      {/* Tier Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {subscriptionTiers.map((tier) => (
          <Card key={tier.name} className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardContent className="p-4">
              <div className="text-center mb-3">
                <div className="text-lg font-bold">{tier.name}</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{tier.price}</div>
              </div>
              <Separator className="bg-slate-700/50 my-3" />
              <ul className="space-y-1.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle className="size-3 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscriber List */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Subscribers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Tier</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Renewal Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockSubscribers.map((sub) => (
                  <TableRow key={sub.id} className="border-slate-700/30 hover:bg-slate-700/20">
                    <TableCell className="font-medium text-sm">{sub.name}</TableCell>
                    <TableCell className="text-xs text-slate-300">{sub.email}</TableCell>
                    <TableCell>
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-400">{sub.tier}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[sub.status] || 'bg-slate-500/20 text-slate-400'}`}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">{sub.renewalDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render Placeholder Tab ────────────────────────────────────────────────

  const renderPlaceholder = (title: string, description: string, icon: typeof LayoutDashboard) => (
    <Card className="bg-slate-800/60 border-slate-700/50 text-white">
      <CardContent className="p-8 text-center">
        {(() => { const Icon = icon; return <Icon className="size-12 text-amber-400 mx-auto mb-4" />; })()}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </CardContent>
    </Card>
  );

  // ─── Render Content ────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return renderUsers();
      case 'stations':
        return renderStations();
      case 'features':
        return renderFeatures();
      case 'ai-batch':
        return renderAiBatch();
      case 'access-logs':
        return renderAccessLogs();
      case 'subscriptions':
        return renderSubscriptions();
      case 'sales':
        return renderPlaceholder('Sales Overview', 'Platform-wide sales analytics and metrics', DollarSign);
      case 'pricing':
        return renderPlaceholder('Pricing Configuration', 'Manage subscription tiers and pricing rules', Tag);
      case 'security':
        return renderPlaceholder('Security Settings', '2FA, session policies, and security configuration', Shield);
      case 'tab-config':
        return renderPlaceholder('Tab Configuration', 'Customize navigation tabs and feature visibility', LayoutGrid);
      case 'api-keys':
        return renderPlaceholder('API Key Management', 'Generate and manage API keys for integrations', Key);
      case 'dev-console':
        return renderPlaceholder('Developer Console', 'Debug tools, system health, and environment variables', Terminal);
      case 'theme-editor':
        return renderPlaceholder('Theme Editor', 'Customize colors, fonts, and branding across the platform', Palette);
      case 'webhooks':
        return renderPlaceholder('Webhook Management', 'Configure webhook endpoints for external integrations', Link);
      case 'backups':
        return renderPlaceholder('Backup Management', 'Schedule and restore system backups', Database);
      case 'cache':
        return renderPlaceholder('Cache Control', 'Clear cache, view stats, and manage Redis entries', Trash2);
      default:
        return renderDashboard();
    }
  };

  // ─── Main Layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Left Sidebar */}
      <div className={`shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-14' : 'w-52'}`}>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white h-full">
          <CardContent className="p-2">
            {/* Collapse Toggle */}
            <div className="flex items-center justify-between mb-2 px-1">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-1.5">
                  <Crown className="size-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Admin Panel</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
              </Button>
            </div>

            <Separator className="bg-slate-700/50 my-1" />

            {/* Navigation Items */}
            <ScrollArea className="h-[450px]">
              <nav className="space-y-0.5">
                {sidebarItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`
                        flex items-center gap-2 w-full rounded-lg px-2 py-2 text-xs font-medium
                        transition-all duration-150
                        ${isActive
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                        }
                      `}
                      title={item.label}
                    >
                      <item.icon className={`size-4 shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      {isActive && !sidebarCollapsed && (
                        <span className="ml-auto size-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {renderContent()}
      </div>
    </div>
  );
}
