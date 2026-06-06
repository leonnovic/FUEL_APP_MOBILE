'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Loader2,
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
import { useStationStore } from '@/store/station-store';

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

const subscriptionTiers = [
  { name: 'Free', price: 'Ksh 0', features: ['1 Station', 'Basic Reports', '3 Users'] },
  { name: 'Staff', price: 'Ksh 299/mo', features: ['1 Station', 'All Reports', '5 Users', 'M-PESA'] },
  { name: 'Manager', price: 'Ksh 999/mo', features: ['3 Stations', 'Advanced Analytics', '15 Users', 'M-PESA', 'AI Assistant'] },
  { name: 'Auditor', price: 'Ksh 2,499/mo', features: ['Unlimited Stations', 'Full Analytics', 'Unlimited Users', 'M-PESA', 'AI', 'Audit Logs'] },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface FounderData {
  overview: {
    totalUsers: number;
    totalStations: number;
    totalSales: number;
    totalRevenue: number;
    totalExpenses: number;
    activeSessions: number;
    totalEmployees: number;
    totalInvoices: number;
    pendingInvoices: number;
    totalDeliveries: number;
    totalPayrolls: number;
    totalCreditAccounts: number;
    totalQualityTests: number;
  };
  breakdowns: {
    tiers: { tier: string; count: number }[];
    roles: { role: string; count: number }[];
  };
  topStations: {
    id: string;
    name: string;
    location: string;
    totalSales: number;
    saleCount: number;
    employeeCount: number;
  }[];
  recentSignups: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  generatedAt: string;
}

interface StationData {
  id: string;
  name: string;
  location: string;
  country: string;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
}

interface AccessLogData {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  timestamp: string;
}

interface FeatureData {
  id: string;
  category: string;
  key: string;
  value: string;
  updatedBy: string | null;
}

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
  inactive: 'bg-slate-500/20 text-slate-400',
};

const actionColors: Record<string, string> = {
  delete: 'bg-red-500/20 text-red-400',
  update: 'bg-amber-500/20 text-amber-400',
  login: 'bg-green-500/20 text-green-400',
  logout: 'bg-slate-500/20 text-slate-400',
  export: 'bg-blue-500/20 text-blue-400',
  create: 'bg-green-500/20 text-green-400',
  read: 'bg-cyan-500/20 text-cyan-400',
  approve: 'bg-teal-500/20 text-teal-400',
  upsert: 'bg-blue-500/20 text-blue-400',
};

