'use client';

import { useMemo, useState, useEffect } from 'react';
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
  Calendar,
  PlusCircle,
  Wallet,
  Activity,
  Zap,
  ChevronRight,
  Shield,
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
import { Progress } from '@/components/ui/progress';
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

// ─── Weather Mock Data ──────────────────────────────────────────────────────

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

function WeatherIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case 'sun':
      return <Sun className={className} />;
    case 'cloud-sun':
      return <div className="relative"><Sun className={className} /><Cloud className={`${className} absolute -bottom-1 -right-1 opacity-60`} style={{ width: '60%', height: '60%' }} /></div>;
    case 'cloud':
      return <Cloud className={className} />;
    case 'rain':
      return <CloudRain className={className} />;
    default:
      return <Sun className={className} />;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Dashboard() {
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const expenses = useFuelStore((s) => s.expenses);
  const clients = useFuelStore((s) => s.clients);
  const deliveries = useFuelStore((s) => s.deliveryData);
  const invoices = useFuelStore((s) => s.invoices);
  const employees = useFuelStore((s) => s.employees);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);
  const companyData = useFuelStore((s) => s.companyData);
  const shifts = useFuelStore((s) => s.shifts);
  const maintenance = useFuelStore((s) => s.maintenance);
  const suppliers = useFuelStore((s) => s.suppliers);

  // ─── Live clock ──────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ─── Derived data ──────────────────────────────────────────────────────

  const salesArr = useMemo(() => Object.values(salesHistory), [salesHistory]);
  const clientsArr = useMemo(() => Object.values(clients), [clients]);
  const deliveriesArr = useMemo(() => Object.values(deliveries), [deliveries]);
  const invoicesArr = useMemo(() => Object.values(invoices), [invoices]);

  // KPIs
  const totalRevenue = useMemo(
    () => salesArr.reduce((sum, s) => sum + s.totalSales, 0),
    [salesArr]
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(
    () => salesArr.filter((s) => s.date === todayStr).reduce((sum, s) => sum + s.totalSales, 0),
    [salesArr, todayStr]
  );

  // Yesterday sales
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
  const yesterdaySales = useMemo(
    () => salesArr.filter((s) => s.date === yesterdayStr).reduce((sum, s) => sum + s.totalSales, 0),
    [salesArr, yesterdayStr]
  );
  const salesChangePct = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales * 100) : 0;

  // This week sales
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weeklySales = useMemo(
    () => salesArr.filter((s) => s.date >= weekStartStr).reduce((sum, s) => sum + s.totalSales, 0),
    [salesArr, weekStartStr]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const netProfit = totalRevenue - totalExpenses;
  const profitUp = netProfit >= 0;

  const totalFuelL = useMemo(
    () => salesArr.reduce((sum, s) => sum + s.pmsSalesL + s.agoSalesL, 0),
    [salesArr]
  );

  const totalBalanceDue = useMemo(
    () => clientsArr.reduce((sum, c) => sum + c.balanceDue, 0),
    [clientsArr]
  );

  // Active employees on duty
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const openShifts = shifts.filter((s) => s.status === 'open').length;

  // Average transaction value (estimate: totalRevenue / totalFuelL for litres, or simple calculation)
  const avgTransaction = useMemo(() => {
    const todaySalesArr = salesArr.filter((s) => s.date === todayStr);
    const totalLitres = todaySalesArr.reduce((sum, s) => sum + s.pmsSalesL + s.agoSalesL, 0);
    if (totalLitres === 0) return 0;
    return todaySales / Math.max(totalLitres / 50, 1); // estimate ~50L per transaction
  }, [salesArr, todayStr, todaySales]);

  // ─── Charts data ───────────────────────────────────────────────────────

  const salesTrendData = useMemo(() => {
    const days: { date: string; pms: number; ago: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const daySales = salesArr.filter((s) => s.date === ds);
      days.push({
        date: d.toLocaleDateString('en-KE', { weekday: 'short' }),
        pms: daySales.reduce((sum, s) => sum + s.pmsSalesKsh, 0),
        ago: daySales.reduce((sum, s) => sum + s.agoSalesKsh, 0),
      });
    }
    return days;
  }, [salesArr]);

  const totalPms = useMemo(
    () => salesArr.reduce((sum, s) => sum + s.pmsSalesL, 0),
    [salesArr]
  );
  const totalAgo = useMemo(
    () => salesArr.reduce((sum, s) => sum + s.agoSalesL, 0),
    [salesArr]
  );
  const fuelDistData = useMemo(
    () => [
      { name: 'PMS', value: totalPms || 1 },
      { name: 'AGO', value: totalAgo || 1 },
    ],
    [totalPms, totalAgo]
  );

  const expenseBreakdown = useMemo(() => {
    const grouped: Record<string, number> = {};
    expenses.forEach((e) => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount;
    });
    return Object.entries(grouped).map(([cat, amt]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      amount: amt,
    }));
  }, [expenses]);

  // Tank levels
  const pmsFuel = fuelTypes.find((f) => f.name.toLowerCase().includes('pms') || f.name.toLowerCase().includes('petrol') || f.name.toLowerCase().includes('super'));
  const agoFuel = fuelTypes.find((f) => f.name.toLowerCase().includes('ago') || f.name.toLowerCase().includes('diesel'));

  const pmsTankPct = pmsFuel && pmsFuel.tankCapacity > 0
    ? Math.min(100, Math.round((pmsFuel.currentLevel / pmsFuel.tankCapacity) * 100))
    : 0;
  const agoTankPct = agoFuel && agoFuel.tankCapacity > 0
    ? Math.min(100, Math.round((agoFuel.currentLevel / agoFuel.tankCapacity) * 100))
    : 0;

  const activeInvoices = invoicesArr.filter((i) => i.status === 'pending' || i.status === 'overdue').length;

  // ─── Alerts ────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const items: { id: string; type: 'danger' | 'warning' | 'info'; title: string; desc: string; action: string; tab: string }[] = [];

    // Low tank alerts
    fuelTypes.forEach((ft) => {
      if (ft.tankCapacity > 0) {
        const pct = (ft.currentLevel / ft.tankCapacity) * 100;
        if (pct < 25) {
          items.push({
            id: `tank-${ft.id}`,
            type: pct < 10 ? 'danger' : 'warning',
            title: `Low Tank: ${ft.name}`,
            desc: `${ft.currentLevel.toLocaleString()}L remaining (${Math.round(pct)}%)`,
            action: 'View Inventory',
            tab: 'inventory',
          });
        }
      }
    });

    // Overdue invoices
    const overdueInvoices = invoicesArr.filter((i) => i.status === 'overdue');
    if (overdueInvoices.length > 0) {
      items.push({
        id: 'overdue-invoices',
        type: 'danger',
        title: `${overdueInvoices.length} Overdue Invoice${overdueInvoices.length > 1 ? 's' : ''}`,
        desc: `Total: ${formatKsh(overdueInvoices.reduce((s, i) => s + i.totalAmount, 0))}`,
        action: 'View Invoices',
        tab: 'invoice',
      });
    }

    // Pending deliveries
    const pendingDeliveries = deliveriesArr.filter((d) => d.status === 'pending');
    if (pendingDeliveries.length > 0) {
      items.push({
        id: 'pending-deliveries',
        type: 'info',
        title: `${pendingDeliveries.length} Pending Deliver${pendingDeliveries.length > 1 ? 'ies' : 'y'}`,
        desc: 'Awaiting fuel delivery confirmation',
        action: 'Track Delivery',
        tab: 'delivery',
      });
    }

    // Unresolved maintenance
    const unresolvedMaintenance = maintenance.filter((m) => m.status === 'scheduled' || m.status === 'in-progress');
    if (unresolvedMaintenance.length > 0) {
      items.push({
        id: 'unresolved-maintenance',
        type: 'warning',
        title: `${unresolvedMaintenance.length} Open Maintenance Item${unresolvedMaintenance.length > 1 ? 's' : ''}`,
        desc: 'Requires attention',
        action: 'View Maintenance',
        tab: 'maintenance',
      });
    }

    return items;
  }, [fuelTypes, invoicesArr, deliveriesArr, maintenance]);

  // ─── Activity Feed ─────────────────────────────────────────────────────
  const activityFeed = useMemo(() => {
    const activities: { id: string; icon: React.ReactNode; color: string; desc: string; time: string }[] = [];

    // Recent sales
    salesArr.slice(-3).reverse().forEach((s) => {
      activities.push({
        id: `sale-${s.id}`,
        icon: <DollarSign className="size-3.5" />,
        color: 'text-green-400 bg-green-500/20',
        desc: `Sale recorded: ${formatKsh(s.totalSales)}`,
        time: getRelativeTime(s.createdAt),
      });
    });

    // Recent deliveries
    deliveriesArr.slice(-2).reverse().forEach((d) => {
      activities.push({
        id: `delivery-${d.id}`,
        icon: <Truck className="size-3.5" />,
        color: 'text-amber-400 bg-amber-500/20',
        desc: `Delivery: ${d.quantity.toLocaleString()}L ${d.product} from ${d.supplier}`,
        time: getRelativeTime(d.createdAt),
      });
    });

    // Recent shifts
    shifts.slice(-2).reverse().forEach((s) => {
      activities.push({
        id: `shift-${s.id}`,
        icon: <Clock className="size-3.5" />,
        color: 'text-blue-400 bg-blue-500/20',
        desc: `Shift ${s.status}: ${s.attendantName}`,
        time: getRelativeTime(s.createdAt),
      });
    });

    // Recent maintenance
    maintenance.slice(-1).forEach((m) => {
      activities.push({
        id: `maint-${m.id}`,
        icon: <Wrench className="size-3.5" />,
        color: 'text-purple-400 bg-purple-500/20',
        desc: `Maintenance: ${m.equipment} - ${m.status}`,
        time: getRelativeTime(m.createdAt),
      });
    });

    // Sort by most recent (approximation using createdAt)
    return activities.slice(0, 8);
  }, [salesArr, deliveriesArr, shifts, maintenance]);

  // ─── Hourly Sales Heatmap ──────────────────────────────────────────────
  const hourlyHeatmap = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => {
      // Simulate realistic fuel station traffic pattern
      let intensity = 0;
      if (h >= 6 && h <= 9) intensity = 60 + Math.random() * 40; // Morning rush
      else if (h >= 11 && h <= 13) intensity = 40 + Math.random() * 30; // Lunch
      else if (h >= 17 && h <= 19) intensity = 70 + Math.random() * 30; // Evening rush
      else if (h >= 0 && h <= 5) intensity = Math.random() * 10; // Night
      else intensity = 20 + Math.random() * 25; // Regular
      return { hour: h, label: `${h.toString().padStart(2, '0')}:00`, intensity: Math.round(intensity) };
    });
    return hours;
  }, []);

  // ─── Upcoming Deliveries ───────────────────────────────────────────────
  const upcomingDeliveries = useMemo(() => {
    return deliveriesArr
      .filter((d) => d.status === 'pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [deliveriesArr]);

  // ─── Station Health Score ──────────────────────────────────────────────
  const healthScore = useMemo(() => {
    let score = 100;
    const factors: { name: string; score: number; weight: number }[] = [];

    // Tank levels factor (30% weight)
    const tankScores = fuelTypes.map((ft) => {
      if (ft.tankCapacity === 0) return 100;
      return Math.min(100, (ft.currentLevel / ft.tankCapacity) * 100);
    });
    const avgTank = tankScores.length > 0 ? tankScores.reduce((a, b) => a + b, 0) / tankScores.length : 100;
    factors.push({ name: 'Tank Levels', score: Math.round(avgTank), weight: 30 });

    // Maintenance factor (25% weight)
    const unresolvedMaint = maintenance.filter((m) => m.status !== 'completed' && m.status !== 'cancelled').length;
    const maintScore = Math.max(0, 100 - unresolvedMaint * 15);
    factors.push({ name: 'Maintenance', score: Math.round(maintScore), weight: 25 });

    // Invoices factor (25% weight)
    const overdueInvoices = invoicesArr.filter((i) => i.status === 'overdue').length;
    const invoiceScore = Math.max(0, 100 - overdueInvoices * 20);
    factors.push({ name: 'Invoices', score: Math.round(invoiceScore), weight: 25 });

    // Staffing factor (20% weight)
    const staffScore = activeEmployees > 0 ? Math.min(100, (activeEmployees / Math.max(employees.length, 1)) * 100) : 0;
    factors.push({ name: 'Staffing', score: Math.round(staffScore), weight: 20 });

    // Weighted total
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    score = factors.reduce((s, f) => s + (f.score * f.weight) / totalWeight, 0);

    return { score: Math.round(score), factors };
  }, [fuelTypes, maintenance, invoicesArr, activeEmployees, employees.length]);

  const healthColor = healthScore.score > 80 ? '#22c55e' : healthScore.score > 50 ? '#eab308' : '#ef4444';
  const healthLabel = healthScore.score > 80 ? 'Excellent' : healthScore.score > 50 ? 'Fair' : 'Critical';

  // ─── Quick action dispatch ─────────────────────────────────────────────

  const dispatchTab = (tabId: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('changeTab', { detail: tabId }));
    }
  };

  // ─── Mock EPRA prices ──────────────────────────────────────────────────

  const epraPmsPrice = pmsPrice || 212.36;
  const epraAgoPrice = agoPrice || 199.47;

  // ─── Tax rates (mock Kenya) ────────────────────────────────────────────

  const taxRates = [
    { label: 'VAT Rate', value: '16%' },
    { label: 'NSSF Employee', value: '6%' },
    { label: 'NSSF Employer', value: '6%' },
    { label: 'Housing Levy', value: '1.5%' },
    { label: 'Excise Duty', value: 'Ksh 21.95/L' },
    { label: 'Min Wage', value: 'Ksh 15,201' },
  ];

  // ─── SVG circular progress for health score ───────────────────────────
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore.score / 100) * circumference;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════════════════
          1. WELCOME HEADER
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-6">
        {/* Subtle decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-green-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {getGreeting()} 👋
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                {companyData.name || 'FuelPro Station'} — {now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} EAT
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                <DollarSign className="size-4 text-green-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Today&apos;s Sales</p>
                  <p className="text-sm font-bold text-white">{formatKsh(todaySales)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                <TrendingUp className="size-4 text-amber-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">This Week</p>
                  <p className="text-sm font-bold text-white">{formatKsh(weeklySales)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                <Gauge className="size-4 text-blue-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Pumps</p>
                  <p className="text-sm font-bold text-white">{fuelTypes.filter((f) => f.category === 'fuel').length || 2}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                <Users className="size-4 text-purple-400" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">On Duty</p>
                  <p className="text-sm font-bold text-white">{openShifts || activeEmployees}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. WEATHER WIDGET + ALERTS (side by side)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weather Widget */}
        <Card className="bg-gradient-to-br from-sky-900/80 via-slate-800/60 to-slate-900/80 border-slate-700/50 text-white backdrop-blur-sm lg:col-span-1">
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
              {alerts.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-2">{alerts.length} Alert{alerts.length > 1 ? 's' : ''}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-slate-500">
                <CheckCircle2 className="size-5 text-green-500" />
                <span className="text-sm">All systems operational. No alerts.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {alerts.map((alert) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden group hover:border-green-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Revenue</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatKsh(totalRevenue)}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="size-3 text-green-400" />
              <span className="text-xs text-green-400">{formatKsh(todaySales)} today</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Net Profit</CardDescription>
              <div className={`size-8 rounded-lg flex items-center justify-center ${profitUp ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {profitUp ? <TrendingUp className="size-4 text-green-400" /> : <TrendingDown className="size-4 text-red-400" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatKsh(netProfit)}</div>
            <div className="text-xs text-slate-400 mt-1">Expenses: {formatKsh(totalExpenses)}</div>
          </CardContent>
        </Card>

        {/* Fuel Sold */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Fuel Sold (L)</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{totalFuelL.toLocaleString()} L</div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-green-400">PMS @{pmsPrice || 0}</span>
              <span className="text-amber-400">AGO @{agoPrice || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Balance Due */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white relative overflow-hidden group hover:border-red-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="pb-2 relative z-10">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Balance Due</CardDescription>
              <div className={`size-8 rounded-lg flex items-center justify-center ${totalBalanceDue > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                {totalBalanceDue > 0 ? <AlertCircle className="size-4 text-red-400" /> : <DollarSign className="size-4 text-green-400" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatKsh(totalBalanceDue)}</div>
            <div className="flex items-center gap-1 mt-1">
              {totalBalanceDue > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>}
              <span className="text-xs text-slate-400">{clientsArr.length} clients</span>
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
                <p className="text-lg font-bold text-white mt-1">{formatKsh(todaySales)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {salesChangePct >= 0 ? (
                    <TrendingUp className="size-3 text-green-400" />
                  ) : (
                    <TrendingDown className="size-3 text-red-400" />
                  )}
                  <span className={`text-xs font-semibold ${salesChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {salesChangePct >= 0 ? '+' : ''}{salesChangePct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Best Pump */}
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Top Pump</p>
                <p className="text-lg font-bold text-white mt-1">Pump #1</p>
                <p className="text-xs text-amber-400 mt-0.5">PMS — High flow</p>
              </div>

              {/* Avg Transaction */}
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Transaction</p>
                <p className="text-lg font-bold text-white mt-1">{formatKsh(avgTransaction || Math.round(todaySales / Math.max(salesArr.filter(s => s.date === todayStr).length, 1)))}</p>
                <p className="text-xs text-slate-400 mt-0.5">Per sale today</p>
              </div>

              {/* Transaction Count */}
              <div className="bg-slate-700/40 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Sales Entries</p>
                <p className="text-lg font-bold text-white mt-1">{salesArr.filter(s => s.date === todayStr).length}</p>
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
                  <span className="text-3xl font-bold" style={{ color: healthColor }}>{healthScore.score}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{healthLabel}</span>
                </div>
              </div>

              {/* Factor Breakdown */}
              <div className="w-full space-y-2.5">
                {healthScore.factors.map((factor) => (
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
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Fuel &amp; Pricing</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
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
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                  <RefreshCw className="size-3.5" />
                </Button>
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
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Analytics</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Trend */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Trend (7 Days)</CardTitle>
            <CardDescription className="text-slate-400 text-xs">PMS vs AGO daily revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesTrendConfig} className="h-[200px] sm:h-[220px] w-full">
              <LineChart data={salesTrendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="pms" stroke="var(--color-pms)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ago" stroke="var(--color-ago)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Fuel Distribution Pie */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Fuel Distribution</CardTitle>
            <CardDescription className="text-slate-400 text-xs">PMS vs AGO litres</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={fuelDistConfig} className="h-[200px] sm:h-[220px] w-full">
              <PieChart>
                <Pie
                  data={fuelDistData}
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
          </CardContent>
        </Card>
      </div>

      {/* ── Expense Breakdown ───────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Expense Breakdown</CardTitle>
          <CardDescription className="text-slate-400 text-xs">By category</CardDescription>
        </CardHeader>
        <CardContent>
          {expenseBreakdown.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No expenses recorded yet</div>
          ) : (
            <ChartContainer config={expenseConfig} className="h-[180px] sm:h-[200px] w-full">
              <BarChart data={expenseBreakdown} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
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
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Activity &amp; Operations</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
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
            {activityFeed.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-6">No recent activity</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {activityFeed.map((act) => (
                  <div key={act.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <div className={`size-7 rounded-full flex items-center justify-center flex-shrink-0 ${act.color}`}>
                      {act.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-200 truncate">{act.desc}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 flex-shrink-0 whitespace-nowrap">{act.time}</span>
                  </div>
                ))}
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
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-slate-400 hover:text-white"
                onClick={() => dispatchTab('delivery')}
              >
                View All <ChevronRight className="size-3 ml-0.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDeliveries.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-500 text-sm py-4 justify-center">
                  <CheckCircle2 className="size-4 text-green-500" />
                  No pending deliveries
                </div>
                {/* Show recent completed deliveries instead */}
                {deliveriesArr.filter(d => d.status === 'delivered').slice(-2).map(d => (
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
                {upcomingDeliveries.map((d) => {
                  const supplierMatch = suppliers.find(s => s.name === d.supplier);
                  return (
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
                        {supplierMatch?.phone && <p>Contact: {supplierMatch.phone}</p>}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
                        <span className="text-[10px] text-slate-500">{formatKsh(d.totalAmount)}</span>
                        <span className="text-[10px] text-amber-400">Balance: {formatKsh(d.balanceDue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION DIVIDER: Quick Actions
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Quick Actions</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* ── Quick Actions (Enhanced) ───────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <button
              onClick={() => dispatchTab('pos')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/20 hover:from-blue-500/25 hover:to-blue-600/10 hover:border-blue-500/40 hover:scale-105 transition-all duration-200"
            >
              <ShoppingCart className="size-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-[10px] font-medium text-blue-300 group-hover:text-blue-200 transition-colors">Point of Sale</span>
            </button>
            <button
              onClick={() => dispatchTab('sales')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-green-500/15 to-green-600/5 border border-green-500/20 hover:from-green-500/25 hover:to-green-600/10 hover:border-green-500/40 hover:scale-105 transition-all duration-200"
            >
              <BarChart3 className="size-5 text-green-400 group-hover:text-green-300 transition-colors" />
              <span className="text-[10px] font-medium text-green-300 group-hover:text-green-200 transition-colors">Sales Tracking</span>
            </button>
            <button
              onClick={() => dispatchTab('delivery')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 hover:from-amber-500/25 hover:to-amber-600/10 hover:border-amber-500/40 hover:scale-105 transition-all duration-200"
            >
              <Truck className="size-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
              <span className="text-[10px] font-medium text-amber-300 group-hover:text-amber-200 transition-colors">Delivery</span>
            </button>
            <button
              onClick={() => dispatchTab('invoice')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-600/5 border border-purple-500/20 hover:from-purple-500/25 hover:to-purple-600/10 hover:border-purple-500/40 hover:scale-105 transition-all duration-200"
            >
              <FileText className="size-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              <span className="text-[10px] font-medium text-purple-300 group-hover:text-purple-200 transition-colors">Invoice</span>
            </button>
            <button
              onClick={() => dispatchTab('mpesa')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 hover:from-emerald-500/25 hover:to-emerald-600/10 hover:border-emerald-500/40 hover:scale-105 transition-all duration-200"
            >
              <Smartphone className="size-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
              <span className="text-[10px] font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors">M-PESA</span>
            </button>
            <button
              onClick={() => dispatchTab('reports')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-rose-500/15 to-rose-600/5 border border-rose-500/20 hover:from-rose-500/25 hover:to-rose-600/10 hover:border-rose-500/40 hover:scale-105 transition-all duration-200"
            >
              <CreditCard className="size-5 text-rose-400 group-hover:text-rose-300 transition-colors" />
              <span className="text-[10px] font-medium text-rose-300 group-hover:text-rose-200 transition-colors">Reports</span>
            </button>
            {/* NEW: New Sale */}
            <button
              onClick={() => dispatchTab('pos')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 border border-cyan-500/20 hover:from-cyan-500/25 hover:to-cyan-600/10 hover:border-cyan-500/40 hover:scale-105 transition-all duration-200"
            >
              <PlusCircle className="size-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <span className="text-[10px] font-medium text-cyan-300 group-hover:text-cyan-200 transition-colors">New Sale</span>
            </button>
            {/* NEW: Add Expense */}
            <button
              onClick={() => dispatchTab('expenses')}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-600/5 border border-orange-500/20 hover:from-orange-500/25 hover:to-orange-600/10 hover:border-orange-500/40 hover:scale-105 transition-all duration-200"
            >
              <Wallet className="size-5 text-orange-400 group-hover:text-orange-300 transition-colors" />
              <span className="text-[10px] font-medium text-orange-300 group-hover:text-orange-200 transition-colors">Add Expense</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION DIVIDER: Station Status
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Station Status</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
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
                </div>
                <span className="text-xs text-slate-400">
                  {pmsFuel ? `${pmsFuel.currentLevel.toLocaleString()} / ${pmsFuel.tankCapacity.toLocaleString()} L` : 'N/A'}
                </span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pmsTankPct}%`,
                    background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>Empty</span>
                <span>{pmsTankPct}%</span>
                <span>Full</span>
              </div>
            </div>

            {/* AGO Tank */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplets className="size-4 text-amber-400" />
                  <span className="text-sm font-medium text-slate-200">AGO Tank</span>
                </div>
                <span className="text-xs text-slate-400">
                  {agoFuel ? `${agoFuel.currentLevel.toLocaleString()} / ${agoFuel.tankCapacity.toLocaleString()} L` : 'N/A'}
                </span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${agoTankPct}%`,
                    background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>Empty</span>
                <span>{agoTankPct}%</span>
                <span>Full</span>
              </div>
            </div>

            {/* Opening/Closing readings */}
            {salesArr.length > 0 && (() => {
              const latest = salesArr[salesArr.length - 1];
              return (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-slate-700/30 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">PMS Reading</div>
                    <div className="text-xs text-slate-300 mt-0.5">Open: {latest.pmsOpeningReading.toLocaleString()}</div>
                    <div className="text-xs text-slate-300">Close: {latest.pmsClosingReading.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-2">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">AGO Reading</div>
                    <div className="text-xs text-slate-300 mt-0.5">Open: {latest.agoOpeningReading.toLocaleString()}</div>
                    <div className="text-xs text-slate-300">Close: {latest.agoClosingReading.toLocaleString()}</div>
                  </div>
                </div>
              );
            })()}
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
                  {fuelTypes.filter((f) => f.name.toLowerCase().includes('pms') || f.name.toLowerCase().includes('petrol')).length || 2}
                </div>
                <div className="text-[10px] text-green-400 uppercase tracking-wider mt-1">PMS Pumps</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center hover:bg-amber-500/15 transition-colors">
                <Gauge className="size-6 text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-300">
                  {fuelTypes.filter((f) => f.name.toLowerCase().includes('ago') || f.name.toLowerCase().includes('diesel')).length || 2}
                </div>
                <div className="text-[10px] text-amber-400 uppercase tracking-wider mt-1">AGO Pumps</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center hover:bg-purple-500/15 transition-colors">
                <Receipt className="size-6 text-purple-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-purple-300">{activeInvoices}</div>
                <div className="text-[10px] text-purple-400 uppercase tracking-wider mt-1">Invoices</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center hover:bg-blue-500/15 transition-colors">
                <Users className="size-6 text-blue-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-300">{activeEmployees}</div>
                <div className="text-[10px] text-blue-400 uppercase tracking-wider mt-1">Employees</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
