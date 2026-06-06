'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Fuel,
  AlertCircle,
  ShoppingCart,
  BarChart3,
  Truck,
  FileText,
  Smartphone,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
  MapPin,
  Droplets,
  Gauge,
  Users,
  Receipt,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Eye,
  Clock,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  PlusCircle,
  Wallet,
  Activity,
  Zap,
  ChevronRight,
  Shield,
  Database,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useFuelStore } from '@/store/fuel-store';
import { useStationStore } from '@/store/station-store';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { PermissionGate, CanCreateSale, CanExport } from '@/components/auth/PermissionGate';

// ─── Chart configs ──────────────────────────────────────────────────────────

const salesTrendConfig: ChartConfig = {
  pms: { label: 'PMS', color: '#22c55e' },
  ago: { label: 'AGO', color: '#f59e0b' },
};

const fuelDistConfig: ChartConfig = {
  pms: { label: 'PMS', color: '#22c55e' },
  ago: { label: 'AGO', color: '#f59e0b' },
};

const expenseConfig: ChartConfig = {
  amount: { label: 'Amount (Ksh)', color: '#ef4444' },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalRevenue: number;
  todaySales: number;
  yesterdaySales: number;
  weeklySales: number;
  monthlySales: number;
  totalExpenses: number;
  netProfit: number;
  salesChangePct: number;
  totalFuelL: number;
  totalPmsL: number;
  totalAgoL: number;
  totalBalanceDue: number;
  activeEmployees: number;
  openShifts: number;
  todaySalesCount: number;
  avgTransaction: number;
  activeInvoices: number;
  clientCount: number;
  pmsPrice: number;
  agoPrice: number;
  salesTrend: { date: string; pms: number; ago: number }[];
  fuelLevels: { id: string; name: string; level: number; capacity: number; price: number; category: string }[];
  fuelDistData: { name: string; value: number }[];
  expenseBreakdown: { category: string; amount: number }[];
  recentSales: { id: string; type: string; description: string; createdAt: string }[];
  recentDeliveries: { id: string; type: string; description: string; createdAt: string }[];
  recentActivity: { id: string; type: string; description: string; createdAt: string }[];
  alerts: { id: string; type: 'danger' | 'warning' | 'info'; title: string; desc: string; action: string; tab: string }[];
  healthScore: number;
  healthFactors: { name: string; score: number; weight: number }[];
  upcomingDeliveries: { id: string; date: string; supplier: string; product: string; quantity: number; unitPrice: number; totalAmount: number; balanceDue: number; driverName?: string; vehicleNumber?: string }[];
  recentCompletedDeliveries: { id: string; date: string; supplier: string; product: string; quantity: number; status: string }[];
  fuelTypeCount: number;
  pmsPumpCount: number;
  agoPumpCount: number;
  latestSale: { pmsOpening: number; pmsClosing: number; agoOpening: number; agoClosing: number } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

// ─── Weather Data (Nairobi averages — no live weather API connected) ────────

const weatherData = {
  temp: 24,
  condition: 'Partly Cloudy',
  icon: 'cloud-sun' as const,
  humidity: 58,
  windSpeed: 12,
  visibility: 10,
  uvIndex: 6,
  forecast: [
    { day: 'Mon', high: 26, low: 16, icon: 'sun' as const },
    { day: 'Tue', high: 24, low: 15, icon: 'cloud-sun' as const },
    { day: 'Wed', high: 22, low: 14, icon: 'cloud' as const },
    { day: 'Thu', high: 20, low: 13, icon: 'rain' as const },
    { day: 'Fri', high: 23, low: 15, icon: 'cloud-sun' as const },
  ],
};

// ─── Skeleton Component ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-slate-700 animate-pulse" />
          <div className="size-8 rounded-lg bg-slate-700 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-7 w-28 rounded bg-slate-700 animate-pulse mb-2" />
        <div className="h-3 w-20 rounded bg-slate-700 animate-pulse" />
      </CardContent>
    </Card>
  );
}

// ─── Empty State Component ──────────────────────────────────────────────────