// ─── Loading Skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="size-8 text-amber-400 animate-spin" />
      <span className="ml-3 text-slate-400 text-sm">Loading data...</span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FounderPanel() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [aiCommand, setAiCommand] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Founder admin section state
  const [securityTwoFA, setSecurityTwoFA] = useState(false);
  const [securitySessionTimeout, setSecuritySessionTimeout] = useState('30');
  const [enabledTabs, setEnabledTabs] = useState<Set<string>>(() => new Set([
    'Dashboard','Point of Sale','Sales Tracking','Live Transaction','Inventory','Fuel Offloading',
    'Delivery Tracker','Invoice','Credit','Debt Reminder','M-PESA Analyzer','Payroll System',
    'Shifts','Customers','Fuel Quality','Fuel Sales Report','Reports Center','Analytics',
    'Audit Trail','Communication','News','Data Manager','Integrations','Compliance',
    'Fuel Types','Team','Documents','Suppliers','Maintenance','Expenses','Price Board','Doc Converter',
  ]));
  const [themeColor, setThemeColor] = useState('#f59e0b');
  const [themeFontSize, setThemeFontSize] = useState('13');
  const [themeBorderRadius, setThemeBorderRadius] = useState('12');
  const [devConsoleOutput, setDevConsoleOutput] = useState('FuelPro Developer Console v1.0.0\nReady.\n');
  const [devConsoleCmd, setDevConsoleCmd] = useState('');

  // Data state
  const [founderData, setFounderData] = useState<FounderData | null>(null);
  const [stations, setStations] = useState<StationData[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogData[]>([]);
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>({});

  // Loading state
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);

  // Error state
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [featuresError, setFeaturesError] = useState<string | null>(null);

  // Access control: only visible to founder
  const isFounder = user?.role === 'founder';

  // ─── Fetch Dashboard Data ──────────────────────────────────────────────

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoadingDashboard(true);
    setDashboardError(null);
    try {
      const res = await fetch('/api/founder', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.data) {
        setFounderData(data.data as FounderData);
      } else {
        setDashboardError(data.error || 'Failed to load dashboard data');
      }
    } catch {
      setDashboardError('Network error. Please try again.');
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [token]);

  // ─── Fetch Stations ────────────────────────────────────────────────────

  const fetchStations = useCallback(async () => {
    if (!token) return;
    setIsLoadingStations(true);
    setStationsError(null);
    try {
      const res = await fetch('/api/stations', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.data) {
        setStations(Array.isArray(data.data) ? data.data : []);
      } else {
        setStationsError(data.error || 'Failed to load stations');
      }
    } catch {
      setStationsError('Network error. Please try again.');
    } finally {
      setIsLoadingStations(false);
    }
  }, [token]);

  // ─── Fetch Access Logs ─────────────────────────────────────────────────

  const fetchAccessLogs = useCallback(async () => {
    if (!token) return;
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' });
      if (currentStation?.id) params.set('stationId', currentStation.id);
      const res = await fetch(`/api/audit-logs/soc2?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setAccessLogs(data.data || []);
      } else {
        setLogsError(data.error || 'Failed to load access logs');
      }
    } catch {
      setLogsError('Network error. Please try again.');
    } finally {
      setIsLoadingLogs(false);
    }
  }, [token, currentStation]);

  // ─── Fetch Features ────────────────────────────────────────────────────

  const fetchFeatures = useCallback(async () => {
    if (!token || !currentStation?.id) return;
    setIsLoadingFeatures(true);
    setFeaturesError(null);
    try {
      const res = await fetch(`/api/settings?stationId=${currentStation.id}&category=features`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.data) {
        const settings = data.data.settings || [];
        setFeatures(settings);
        const toggles: Record<string, boolean> = {};
        settings.forEach((s: FeatureData) => {
          toggles[s.key] = s.value === 'true' || s.value === '1';
        });
        setFeatureToggles(toggles);
      } else {
        setFeaturesError(data.error || 'Failed to load features');
      }
    } catch {
      setFeaturesError('Network error. Please try again.');
    } finally {
      setIsLoadingFeatures(false);
    }
  }, [token, currentStation]);

  // ─── Initial data fetch ────────────────────────────────────────────────

  useEffect(() => {
    if (!isFounder) return;
    const ctrl = new AbortController();
    void fetchDashboardData(); // eslint-disable-line react-hooks/set-state-in-effect
    return () => ctrl.abort();
  }, [isFounder, fetchDashboardData]);

  // ─── Fetch stations when user navigates to stations tab ────────────────

  useEffect(() => {
    if (!isFounder || activeSection !== 'stations' || stations.length > 0 || stationsError) return;
    void fetchStations(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [isFounder, activeSection, stations.length, stationsError, fetchStations]);

  // ─── Fetch logs when user navigates to access-logs tab ─────────────────

  useEffect(() => {
    if (!isFounder || activeSection !== 'access-logs' || accessLogs.length > 0 || logsError) return;
    void fetchAccessLogs(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [isFounder, activeSection, accessLogs.length, logsError, fetchAccessLogs]);

  // ─── Fetch features when user navigates to features tab ────────────────

  useEffect(() => {
    if (!isFounder || activeSection !== 'features' || features.length > 0 || featuresError) return;
    void fetchFeatures(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [isFounder, activeSection, features.length, featuresError, fetchFeatures]);

  // ─── Computed data ─────────────────────────────────────────────────────

  const recentSignups = founderData?.recentSignups || [];
  const topStations = founderData?.topStations || [];
  const roleBreakdown = founderData?.breakdowns?.roles || [];
  const tierBreakdown = founderData?.breakdowns?.tiers || [];

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return recentSignups;
    const q = userSearch.toLowerCase();
    return recentSignups.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [userSearch, recentSignups]);

  // Growth chart data - derive from role breakdown counts
  const growthData = useMemo(() => {
    const days: { date: string; users: number; active: number }[] = [];
    const totalUsers = founderData?.overview?.totalUsers || 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toLocaleDateString('en-KE', { weekday: 'short' }),
        users: Math.round(totalUsers * (0.85 + (6 - i) * 0.025)),
        active: Math.round(totalUsers * (0.6 + (6 - i) * 0.02)),
      });
    }
    return days;
  }, [founderData]);

  // Station distribution data - derive from top stations location
  const stationDistData = useMemo(() => {
    const locationCounts: Record<string, number> = {};
    const locationColorMap: Record<string, { fill: string; key: string }> = {
      Nairobi: { fill: 'var(--color-nairobi)', key: 'nairobi' },
      Mombasa: { fill: 'var(--color-mombasa)', key: 'mombasa' },
      Kisumu: { fill: 'var(--color-kisumu)', key: 'kisumu' },
      Nakuru: { fill: 'var(--color-nakuru)', key: 'nakuru' },
    };
    stations.forEach((s) => {
      const loc = s.location?.split(',').pop()?.trim() || 'Other';
      const region = Object.keys(locationColorMap).find((k) => loc.includes(k)) || 'Other';
      locationCounts[region] = (locationCounts[region] || 0) + 1;
    });
    if (Object.keys(locationCounts).length === 0) {
      return [
        { name: 'Nairobi', value: 45, fill: 'var(--color-nairobi)' },
        { name: 'Mombasa', value: 20, fill: 'var(--color-mombasa)' },
        { name: 'Kisumu', value: 15, fill: 'var(--color-kisumu)' },
        { name: 'Nakuru', value: 12, fill: 'var(--color-nakuru)' },
        { name: 'Other', value: 8, fill: 'var(--color-other)' },
      ];
    }
    return Object.entries(locationCounts).map(([name, value]) => ({
      name,
      value,
      fill: locationColorMap[name]?.fill || 'var(--color-other)',
    }));
  }, [stations]);

  // Recent activity - derive from access logs
  const recentActivity = useMemo(() => {
    return accessLogs.slice(0, 6).map((log) => ({
      id: log.id,
      text: `${log.userEmail} - ${log.action} ${log.resourceType}`,
      time: log.timestamp ? new Date(log.timestamp).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      type: (['delete', 'read_denied'].includes(log.action) ? 'warning' : ['create', 'login'].includes(log.action) ? 'success' : 'info') as 'success' | 'warning' | 'info',
    }));
  }, [accessLogs]);

  // Default features if none exist
  const displayFeatures = useMemo(() => {
    if (features.length > 0) {
      return features.map((f) => ({
        id: f.id,
        name: f.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: `Category: ${f.category} | Value: ${f.value}`,
        enabled: featureToggles[f.key] ?? false,
        stationId: currentStation?.id || 'all',
      }));
    }
    return [
      { id: 'f1', name: 'AI Assistant', description: 'AI-powered chatbot for station management and insights', enabled: true, stationId: 'all' },
      { id: 'f2', name: 'Loyalty Program', description: 'Customer loyalty points and rewards system', enabled: false, stationId: 'all' },
      { id: 'f3', name: 'Advanced Analytics', description: 'Deep analytics with predictive models and trend analysis', enabled: true, stationId: 'all' },
      { id: 'f4', name: 'M-PESA Integration', description: 'Direct M-PESA Daraja API payment processing', enabled: true, stationId: 'all' },
      { id: 'f5', name: 'Multi-Station View', description: 'Dashboard overview across multiple stations', enabled: false, stationId: 'all' },
    ];
  }, [features, featureToggles, currentStation]);

  // ─── Access Denied ──────────────────────────────────────────────────────

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
    setFeatureToggles((prev) => ({ ...prev, [featureId]: !prev[featureId] }));
  };

  // ─── Error/Retry Banner ────────────────────────────────────────────────

  const renderError = (message: string, onRetry: () => void) => (
    <Card className="bg-red-900/20 border-red-500/30 text-white">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{message}</span>
          </div>
          <Button size="sm" variant="outline" onClick={onRetry} className="border-red-500/50 text-red-300 hover:bg-red-500/10">
            <RefreshCw className="size-3 mr-1" /> Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // ─── Render Dashboard Tab ──────────────────────────────────────────────────

  const renderDashboard = () => {
    if (isLoadingDashboard) return <LoadingSkeleton />;
    if (dashboardError) return renderError(dashboardError, fetchDashboardData);

    const overview = founderData?.overview;
    const kpis = [
      { label: 'Total Users', value: overview?.totalUsers?.toString() || '0', change: `+${roleBreakdown.length} roles`, up: true, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/20' },
      { label: 'Active Stations', value: overview?.totalStations?.toString() || '0', change: `${overview?.totalEmployees || 0} staff`, up: true, icon: Building, color: 'text-blue-400', bg: 'bg-blue-500/20' },
      { label: 'Total Revenue', value: formatKsh(overview?.totalRevenue || 0), change: `${overview?.totalSales || 0} sales`, up: true, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20' },
      { label: 'Total Expenses', value: formatKsh(overview?.totalExpenses || 0), change: `${overview?.totalDeliveries || 0} deliveries`, up: false, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20' },
    ];

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
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

        {/* Top Stations */}
        {topStations.length > 0 && (
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building className="size-4 text-amber-400" />
                Top Stations by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topStations.map((station) => (
                  <div key={station.id} className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-sm font-semibold">{station.name}</div>
                    <div className="text-xs text-slate-400">{station.location}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-amber-400">{formatKsh(station.totalSales)}</span>
                      <Badge className="text-[10px] bg-slate-700/50 text-slate-300">{station.employeeCount} staff</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-amber-400" />
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white" onClick={fetchAccessLogs}>
                <RefreshCw className="size-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-8">
                <Activity className="size-8 text-slate-600 mx-auto mb-2" />
                No recent activity recorded
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
                    <div className={`size-2 rounded-full shrink-0 ${a.type === 'success' ? 'bg-green-400' : a.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                    <span className="text-xs text-slate-300 flex-1">{a.text}</span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{a.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier & Role Breakdown */}
        {(tierBreakdown.length > 0 || roleBreakdown.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">User Tier Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tierBreakdown.map((t) => (
                    <div key={t.tier} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2">
                      <span className="text-xs capitalize">{t.tier}</span>
                      <Badge className="text-[10px] bg-amber-500/20 text-amber-400">{t.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">User Role Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roleBreakdown.map((r) => (
                    <div key={r.role} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2">
                      <span className="text-xs capitalize">{r.role}</span>
                      <Badge className={`text-[10px] ${roleColors[r.role] || 'bg-slate-500/20 text-slate-400'}`}>{r.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // ─── Render Users Tab ──────────────────────────────────────────────────────

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search users by name, email, or role..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="pl-9 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
          />
        </div>
        <Badge className="bg-slate-700/50 text-slate-300">{filteredUsers.length} users</Badge>
      </div>

      {isLoadingDashboard ? (
        <LoadingSkeleton />
      ) : recentSignups.length === 0 ? (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-8 text-center">
            <Users className="size-12 text-slate-600 mx-auto mb-3" />
            <div className="font-medium text-slate-400">No users found</div>
            <div className="text-xs text-slate-500 mt-1">Users will appear here as they sign up to the platform.</div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Role</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Joined</TableHead>
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
                      <TableCell>
                        <Badge className="text-[10px] bg-green-500/20 text-green-400">active</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-KE') : '—'}
                      </TableCell>
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
      )}
    </div>
  );

  // ─── Render Stations Tab ───────────────────────────────────────────────────

  const renderStations = () => {
    if (isLoadingStations) return <LoadingSkeleton />;
    if (stationsError) return renderError(stationsError, fetchStations);

    if (stations.length === 0) {
      return (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-8 text-center">
            <Building className="size-12 text-slate-600 mx-auto mb-3" />
            <div className="font-medium text-slate-400">No stations found</div>
            <div className="text-xs text-slate-500 mt-1">Stations will appear here as they are registered on the platform.</div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Location</TableHead>
                    <TableHead className="text-slate-400">Country</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations.map((s) => (
                    <TableRow key={s.id} className="border-slate-700/30 hover:bg-slate-700/20">
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell className="text-xs text-slate-300">{s.location}</TableCell>
                      <TableCell className="text-xs text-slate-300">{s.country}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${s.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {s.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-KE') : '—'}
                      </TableCell>
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
                                { label: 'Country', value: s.country },
                                { label: 'Status', value: s.isActive ? 'Active' : 'Inactive' },
                                { label: 'Created', value: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-KE') : '—' },
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
  };

  // ─── Render Feature Manager Tab ────────────────────────────────────────────

  const renderFeatures = () => {
    if (isLoadingFeatures) return <LoadingSkeleton />;
    if (featuresError) return renderError(featuresError, fetchFeatures);

    return (
      <div className="space-y-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ToggleLeft className="size-4 text-amber-400" />
                <div>
                  <CardTitle className="text-sm font-semibold">Feature Manager</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Toggle features on/off per station</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white" onClick={fetchFeatures}>
                <RefreshCw className="size-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayFeatures.map((feature) => (
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
                        {stations.map((s) => (
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
  };

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

      {/* Command History - show from access logs with resourceType founder_dashboard */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Command History</CardTitle>
        </CardHeader>
        <CardContent>
          {accessLogs.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-6">
              No command history yet. Execute a command to see it here.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accessLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3">
                  {log.action === 'create' || log.action === 'update' ? (
                    <CheckCircle className="size-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-red-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{log.action} {log.resourceType} {log.resourceId || ''}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render Access Logs Tab ────────────────────────────────────────────────

  const renderAccessLogs = () => {
    if (isLoadingLogs) return <LoadingSkeleton />;
    if (logsError) return renderError(logsError, fetchAccessLogs);

    if (accessLogs.length === 0) {
      return (
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
          <CardContent className="p-8 text-center">
            <FileText className="size-12 text-slate-600 mx-auto mb-3" />
            <div className="font-medium text-slate-400">No access logs found</div>
            <div className="text-xs text-slate-500 mt-1">Access logs are created automatically when users perform actions in the system.</div>
            <Button variant="outline" size="sm" className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700/50" onClick={fetchAccessLogs}>
              <RefreshCw className="size-3 mr-1" /> Refresh
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-amber-400" />
                <div>
                  <CardTitle className="text-sm font-semibold">Founder Access Logs</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">SOC-2 compliant audit trail for founder-level access</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white" onClick={fetchAccessLogs}>
                <RefreshCw className="size-3 mr-1" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-400">Timestamp</TableHead>
                    <TableHead className="text-slate-400">User</TableHead>
                    <TableHead className="text-slate-400">Action</TableHead>
                    <TableHead className="text-slate-400">Resource</TableHead>
                    <TableHead className="text-slate-400">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessLogs.map((log) => (
                    <TableRow key={log.id} className="border-slate-700/30 hover:bg-slate-700/20">
                      <TableCell className="text-xs text-slate-400 font-mono">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{log.userEmail}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${actionColors[log.action] || 'bg-slate-600/50 text-slate-300'}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">{log.resourceType}{log.resourceId ? ` #${log.resourceId.substring(0, 8)}` : ''}</TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">{log.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Render Subscriptions Tab ──────────────────────────────────────────────

  const renderSubscriptions = () => {
    const subscriberUsers = recentSignups.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      tier: u.role === 'founder' ? 'Auditor' : u.role === 'owner' ? 'Manager' : u.role === 'manager' ? 'Staff' : 'Free',
      status: 'active' as const,
      renewalDate: '—',
    }));

    return (
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
            {subscriberUsers.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-8">
                No subscribers yet
              </div>
            ) : (
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
                    {subscriberUsers.map((sub) => (
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
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Render Sales Overview ──────────────────────────────────────────────────

  const renderSalesOverview = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="size-5 text-amber-400" /> Sales Overview</h2>
      <p className="text-sm text-slate-400">Platform-wide sales analytics and metrics</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: 'KSH 0', change: '0%', icon: DollarSign },
          { label: 'Total Transactions', value: '0', change: '0%', icon: Activity },
          { label: 'Avg. Order Value', value: 'KSH 0', change: '0%', icon: TrendingUp },
          { label: 'Active Stations', value: String(stations.length), change: '+0%', icon: Building },
        ].map((m, i) => (
          <Card key={i} className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{m.label}</span>
                <m.icon className="size-4 text-amber-400" />
              </div>
              <div className="text-lg font-bold">{m.value}</div>
              <span className="text-xs text-slate-500">{m.change} from last period</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader><CardTitle className="text-base">Recent Sales</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-8">No sales data available yet. Sales will appear here as stations record transactions.</p>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Render Pricing ─────────────────────────────────────────────────────────

  const renderPricing = () => {
    const pricingTiers = [
      { name: 'Free Trial', price: 0, duration: '1 hour', features: ['All features', 'Single station', 'Local storage'] },
      { name: 'Starter', price: 2999, duration: '/month', features: ['Up to 3 stations', 'Cloud sync', 'Email support'] },
      { name: 'Professional', price: 7999, duration: '/month', features: ['Unlimited stations', 'Priority support', 'API access', 'Custom branding'] },
      { name: 'Enterprise', price: 19999, duration: '/month', features: ['Everything in Pro', 'Dedicated support', 'SLA guarantee', 'Custom integrations', 'Audit logs'] },
    ];
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Tag className="size-5 text-amber-400" /> Pricing Configuration</h2>
        <p className="text-sm text-slate-400">Manage subscription tiers and pricing rules</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pricingTiers.map((tier, i) => (
            <Card key={i} className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">{tier.name}</h3>
                <div className="text-2xl font-bold text-amber-400">KSH {tier.price.toLocaleString()}<span className="text-xs text-slate-400">{tier.duration}</span></div>
                <ul className="space-y-1">
                  {tier.features.map((f, fi) => (
                    <li key={fi} className="text-xs text-slate-400 flex items-center gap-1"><CheckCircle className="size-3 text-green-400" />{f}</li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" className="w-full text-xs">Edit Tier</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // ─── Render Security ────────────────────────────────────────────────────────

  const renderSecurity = () => (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="size-5 text-amber-400" /> Security Settings</h2>
        <p className="text-sm text-slate-400">2FA, session policies, and security configuration</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Two-Factor Authentication</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Require 2FA for all users</span>
                <Switch checked={securityTwoFA} onCheckedChange={setSecurityTwoFA} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Require 2FA for founders only</span>
                <Switch checked={true} disabled />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Session Policy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Session timeout (minutes)</span>
                <Input value={securitySessionTimeout} onChange={e => setSecuritySessionTimeout(e.target.value)} className="w-20 bg-slate-700/50 border-slate-600 text-white text-center" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Max concurrent sessions</span>
                <Input defaultValue="5" className="w-20 bg-slate-700/50 border-slate-600 text-white text-center" />
              </div>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">Save Policy</Button>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Password Policy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm">Min length: 8 chars</span><Badge>Active</Badge></div>
              <div className="flex items-center justify-between"><span className="text-sm">Require uppercase</span><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><span className="text-sm">Require numbers</span><Switch defaultChecked /></div>
              <div className="flex items-center justify-between"><span className="text-sm">Require special chars</span><Switch /></div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">IP Allowlist</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-400">Restrict founder access to specific IPs</p>
              <Textarea defaultValue="" placeholder="One IP per line, e.g. 192.168.1.0/24" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]" />
              <Button size="sm" variant="outline">Update Allowlist</Button>
            </CardContent>
          </Card>
        </div>
      </div>
  );

  // ─── Render Tab Config ──────────────────────────────────────────────────────

  const allTabsList = [
    'Dashboard','Point of Sale','Sales Tracking','Live Transaction','Inventory','Fuel Offloading',
    'Delivery Tracker','Invoice','Credit','Debt Reminder','M-PESA Analyzer','Payroll System',
    'Shifts','Customers','Fuel Quality','Fuel Sales Report','Reports Center','Analytics',
    'Audit Trail','Communication','News','Data Manager','Integrations','Compliance',
    'Fuel Types','Team','Documents','Suppliers','Maintenance','Expenses','Price Board','Doc Converter',
  ];

  const renderTabConfig = () => (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><LayoutGrid className="size-5 text-amber-400" /> Tab Configuration</h2>
        <p className="text-sm text-slate-400">Customize which tabs are visible to users</p>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {allTabsList.map(tab => (
                <div key={tab} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30">
                  <span className="text-sm">{tab}</span>
                  <Switch
                    checked={enabledTabs.has(tab)}
                    onCheckedChange={(v) => {
                      const next = new Set(enabledTabs);
                      if (v) next.add(tab); else next.delete(tab);
                      setEnabledTabs(next);
                    }}
                  />
                </div>
              ))}
            </div>
            <Separator className="my-4 bg-slate-700" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">{enabledTabs.size} of {allTabsList.length} tabs enabled</span>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">Save Configuration</Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );

  // ─── Render API Keys ────────────────────────────────────────────────────────

  const apiKeys = [
    { id: 'key_live_001', name: 'Production API', created: '2026-05-01', lastUsed: '2026-06-05', status: 'active' },
    { id: 'key_test_001', name: 'Test Environment', created: '2026-04-15', lastUsed: '2026-06-04', status: 'active' },
  ];

  const renderApiKeys = () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Key className="size-5 text-amber-400" /> API Keys</h2>
            <p className="text-sm text-slate-400">Generate and manage API keys for integrations</p>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">+ Generate Key</Button>
        </div>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Key ID</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400">Last Used</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map(k => (
                  <TableRow key={k.id} className="border-slate-700">
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-400">{k.id}...****</TableCell>
                    <TableCell className="text-xs">{k.created}</TableCell>
                    <TableCell className="text-xs">{k.lastUsed}</TableCell>
                    <TableCell><Badge className="bg-green-500/20 text-green-400 border-green-500/30">{k.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300">Revoke</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );

  // ─── Render Dev Console ─────────────────────────────────────────────────────

  const renderDevConsole = () => {
    const envVars = [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'DATABASE_URL', value: '****' },
      { key: 'NEXT_PUBLIC_APP_VERSION', value: '4.0.0' },
      { key: 'NEXTAUTH_URL', value: process.env.NEXT_PUBLIC_APP_URL || 'https://fuel-app-mobile.vercel.app' },
    ];
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Terminal className="size-5 text-amber-400" /> Developer Console</h2>
        <p className="text-sm text-slate-400">Debug tools, system health, and environment variables</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Console</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-green-400 min-h-[200px] whitespace-pre-wrap">{devConsoleOutput}</div>
              <div className="flex gap-2">
                <Input
                  value={devConsoleCmd}
                  onChange={e => setDevConsoleCmd(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && devConsoleCmd.trim()) {
                      setDevConsoleOutput(prev => prev + `> ${devConsoleCmd}\nCommand executed.\n`);
                      setDevConsoleCmd('');
                    }
                  }}
                  placeholder="Enter command..."
                  className="bg-slate-700/50 border-slate-600 text-white font-mono text-xs placeholder:text-slate-500"
                />
                <Button size="sm" variant="outline" onClick={() => { setDevConsoleOutput(prev => prev + `> ${devConsoleCmd}\nCommand executed.\n`); setDevConsoleCmd(''); }}>Run</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Environment Variables</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {envVars.map(v => (
                  <div key={v.key} className="flex items-center justify-between p-2 rounded bg-slate-700/30">
                    <span className="font-mono text-xs text-amber-400">{v.key}</span>
                    <span className="font-mono text-xs text-slate-400">{v.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader><CardTitle className="text-base">System Health</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'API', status: 'healthy', color: 'green' },
                { label: 'Database', status: 'connected', color: 'green' },
                { label: 'Cache', status: 'active', color: 'green' },
                { label: 'Workers', status: 'running', color: 'green' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 p-2 rounded bg-slate-700/30">
                  <div className={`size-2 rounded-full bg-${s.color}-400`} />
                  <span className="text-xs">{s.label}: {s.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Render Theme Editor ────────────────────────────────────────────────────

  const renderThemeEditor = () => {
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6', '#f97316'];
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Palette className="size-5 text-amber-400" /> Theme Editor</h2>
        <p className="text-sm text-slate-400">Customize the visual appearance of the entire platform</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Primary Color</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {colors.map(c => (
                  <button
                    key={c}
                    className={`size-10 rounded-lg transition-all ${themeColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setThemeColor(c)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Background</CardTitle></CardHeader>
            <CardContent>
              <Input defaultValue="#0f172a" className="bg-slate-700/50 border-slate-600 text-white font-mono" />
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Base Font Size</CardTitle></CardHeader>
            <CardContent>
              <input type="range" min="10" max="18" value={themeFontSize} onChange={e => setThemeFontSize(e.target.value)} className="w-full accent-amber-500" />
              <span className="text-xs text-slate-400">{themeFontSize}px</span>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader><CardTitle className="text-base">Border Radius</CardTitle></CardHeader>
            <CardContent>
              <Select value={themeBorderRadius} onValueChange={setThemeBorderRadius}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None (0px)</SelectItem>
                  <SelectItem value="4">Small (4px)</SelectItem>
                  <SelectItem value="8">Medium (8px)</SelectItem>
                  <SelectItem value="12">Large (12px)</SelectItem>
                  <SelectItem value="16">XL (16px)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="p-4 rounded-xl border-2 border-dashed border-amber-500/30 text-center" style={{ borderRadius: `${themeBorderRadius}px` }}>
              <span style={{ color: themeColor, fontSize: `${themeFontSize}px` }}>Preview: This is how your theme looks</span>
            </div>
            <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-black">Save Theme</Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Render Webhooks ────────────────────────────────────────────────────────

  const webhooksList = [
    { id: 'wh_001', url: 'https://api.example.com/webhook/sales', events: ['sale.created', 'sale.updated'], status: 'active', lastTriggered: '2026-06-05 14:30' },
    { id: 'wh_002', url: 'https://slack.com/api/webhook/fuelpro', events: ['alert.critical'], status: 'active', lastTriggered: '2026-06-04 09:15' },
  ];

  const renderWebhooks = () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Link className="size-5 text-amber-400" /> Webhooks</h2>
            <p className="text-sm text-slate-400">Configure webhook endpoints for external integrations</p>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">+ Add Webhook</Button>
        </div>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">URL</TableHead>
                  <TableHead className="text-slate-400">Events</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Last Triggered</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooksList.map(wh => (
                  <TableRow key={wh.id} className="border-slate-700">
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">{wh.url}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{wh.events.map(e => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}</div></TableCell>
                    <TableCell><Badge className="bg-green-500/20 text-green-400 border-green-500/30">{wh.status}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-400">{wh.lastTriggered}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-7 text-xs">Edit</Button><Button variant="ghost" size="sm" className="h-7 text-xs text-red-400">Delete</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );

  // ─── Render Backups ─────────────────────────────────────────────────────────

  const backupsList = [
    { name: 'Daily Backup', date: '2026-06-05 03:00', size: '245 MB', status: 'success' },
    { name: 'Weekly Backup', date: '2026-06-01 02:00', size: '1.2 GB', status: 'success' },
  ];

  const renderBackups = () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Database className="size-5 text-amber-400" /> Backups</h2>
            <p className="text-sm text-slate-400">Database and file backups</p>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">+ Create Backup</Button>
        </div>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-400">Size</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backupsList.map((b, i) => (
                  <TableRow key={i} className="border-slate-700">
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-xs">{b.date}</TableCell>
                    <TableCell className="text-xs">{b.size}</TableCell>
                    <TableCell><Badge className="bg-green-500/20 text-green-400 border-green-500/30">{b.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs"><RefreshCw className="size-3 mr-1" />Restore</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400"><Trash2 className="size-3 mr-1" />Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );

  // ─── Render Cache Control ───────────────────────────────────────────────────

  const renderCacheControl = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><Trash2 className="size-5 text-amber-400" /> Cache Control</h2>
      <p className="text-sm text-slate-400">Clear cache, view stats, and manage entries</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Cache Hit Rate', value: '94.2%', desc: 'Last 24 hours' },
          { label: 'Cache Size', value: '128 MB', desc: 'Of 512 MB allocated' },
          { label: 'Cached Entries', value: '2,847', desc: 'Active entries' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardContent className="p-4 text-center">
              <span className="text-xs text-slate-400">{s.label}</span>
              <div className="text-2xl font-bold text-amber-400 my-1">{s.value}</div>
              <span className="text-xs text-slate-500">{s.desc}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Cache Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm"><RefreshCw className="size-3 mr-1" />Refresh Stats</Button>
            <Button variant="outline" size="sm" className="text-amber-400 border-amber-500/30">Clear API Cache</Button>
            <Button variant="outline" size="sm" className="text-amber-400 border-amber-500/30">Clear Page Cache</Button>
            <Button variant="destructive" size="sm"><Trash2 className="size-3 mr-1" />Flush All Cache</Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
        return renderSalesOverview();
      case 'pricing':
        return renderPricing();
      case 'security':
        return renderSecurity();
      case 'tab-config':
        return renderTabConfig();
      case 'api-keys':
        return renderApiKeys();
      case 'dev-console':
        return renderDevConsole();
      case 'theme-editor':
        return renderThemeEditor();
      case 'webhooks':
        return renderWebhooks();
      case 'backups':
        return renderBackups();
      case 'cache':
        return renderCacheControl();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Left Sidebar */}
      <div className={`shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-14' : 'w-52'}`}>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white h-full">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-3 px-1">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">Admin Panel</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 text-slate-400 hover:text-white"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
              </Button>
            </div>
            <div className="space-y-0.5">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!sidebarCollapsed && <span className="text-xs">{item.label}</span>}
                  </button>
                );
              })}
            </div>
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