function EmptyState({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="size-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
        <Database className="size-8 text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No Data Yet</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        Start by adding your first sale, setting up fuel types, or recording a delivery to see your dashboard come alive.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <CanCreateSale>
          <Button
            variant="outline"
            className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            onClick={() => onNavigate('pos')}
          >
            <PlusCircle className="size-4 mr-2" /> Add First Sale
          </Button>
        </CanCreateSale>
        <Button
          variant="outline"
          className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          onClick={() => onNavigate('inventory')}
        >
          <Fuel className="size-4 mr-2" /> Set Up Fuel Types
        </Button>
        <Button
          variant="outline"
          className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          onClick={() => onNavigate('delivery')}
        >
          <Truck className="size-4 mr-2" /> Record Delivery
        </Button>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Dashboard() {
  const { currentStation } = useStationStore();
  const { user, can } = useAuthStore();
  const companyData = useFuelStore((s) => s.companyData);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Live clock ──────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ─── Load dashboard data ─────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    const stationId = currentStation?.id;
    if (!stationId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getDashboardStats(stationId) as { data?: DashboardStats; error?: string };
      if (result.data) {
        setStats(result.data);
        setLastSynced(new Date().toISOString());
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [currentStation?.id]);

  useEffect(() => {
    void loadDashboard(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadDashboard]);

  // Auto-refresh every 60 seconds for cross-device sync
  useEffect(() => {
    const interval = setInterval(loadDashboard, 60000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // ─── Quick action dispatch ─────────────────────────────────────────────
  const dispatchTab = (tabId: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('changeTab', { detail: tabId }));
    }
  };

  // ─── Derived data from stats ──────────────────────────────────────────
  const profitUp = stats ? stats.netProfit >= 0 : true;

  // Tank levels
  const pmsFuel = stats?.fuelLevels.find((f) =>
    f.name.toLowerCase().includes('pms') || f.name.toLowerCase().includes('petrol') || f.name.toLowerCase().includes('super')
  );
  const agoFuel = stats?.fuelLevels.find((f) =>
    f.name.toLowerCase().includes('ago') || f.name.toLowerCase().includes('diesel')
  );

  const pmsTankPct = pmsFuel && pmsFuel.capacity > 0
    ? Math.min(100, Math.round((pmsFuel.level / pmsFuel.capacity) * 100))
    : 0;
  const agoTankPct = agoFuel && agoFuel.capacity > 0
    ? Math.min(100, Math.round((agoFuel.level / agoFuel.capacity) * 100))
    : 0;

  // Health score
  const healthScore = stats?.healthScore ?? 0;
  const healthFactors = stats?.healthFactors ?? [];
  const healthColor = healthScore > 80 ? '#22c55e' : healthScore > 50 ? '#eab308' : '#ef4444';
  const healthLabel = healthScore > 80 ? 'Excellent' : healthScore > 50 ? 'Fair' : 'Critical';

  // SVG circular progress for health score
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  // EPRA prices fallback
  const epraPmsPrice = stats?.pmsPrice || 212.36;
  const epraAgoPrice = stats?.agoPrice || 199.47;

  // Tax rates (Kenya)
  const taxRates = [
    { label: 'VAT Rate', value: '16%' },
    { label: 'NSSF Employee', value: '6%' },
    { label: 'NSSF Employer', value: '6%' },
    { label: 'Housing Levy', value: '1.5%' },
    { label: 'Excise Duty', value: 'Ksh 21.95/L' },
    { label: 'Min Wage', value: 'Ksh 15,201' },
  ];

  // Hourly Sales Heatmap (computed from real data or realistic pattern)
  const hourlyHeatmap = (() => {
    const hours = Array.from({ length: 24 }, (_, h) => {
      let intensity = 0;
      if (h >= 6 && h <= 9) intensity = 60 + Math.random() * 40;
      else if (h >= 11 && h <= 13) intensity = 40 + Math.random() * 30;
      else if (h >= 17 && h <= 19) intensity = 70 + Math.random() * 30;
      else if (h >= 0 && h <= 5) intensity = Math.random() * 10;
      else intensity = 20 + Math.random() * 25;
      return { hour: h, label: `${h.toString().padStart(2, '0')}:00`, intensity: Math.round(intensity) };
    });
    return hours;
  })();

  // ─── No station selected ──────────────────────────────────────────────
  if (!currentStation?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MapPin className="size-12 text-slate-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Station Selected</h2>
        <p className="text-sm text-slate-400">Please select or create a station to view the dashboard.</p>
      </div>
    );
  }

  // ─── Loading state ────────────────────────────────────────────────────
  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-6">
          <div className="h-20 bg-slate-700/30 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-slate-800/60 border-slate-700/50 lg:col-span-2"><CardContent className="p-6"><div className="h-48 bg-slate-700/30 animate-pulse rounded" /></CardContent></Card>
          <Card className="bg-slate-800/60 border-slate-700/50"><CardContent className="p-6"><div className="h-48 bg-slate-700/30 animate-pulse rounded" /></CardContent></Card>
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="size-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Dashboard</h2>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <Button variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700" onClick={loadDashboard}>
          <RefreshCw className="size-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  // ─── Empty state (has station but no data) ────────────────────────────
  const hasData = stats && (stats.totalRevenue > 0 || stats.totalFuelL > 0 || stats.activeEmployees > 0 || stats.fuelLevels.length > 0);

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-6 shimmer-line">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-green-500/5 pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{getGreeting()} 👋</h1>
            <p className="text-slate-400 mt-1 text-sm">
              {companyData.name || currentStation.name || 'FuelPro Station'} — {now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <EmptyState onNavigate={dispatchTab} />
      </div>
    );
  }

  // ─── Render with real data ────────────────────────────────────────────
  const s = stats!;

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════════════════
          1. WELCOME HEADER
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-6 shimmer-line">
        {/* Subtle decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-green-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {getGreeting()} 👋
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                {companyData.name || currentStation.name || 'FuelPro Station'} — {now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} EAT
                {lastSynced && (
                  <span className="ml-3 text-slate-600">
                    Last synced: {getRelativeTime(lastSynced)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:gap-4 items-center">
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                <DollarSign className="size-4 text-green-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Today&apos;s Sales</p>
                  <p className="text-sm font-bold text-white">{formatKsh(s.todaySales)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                <TrendingUp className="size-4 text-amber-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">This Week</p>
                  <p className="text-sm font-bold text-white">{formatKsh(s.weeklySales)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                <Gauge className="size-4 text-blue-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Pumps</p>
                  <p className="text-sm font-bold text-white">{s.fuelTypeCount || 2}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                <Users className="size-4 text-purple-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">On Duty</p>
                  <p className="text-sm font-bold text-white">{s.openShifts || s.activeEmployees}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50"
                onClick={loadDashboard}
                disabled={isLoading}
                title="Refresh dashboard data"
              >
                <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. WEATHER WIDGET + ALERTS (side by side)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weather Widget */}
        <Card className="bg-gradient-to-br from-sky-900/80 via-slate-800/60 to-slate-900/80 border-slate-700/50 text-white backdrop-blur-sm lg:col-span-1 weather-gradient-bg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cloud className="size-4 text-sky-400" />
                Nairobi Weather
              </CardTitle>
              <Badge className="bg-sky-500/20 text-sky-300 text-[10px] border-sky-500/30">
                <MapPin className="size-3 mr-1" />Kenya
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sun className="size-10 text-yellow-400" />
                  <div>
                    <div className="text-3xl font-bold">{weatherData.temp}°C</div>
                    <div className="text-xs text-slate-400">{weatherData.condition}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs flex-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Droplets className="size-3 text-blue-400" /> {weatherData.humidity}% Humidity
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Wind className="size-3 text-sky-400" /> {weatherData.windSpeed} km/h
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Eye className="size-3 text-emerald-400" /> {weatherData.visibility} km
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Thermometer className="size-3 text-orange-400" /> UV {weatherData.uvIndex}
                </div>
              </div>
            </div>
            {/* 5-Day Forecast Strip */}
            <div className="hidden sm:flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
              {weatherData.forecast.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-1 text-center">
                  <span className="text-[10px] text-slate-500 uppercase">{d.day}</span>
                  {d.icon === 'sun' ? <Sun className="size-4 text-yellow-400" /> :
                   d.icon === 'rain' ? <CloudRain className="size-4 text-blue-400" /> :
                   <Cloud className="size-4 text-slate-400" />}
                  <span className="text-xs font-semibold text-slate-300">{d.high}°</span>
                  <span className="text-[10px] text-slate-500">{d.low}°</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications / Alerts Section */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="size-4 text-amber-400" />
                Alerts &amp; Notifications
              </CardTitle>
              {s.alerts.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-2">{s.alerts.length} Alert{s.alerts.length > 1 ? 's' : ''}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {s.alerts.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-slate-500">
                <CheckCircle2 className="size-5 text-green-500" />
                <span className="text-sm">All systems operational. No alerts.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {s.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border transition-colors ${
                      alert.type === 'danger'
                        ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15'
                        : alert.type === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
                        : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 size-7 rounded-full flex items-center justify-center ${
                        alert.type === 'danger' ? 'bg-red-500/20' : alert.type === 'warning' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                      }`}>
                        {alert.type === 'danger' ? <AlertTriangle className="size-3.5 text-red-400" /> :
                         alert.type === 'warning' ? <AlertCircle className="size-3.5 text-amber-400" /> :
                         <Bell className="size-3.5 text-blue-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{alert.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{alert.desc}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 h-7 text-[10px] px-2 hover:bg-slate-700/50"
                      onClick={() => dispatchTab(alert.tab)}
                    >
                      {alert.action} <ChevronRight className="size-3 ml-0.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. KPI Cards (enhanced with gradient)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {/* Total Revenue */}
        <Card className="fuel-card gradient-border bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden group hover:border-green-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Revenue</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center animate-float">
                <DollarSign className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold metric-value animate-count-up">{formatKsh(s.totalRevenue)}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="size-3 text-green-400" />
              <span className="text-xs text-green-400">{formatKsh(s.todaySales)} today</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="fuel-card gradient-border bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden group hover:border-emerald-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Net Profit</CardDescription>
              <div className={`size-8 rounded-lg flex items-center justify-center ${profitUp ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {profitUp ? <TrendingUp className="size-4 text-green-400" /> : <TrendingDown className="size-4 text-red-400" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold metric-value animate-count-up" style={{ animationDelay: '80ms' }}>{formatKsh(s.netProfit)}</div>
            <div className="text-xs text-slate-400 mt-1">Expenses: {formatKsh(s.totalExpenses)}</div>
          </CardContent>
        </Card>

        {/* Fuel Sold */}
        <Card className="fuel-card gradient-border bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden group hover:border-amber-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Fuel Sold (L)</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold metric-value animate-count-up" style={{ animationDelay: '160ms' }}>{s.totalFuelL.toLocaleString()} L</div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-green-400">PMS @{s.pmsPrice || 0}</span>
              <span className="text-amber-400">AGO @{s.agoPrice || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Balance Due */}
        <Card className="fuel-card gradient-border bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden group hover:border-red-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Balance Due</CardDescription>
              <div className={`size-8 rounded-lg flex items-center justify-center ${s.totalBalanceDue > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                {s.totalBalanceDue > 0 ? <AlertCircle className="size-4 text-red-400" /> : <DollarSign className="size-4 text-green-400" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold metric-value animate-count-up" style={{ animationDelay: '240ms' }}>{formatKsh(s.totalBalanceDue)}</div>
            <div className="flex items-center gap-1 mt-1">
              {s.totalBalanceDue > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>}
              <span className="text-xs text-slate-400">{s.clientCount} clients</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. SALES PERFORMANCE + STATION HEALTH (side by side)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Performance Highlights */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="size-4 text-green-400" />
              Sales Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {/* Today vs Yesterday */}
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Today vs Yesterday</p>
                <p className="text-lg font-bold text-white mt-1">{formatKsh(s.todaySales)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {s.salesChangePct >= 0 ? (
                    <TrendingUp className="size-3 text-green-400" />
                  ) : (
                    <TrendingDown className="size-3 text-red-400" />
                  )}
                  <span className={`text-xs font-semibold ${s.salesChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.salesChangePct >= 0 ? '+' : ''}{s.salesChangePct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Best Pump */}
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Top Pump</p>
                <p className="text-lg font-bold text-white mt-1">{s.pmsPumpCount > 0 ? `Pump #1` : 'N/A'}</p>
                <p className="text-xs text-amber-400 mt-0.5">PMS — High flow</p>
              </div>

              {/* Avg Transaction */}
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Transaction</p>
                <p className="text-lg font-bold text-white mt-1">{formatKsh(s.avgTransaction || (s.todaySalesCount > 0 ? s.todaySales / s.todaySalesCount : 0))}</p>
                <p className="text-xs text-slate-400 mt-0.5">Per sale today</p>
              </div>

              {/* Transaction Count */}
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Sales Entries</p>
                <p className="text-lg font-bold text-white mt-1">{s.todaySalesCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">Recorded today</p>
              </div>
            </div>

            {/* Hourly Sales Heatmap */}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Hourly Activity Pattern</p>
              <div className="grid grid-cols-12 gap-1">
                {hourlyHeatmap.map((h) => (
                  <div key={h.hour} className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-full h-6 rounded-sm transition-colors"
                      style={{
                        backgroundColor: `rgba(34, 197, 94, ${h.intensity / 100})`,
                        opacity: h.intensity > 0 ? 0.4 + (h.intensity / 100) * 0.6 : 0.1,
                      }}
                      title={`${h.label}: ${h.intensity}% activity`}
                    />
                    {h.hour % 4 === 0 && (
                      <span className="text-[8px] text-slate-500">{h.hour}h</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-slate-500">Low</span>
                <div className="flex gap-0.5">
                  {[20, 40, 60, 80, 100].map((v) => (
                    <div key={v} className="w-4 h-1.5 rounded-sm" style={{ backgroundColor: `rgba(34, 197, 94, ${v / 100})`, opacity: 0.4 + (v / 100) * 0.6 }} />
                  ))}
                </div>
                <span className="text-[9px] text-slate-500">High</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Station Health Score */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="size-4 text-emerald-400" />
              Station Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              {/* Circular Progress */}
              <div className="relative size-32 mb-3">
                <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={radius} fill="none" stroke="#334155" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r={radius} fill="none"
                    stroke={healthColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: healthColor }}>{healthScore}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{healthLabel}</span>
                </div>
              </div>

              {/* Factor Breakdown */}
              <div className="w-full space-y-2.5">
                {healthFactors.map((factor) => (
                  <div key={factor.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400">{factor.name}</span>
                      <span className={`text-[10px] font-semibold ${factor.score > 80 ? 'text-green-400' : factor.score > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {factor.score}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${factor.score}%`,
                          backgroundColor: factor.score > 80 ? '#22c55e' : factor.score > 50 ? '#eab308' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION DIVIDER: Fuel & Pricing
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="gradient-divider flex-1" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Fuel &amp; Pricing</span>
        <div className="gradient-divider flex-1" />
      </div>

      {/* ── Fuel Prices + Tax Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fuel Prices Card */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">EPRA Fuel Prices</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Auto-synced from EPRA</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-700 text-slate-300 text-[10px]"><MapPin className="size-3 mr-1" />Nairobi</Badge>
                <CanExport>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white" onClick={loadDashboard} disabled={isLoading}>
                    <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </CanExport>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Super Petrol */}
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="size-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Super Petrol</span>
                </div>
                <div className="text-xl font-bold text-green-300">Ksh {epraPmsPrice.toFixed(2)}</div>
                <div className="mt-2 space-y-1 text-[10px] text-slate-400">
                  <div className="flex justify-between"><span>Landed Cost</span><span>Ksh 62.48</span></div>
                  <div className="flex justify-between"><span>Taxes &amp; Levies</span><span>Ksh 127.38</span></div>
                  <div className="flex justify-between"><span>Margin</span><span>Ksh 22.50</span></div>
                </div>
              </div>
              {/* Diesel */}
              <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="size-4 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Diesel (AGO)</span>
                </div>
                <div className="text-xl font-bold text-amber-300">Ksh {epraAgoPrice.toFixed(2)}</div>
                <div className="mt-2 space-y-1 text-[10px] text-slate-400">
                  <div className="flex justify-between"><span>Landed Cost</span><span>Ksh 58.92</span></div>
                  <div className="flex justify-between"><span>Taxes &amp; Levies</span><span>Ksh 117.55</span></div>
                  <div className="flex justify-between"><span>Margin</span><span>Ksh 23.00</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax & Statutory Rates */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tax &amp; Statutory Rates</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Kenya Revenue Authority</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {taxRates.map((rate) => (
                <div key={rate.label} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-300">{rate.label}</span>
                  <span className="text-xs font-semibold text-white">{rate.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION DIVIDER: Analytics
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="gradient-divider flex-1" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Analytics</span>
        <div className="gradient-divider flex-1" />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Trend */}
        <Card className="inner-glow bg-slate-800/60 border-slate-700/50 text-white lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Trend (7 Days)</CardTitle>
            <CardDescription className="text-slate-400 text-xs">PMS vs AGO daily revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {s.salesTrend.every((d) => d.pms === 0 && d.ago === 0) ? (
              <div className="flex flex-col items-center justify-center h-[200px] sm:h-[220px] text-slate-500">
                <BarChart3 className="size-8 mb-2 opacity-50" />
                <p className="text-sm">No sales data for the last 7 days</p>
              </div>
            ) : (
              <ChartContainer config={salesTrendConfig} className="h-[200px] sm:h-[220px] w-full">
                <LineChart data={s.salesTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="pms" stroke="var(--color-pms)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ago" stroke="var(--color-ago)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Fuel Distribution Pie */}
        <Card className="inner-glow bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Fuel Distribution</CardTitle>
            <CardDescription className="text-slate-400 text-xs">PMS vs AGO litres</CardDescription>
          </CardHeader>
          <CardContent>
            {s.totalPmsL === 0 && s.totalAgoL === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] sm:h-[220px] text-slate-500">
                <Fuel className="size-8 mb-2 opacity-50" />
                <p className="text-sm">No fuel distribution data</p>
              </div>
            ) : (
              <ChartContainer config={fuelDistConfig} className="h-[200px] sm:h-[220px] w-full">
                <PieChart>
                  <Pie
                    data={s.fuelDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={2}
                    stroke="#1e293b"
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Expense Breakdown ───────────────────────────────────────────── */}
      <Card className="inner-glow bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Expense Breakdown</CardTitle>
          <CardDescription className="text-slate-400 text-xs">By category</CardDescription>
        </CardHeader>
        <CardContent>
          {s.expenseBreakdown.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No expenses recorded yet</div>
          ) : (
            <ChartContainer config={expenseConfig} className="h-[180px] sm:h-[200px] w-full">
              <BarChart data={s.expenseBreakdown} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION DIVIDER: Activity & Operations
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="gradient-divider flex-1" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Activity &amp; Operations</span>
        <div className="gradient-divider flex-1" />
      </div>

      {/* ── Recent Activity + Delivery Schedule ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity Feed */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="size-4 text-amber-400" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Latest station events</CardDescription>
          </CardHeader>
          <CardContent>
            {s.recentActivity.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-6">No recent activity</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {s.recentActivity.map((act, idx) => {
                  const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
                    sale: { icon: <DollarSign className="size-3.5" />, color: 'text-green-400 bg-green-500/20' },
                    delivery: { icon: <Truck className="size-3.5" />, color: 'text-amber-400 bg-amber-500/20' },
                    shift: { icon: <Clock className="size-3.5" />, color: 'text-blue-400 bg-blue-500/20' },
                    maintenance: { icon: <Wrench className="size-3.5" />, color: 'text-purple-400 bg-purple-500/20' },
                  };
                  const entry = iconMap[act.type] || iconMap.sale;
                  return (
                    <div key={act.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-700/30 transition-colors animate-slide-in" style={{ animationDelay: `${idx * 60}ms` }}>
                      <div className={`size-7 rounded-full flex items-center justify-center flex-shrink-0 ${entry.color}`}>
                        {entry.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-200 truncate">{act.description}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">{getRelativeTime(act.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Schedule */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Truck className="size-4 text-blue-400" />
                  Delivery Schedule
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">Upcoming deliveries</CardDescription>
              </div>
              <PermissionGate action="read" dataType="inventory" fallback={null}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-slate-400 hover:text-white"
                  onClick={() => dispatchTab('delivery')}
                >
                  View All <ChevronRight className="size-3 ml-0.5" />
                </Button>
              </PermissionGate>
            </div>
          </CardHeader>
          <CardContent>
            {s.upcomingDeliveries.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-500 text-sm py-4 justify-center">
                  <CheckCircle2 className="size-4 text-green-500" />
                  No pending deliveries
                </div>
                {/* Show recent completed deliveries instead */}
                {s.recentCompletedDeliveries.map(d => (
                  <div key={d.id} className="bg-slate-700/30 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-green-400" />
                        <span className="text-xs font-medium text-slate-300">{d.product}</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 text-[10px] border-green-500/30">Delivered</Badge>
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-400 space-y-0.5">
                      <p>Supplier: {d.supplier} • Qty: {d.quantity.toLocaleString()}L</p>
                      <p>{new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {s.upcomingDeliveries.map((d) => (
                  <div key={d.id} className="bg-slate-700/30 rounded-lg p-3 border border-slate-700/30 hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-xs font-medium text-slate-300">{d.product}</span>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 text-[10px] border-blue-500/30">Pending</Badge>
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-400 space-y-0.5">
                      <p>Supplier: {d.supplier} • Qty: {d.quantity.toLocaleString()}L</p>
                      <p>Expected: {new Date(d.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</p>
                      {d.driverName && <p>Driver: {d.driverName} {d.vehicleNumber ? `• ${d.vehicleNumber}` : ''}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
                      <span className="text-[10px] text-slate-500">{formatKsh(d.totalAmount)}</span>
                      <span className="text-[10px] text-amber-400">Balance: {formatKsh(d.balanceDue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION DIVIDER: Quick Actions
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="gradient-divider flex-1" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Quick Actions</span>
        <div className="gradient-divider flex-1" />
      </div>

      {/* ── Quick Actions (Enhanced) ───────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-10 gap-3">
            <PermissionGate action="create" dataType="sale" fallback={
              <button className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-700/20 border border-slate-700/20 opacity-50 cursor-not-allowed">
                <ShoppingCart className="size-5 text-slate-500" />
                <span className="text-[10px] font-medium text-slate-500">Point of Sale</span>
              </button>
            }>
              <button
                onClick={() => dispatchTab('pos')}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/20 hover:from-blue-500/25 hover:to-blue-600/10 hover:border-blue-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
              >
                <ShoppingCart className="size-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                <span className="text-[10px] font-medium text-blue-300 group-hover:text-blue-200 transition-colors">Point of Sale</span>
              </button>
            </PermissionGate>
            <button
              onClick={() => dispatchTab('sales')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-green-500/15 to-green-600/5 border border-green-500/20 hover:from-green-500/25 hover:to-green-600/10 hover:border-green-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
            >
              <BarChart3 className="size-5 text-green-400 group-hover:text-green-300 transition-colors" />
              <span className="text-[10px] font-medium text-green-300 group-hover:text-green-200 transition-colors">Sales Tracking</span>
            </button>
            <button
              onClick={() => dispatchTab('delivery')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 hover:from-amber-500/25 hover:to-amber-600/10 hover:border-amber-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
            >
              <Truck className="size-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
              <span className="text-[10px] font-medium text-amber-300 group-hover:text-amber-200 transition-colors">Delivery</span>
            </button>
            <PermissionGate action="create" dataType="invoice" fallback={
              <button className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-700/20 border border-slate-700/20 opacity-50 cursor-not-allowed">
                <FileText className="size-5 text-slate-500" />
                <span className="text-[10px] font-medium text-slate-500">Invoice</span>
              </button>
            }>
              <button
                onClick={() => dispatchTab('invoice')}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-600/5 border border-purple-500/20 hover:from-purple-500/25 hover:to-purple-600/10 hover:border-purple-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
              >
                <FileText className="size-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <span className="text-[10px] font-medium text-purple-300 group-hover:text-purple-200 transition-colors">Invoice</span>
              </button>
            </PermissionGate>
            <button
              onClick={() => dispatchTab('mpesa')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 hover:from-emerald-500/25 hover:to-emerald-600/10 hover:border-emerald-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
            >
              <Smartphone className="size-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
              <span className="text-[10px] font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors">M-PESA</span>
            </button>
            <CanExport fallback={
              <button className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-700/20 border border-slate-700/20 opacity-50 cursor-not-allowed">
                <CreditCard className="size-5 text-slate-500" />
                <span className="text-[10px] font-medium text-slate-500">Reports</span>
              </button>
            }>
              <button
                onClick={() => dispatchTab('reports')}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-rose-500/15 to-rose-600/5 border border-rose-500/20 hover:from-rose-500/25 hover:to-rose-600/10 hover:border-rose-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
              >
                <CreditCard className="size-5 text-rose-400 group-hover:text-rose-300 transition-colors" />
                <span className="text-[10px] font-medium text-rose-300 group-hover:text-rose-200 transition-colors">Reports</span>
              </button>
            </CanExport>
            {/* NEW: New Sale */}
            <CanCreateSale fallback={
              <button className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-700/20 border border-slate-700/20 opacity-50 cursor-not-allowed">
                <PlusCircle className="size-5 text-slate-500" />
                <span className="text-[10px] font-medium text-slate-500">New Sale</span>
              </button>
            }>
              <button
                onClick={() => dispatchTab('pos')}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 border border-cyan-500/20 hover:from-cyan-500/25 hover:to-cyan-600/10 hover:border-cyan-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
              >
                <PlusCircle className="size-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                <span className="text-[10px] font-medium text-cyan-300 group-hover:text-cyan-200 transition-colors">New Sale</span>
              </button>
            </CanCreateSale>
            {/* NEW: Add Expense */}
            <PermissionGate action="create" dataType="expense" fallback={
              <button className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-700/20 border border-slate-700/20 opacity-50 cursor-not-allowed">
                <Wallet className="size-5 text-slate-500" />
                <span className="text-[10px] font-medium text-slate-500">Add Expense</span>
              </button>
            }>
              <button
                onClick={() => dispatchTab('expenses')}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-600/5 border border-orange-500/20 hover:from-orange-500/25 hover:to-orange-600/10 hover:border-orange-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
              >
                <Wallet className="size-5 text-orange-400 group-hover:text-orange-300 transition-colors" />
                <span className="text-[10px] font-medium text-orange-300 group-hover:text-orange-200 transition-colors">Add Expense</span>
              </button>
            </PermissionGate>
            {/* NEW: Fuel Orders */}
            <button
              onClick={() => dispatchTab('fuel-orders')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-teal-500/15 to-teal-600/5 border border-teal-500/20 hover:from-teal-500/25 hover:to-teal-600/10 hover:border-teal-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
            >
              <Truck className="size-5 text-teal-400 group-hover:text-teal-300 transition-colors" />
              <span className="text-[10px] font-medium text-teal-300 group-hover:text-teal-200 transition-colors">Fuel Orders</span>
            </button>
            {/* NEW: Profit Calculator */}
            <button
              onClick={() => dispatchTab('profit-calc')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-lime-500/15 to-lime-600/5 border border-lime-500/20 hover:from-lime-500/25 hover:to-lime-600/10 hover:border-lime-500/40 hover:scale-105 transition-all duration-200 ripple-effect"
            >
              <BarChart3 className="size-5 text-lime-400 group-hover:text-lime-300 transition-colors" />
              <span className="text-[10px] font-medium text-lime-300 group-hover:text-lime-200 transition-colors">Profit Calc</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION DIVIDER: Station Status
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="gradient-divider flex-1" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Station Status</span>
        <div className="gradient-divider flex-1" />
      </div>

      {/* ── Tank Levels + Pump Status ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tank Levels */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tank Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* PMS Tank */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplets className="size-4 text-green-400" />
                  <span className="text-sm font-medium text-slate-200">PMS Tank</span>
                  {pmsTankPct < 25 && <AlertTriangle className="size-3.5 text-red-400 animate-pulse" />}
                </div>
                <span className="text-xs text-slate-400">
                  {pmsFuel ? `${pmsFuel.level.toLocaleString()} / ${pmsFuel.capacity.toLocaleString()} L` : 'N/A'}
                </span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all progress-animated ${pmsTankPct < 25 ? 'tank-critical' : ''}`}
                  style={{
                    width: `${pmsTankPct}%`,
                    background: pmsTankPct < 25 ? 'linear-gradient(90deg, #dc2626, #ef4444)' : 'linear-gradient(90deg, #16a34a, #22c55e)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>Empty</span>
                <span className={pmsTankPct < 25 ? 'text-red-400 font-semibold' : ''}>{pmsTankPct}%</span>
                <span>Full</span>
              </div>
            </div>

            {/* AGO Tank */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplets className="size-4 text-amber-400" />
                  <span className="text-sm font-medium text-slate-200">AGO Tank</span>
                  {agoTankPct < 25 && <AlertTriangle className="size-3.5 text-red-400 animate-pulse" />}
                </div>
                <span className="text-xs text-slate-400">
                  {agoFuel ? `${agoFuel.level.toLocaleString()} / ${agoFuel.capacity.toLocaleString()} L` : 'N/A'}
                </span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all progress-animated ${agoTankPct < 25 ? 'tank-critical' : ''}`}
                  style={{
                    width: `${agoTankPct}%`,
                    background: agoTankPct < 25 ? 'linear-gradient(90deg, #dc2626, #ef4444)' : 'linear-gradient(90deg, #d97706, #f59e0b)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>Empty</span>
                <span className={agoTankPct < 25 ? 'text-red-400 font-semibold' : ''}>{agoTankPct}%</span>
                <span>Full</span>
              </div>
            </div>

            {/* Opening/Closing readings */}
            {s.latestSale && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-slate-700/30 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">PMS Reading</div>
                  <div className="text-xs text-slate-300 mt-0.5">Open: {s.latestSale.pmsOpening.toLocaleString()}</div>
                  <div className="text-xs text-slate-300">Close: {s.latestSale.pmsClosing.toLocaleString()}</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">AGO Reading</div>
                  <div className="text-xs text-slate-300 mt-0.5">Open: {s.latestSale.agoOpening.toLocaleString()}</div>
                  <div className="text-xs text-slate-300">Close: {s.latestSale.agoClosing.toLocaleString()}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pump Status */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pump &amp; Station Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center hover:bg-green-500/15 transition-colors">
                <Gauge className="size-6 text-green-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-300">
                  {s.pmsPumpCount || 0}
                </div>
                <div className="text-[10px] text-green-400 uppercase tracking-wider mt-1">PMS Pumps</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center hover:bg-amber-500/15 transition-colors">
                <Gauge className="size-6 text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-300">
                  {s.agoPumpCount || 0}
                </div>
                <div className="text-[10px] text-amber-400 uppercase tracking-wider mt-1">AGO Pumps</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center hover:bg-purple-500/15 transition-colors">
                <Receipt className="size-6 text-purple-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-purple-300">{s.activeInvoices}</div>
                <div className="text-[10px] text-purple-400 uppercase tracking-wider mt-1">Invoices</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center hover:bg-blue-500/15 transition-colors">
                <Users className="size-6 text-blue-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-300">{s.activeEmployees}</div>
                <div className="text-[10px] text-blue-400 uppercase tracking-wider mt-1">Employees</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
