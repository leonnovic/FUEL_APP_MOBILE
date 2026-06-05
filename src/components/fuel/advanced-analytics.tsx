'use client';

import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  Zap,
  Target,
  Clock,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Gauge,
  Percent,
  Fuel,
  ShoppingCart,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useFuelStore } from '@/store/fuel-store';

// ─── Chart configs ──────────────────────────────────────────────────────────

const revenueTrendConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: '#22c55e' },
  movingAvg: { label: '7-Day MA', color: '#f59e0b' },
};

const consumptionConfig: ChartConfig = {
  pms: { label: 'PMS (L)', color: '#22c55e' },
  ago: { label: 'AGO (L)', color: '#f59e0b' },
};

const efficiencyConfig: ChartConfig = {
  revenuePerLitre: { label: 'Rev/Litre (Ksh)', color: '#a855f7' },
};

const profitabilityConfig: ChartConfig = {
  grossMargin: { label: 'Gross Margin %', color: '#22c55e' },
  operatingMargin: { label: 'Operating Margin %', color: '#f59e0b' },
  netMargin: { label: 'Net Margin %', color: '#ef4444' },
};

const salesByDayConfig: ChartConfig = {
  sales: { label: 'Avg Sales (Ksh)', color: '#3b82f6' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPct(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AdvancedAnalytics() {
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const expenses = useFuelStore((s) => s.expenses);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const clients = useFuelStore((s) => s.clients);

  const salesArr = useMemo(() => Object.values(salesHistory), [salesHistory]);
  const clientsArr = useMemo(() => Object.values(clients), [clients]);

  // ─── 30-Day Revenue Trend ──────────────────────────────────────────────

  const revenueTrendData = useMemo(() => {
    const days: { date: string; revenue: number; movingAvg: number; rawRevenue: number }[] = [];
    const revenues: number[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const daySales = salesArr.filter((s) => s.date === ds);
      const dayRevenue = daySales.reduce((sum, s) => sum + s.totalSales, 0);
      revenues.push(dayRevenue);
    }

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const ds = d.toISOString().slice(0, 10);
      const daySales = salesArr.filter((s) => s.date === ds);
      const dayRevenue = daySales.reduce((sum, s) => sum + s.totalSales, 0);

      // 7-day moving average
      const windowStart = Math.max(0, i - 6);
      const window = revenues.slice(windowStart, i + 1);
      const avg = window.length > 0 ? window.reduce((a, b) => a + b, 0) / window.length : 0;

      days.push({
        date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        movingAvg: Math.round(avg),
        rawRevenue: dayRevenue,
      });
    }

    return days;
  }, [salesArr]);

  // ─── Month-over-Month Growth ────────────────────────────────────────────

  const momGrowth = useMemo(() => {
    const now = new Date();
    const thisMonth = salesArr
      .filter((s) => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, s) => sum + s.totalSales, 0);

    const lastMonth = salesArr
      .filter((s) => {
        const d = new Date(s.date);
        const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lm && d.getFullYear() === ly;
      })
      .reduce((sum, s) => sum + s.totalSales, 0);

    if (lastMonth === 0) return 0;
    return ((thisMonth - lastMonth) / lastMonth) * 100;
  }, [salesArr]);

  // ─── Fuel Consumption Analytics ─────────────────────────────────────────

  const consumptionData = useMemo(() => {
    const days: { date: string; pms: number; ago: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const daySales = salesArr.filter((s) => s.date === ds);
      days.push({
        date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        pms: daySales.reduce((sum, s) => sum + s.pmsSalesL, 0),
        ago: daySales.reduce((sum, s) => sum + s.agoSalesL, 0),
      });
    }
    return days;
  }, [salesArr]);

  // ─── Efficiency Metrics (Revenue per litre) ─────────────────────────────

  const efficiencyData = useMemo(() => {
    const days: { date: string; revenuePerLitre: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const daySales = salesArr.filter((s) => s.date === ds);
      const totalRev = daySales.reduce((sum, s) => sum + s.totalSales, 0);
      const totalL = daySales.reduce((sum, s) => sum + s.pmsSalesL + s.agoSalesL, 0);
      days.push({
        date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        revenuePerLitre: totalL > 0 ? Math.round(totalRev / totalL) : 0,
      });
    }
    return days;
  }, [salesArr]);

  // ─── Profitability Analysis ─────────────────────────────────────────────

  const profitabilityData = useMemo(() => {
    const days: { date: string; grossMargin: number; operatingMargin: number; netMargin: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const daySales = salesArr.filter((s) => s.date === ds);
      const dayExpenses = expenses.filter((e) => e.date === ds);
      const daySaleExpenses = daySales.reduce((sum, s) => sum + (s.expenses || 0), 0);

      const revenue = daySales.reduce((sum, s) => sum + s.totalSales, 0);
      const cogs = revenue * 0.65; // estimated 65% cost of goods
      const operatingExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0) + daySaleExpenses;

      const grossMargin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;
      const operatingMargin = revenue > 0 ? ((revenue - cogs - operatingExpenses) / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? ((revenue - cogs - operatingExpenses) / revenue) * 100 : 0;

      days.push({
        date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        grossMargin: Math.round(grossMargin * 10) / 10,
        operatingMargin: Math.round(operatingMargin * 10) / 10,
        netMargin: Math.round(netMargin * 10) / 10,
      });
    }
    return days;
  }, [salesArr, expenses]);

  // ─── Sales Performance ──────────────────────────────────────────────────

  const salesByDayOfWeek = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];

    salesArr.forEach((s) => {
      const d = new Date(s.date).getDay();
      dayTotals[d] += s.totalSales;
      dayCounts[d]++;
    });

    return dayNames.map((name, i) => ({
      day: name,
      sales: dayCounts[i] > 0 ? Math.round(dayTotals[i] / dayCounts[i]) : 0,
      total: dayTotals[i],
    }));
  }, [salesArr]);

  const bestDay = useMemo(() => {
    const sorted = [...salesByDayOfWeek].sort((a, b) => b.sales - a.sales);
    return sorted[0];
  }, [salesByDayOfWeek]);

  const avgDailySales = useMemo(() => {
    const total = salesArr.reduce((sum, s) => sum + s.totalSales, 0);
    const uniqueDays = new Set(salesArr.map((s) => s.date)).size;
    return uniqueDays > 0 ? total / uniqueDays : 0;
  }, [salesArr]);

  // ─── Predictive Insights (Simple linear regression) ─────────────────────

  const predictedRevenue = useMemo(() => {
    const last7 = revenueTrendData.slice(-7);
    if (last7.length < 2) return 0;

    // Linear regression: y = mx + b
    const n = last7.length;
    const xMean = (n - 1) / 2;
    const yMean = last7.reduce((sum, d) => sum + d.revenue, 0) / n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (last7[i].revenue - yMean);
      den += (i - xMean) * (i - xMean);
    }

    if (den === 0) return yMean;
    const m = num / den;
    const b = yMean - m * xMean;
    const predicted = m * n + b;

    return Math.max(0, Math.round(predicted));
  }, [revenueTrendData]);

  // ─── Key Metrics ────────────────────────────────────────────────────────

  const totalRevenue = useMemo(() => salesArr.reduce((sum, s) => sum + s.totalSales, 0), [salesArr]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

  const totalFuelL = useMemo(() => salesArr.reduce((sum, s) => sum + s.pmsSalesL + s.agoSalesL, 0), [salesArr]);
  const fuelEfficiency = totalFuelL > 0 ? totalRevenue / totalFuelL : 0;

  const clientAcquisitionRate = useMemo(() => {
    if (clientsArr.length === 0) return 0;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const newClients = clientsArr.filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    return newClients;
  }, [clientsArr]);

  // Overall margin
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalRevenue * 0.65) / totalRevenue) * 100 : 0;
  const operatingMargin = totalRevenue > 0 ? ((totalRevenue - totalRevenue * 0.65 - totalExpenses) / totalRevenue) * 100 : 0;
  const netMargin = operatingMargin;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Key Metrics Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="size-4 text-green-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Revenue Growth</span>
            </div>
            <div className="text-xl font-bold">{formatPct(momGrowth)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Month-over-month</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Percent className="size-4 text-red-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Expense Ratio</span>
            </div>
            <div className="text-xl font-bold">{expenseRatio.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-500 mt-1">Of total revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-amber-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Fuel Efficiency</span>
            </div>
            <div className="text-xl font-bold">{fuelEfficiency.toFixed(0)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Ksh per litre</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ShoppingCart className="size-4 text-purple-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">New Clients</span>
            </div>
            <div className="text-xl font-bold">{clientAcquisitionRate}</div>
            <div className="text-[10px] text-slate-500 mt-1">This month</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue Trend (30-day) ──────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Revenue Trend (30 Days)</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Daily revenue with 7-day moving average</CardDescription>
            </div>
            <Badge className={`text-xs ${momGrowth >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {momGrowth >= 0 ? <ArrowUpRight className="size-3 mr-1" /> : <ArrowDownRight className="size-3 mr-1" />}
              {formatPct(momGrowth)} MoM
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueTrendConfig} className="h-[260px] w-full">
            <AreaChart data={revenueTrendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} interval={4} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="movingAvg" stroke="var(--color-movingAvg)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ── Fuel Consumption + Efficiency Row ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Consumption Trends */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Fuel Consumption (14 Days)</CardTitle>
            <CardDescription className="text-slate-400 text-xs">PMS vs AGO daily litres</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={consumptionConfig} className="h-[220px] w-full">
              <BarChart data={consumptionData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="pms" fill="var(--color-pms)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ago" fill="var(--color-ago)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Per Litre */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Efficiency</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Revenue per litre over 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={efficiencyConfig} className="h-[220px] w-full">
              <LineChart data={efficiencyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="revenuePerLitre" stroke="var(--color-revenuePerLitre)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-revenuePerLitre)' }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Profitability Analysis ──────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Profitability Analysis (14 Days)</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Gross, Operating &amp; Net margin trends</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-slate-400">Gross {grossMargin.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-amber-500" />
                <span className="text-[10px] text-slate-400">Operating {operatingMargin.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-red-500" />
                <span className="text-[10px] text-slate-400">Net {netMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={profitabilityConfig} className="h-[220px] w-full">
            <LineChart data={profitabilityData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v: number) => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="grossMargin" stroke="var(--color-grossMargin)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="operatingMargin" stroke="var(--color-operatingMargin)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="netMargin" stroke="var(--color-netMargin)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ── Sales Performance + Predictive Insights Row ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Performance */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Performance</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Average sales by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesByDayConfig} className="h-[200px] w-full">
              <BarChart data={salesByDayOfWeek} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="size-3.5 text-green-400" />
                  <span className="text-[10px] text-slate-400 uppercase">Best Day</span>
                </div>
                <div className="text-sm font-bold text-green-300">{bestDay?.day || 'N/A'}</div>
                <div className="text-[10px] text-slate-500">{bestDay ? formatKsh(bestDay.sales) + ' avg' : ''}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="size-3.5 text-amber-400" />
                  <span className="text-[10px] text-slate-400 uppercase">Peak Hour</span>
                </div>
                <div className="text-sm font-bold text-amber-300">7-9 AM</div>
                <div className="text-[10px] text-slate-500">Morning rush</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="size-3.5 text-purple-400" />
                  <span className="text-[10px] text-slate-400 uppercase">Avg Daily</span>
                </div>
                <div className="text-sm font-bold text-purple-300">{formatKsh(avgDailySales)}</div>
                <div className="text-[10px] text-slate-500">Per operating day</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="size-3.5 text-red-400" />
                  <span className="text-[10px] text-slate-400 uppercase">Peak Period</span>
                </div>
                <div className="text-sm font-bold text-red-300">Weekdays</div>
                <div className="text-[10px] text-slate-500">Higher volume</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Predictive Insights */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white border-amber-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Brain className="size-4 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Predictive Insights</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Based on recent trends</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tomorrow's Prediction */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-amber-300 uppercase tracking-wider font-medium">Expected Revenue Tomorrow</span>
                <Target className="size-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300">{formatKsh(predictedRevenue)}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Based on 7-day linear regression trend
              </div>
            </div>

            {/* Trend Indicators */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Gauge className="size-4 text-green-400" />
                  <span className="text-xs text-slate-300">Revenue Trajectory</span>
                </div>
                <Badge className={`text-[10px] ${momGrowth >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {momGrowth >= 0 ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
                  {momGrowth >= 0 ? 'Upward' : 'Downward'}
                </Badge>
              </div>

              <div className="flex items-center justify-between bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-amber-400" />
                  <span className="text-xs text-slate-300">Profitability</span>
                </div>
                <Badge className={`text-[10px] ${netMargin > 10 ? 'bg-green-500/20 text-green-400' : netMargin > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                  {netMargin > 10 ? 'Healthy' : netMargin > 0 ? 'Marginal' : 'At Risk'}
                </Badge>
              </div>

              <div className="flex items-center justify-between bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-purple-400" />
                  <span className="text-xs text-slate-300">Expense Control</span>
                </div>
                <Badge className={`text-[10px] ${expenseRatio < 30 ? 'bg-green-500/20 text-green-400' : expenseRatio < 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                  {expenseRatio < 30 ? 'Good' : expenseRatio < 50 ? 'Moderate' : 'High'}
                </Badge>
              </div>

              <div className="flex items-center justify-between bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Fuel className="size-4 text-blue-400" />
                  <span className="text-xs text-slate-300">Fuel Efficiency</span>
                </div>
                <Badge className={`text-[10px] ${fuelEfficiency > 200 ? 'bg-green-500/20 text-green-400' : fuelEfficiency > 150 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                  {fuelEfficiency > 200 ? 'Excellent' : fuelEfficiency > 150 ? 'Good' : 'Needs Review'}
                </Badge>
              </div>
            </div>

            {/* Fuel Type Summary */}
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Fuel Stock Overview</div>
              <div className="space-y-2">
                {fuelTypes.length === 0 ? (
                  <div className="text-xs text-slate-500">No fuel types configured</div>
                ) : (
                  fuelTypes.map((ft) => {
                    const pct = ft.tankCapacity > 0 ? Math.round((ft.currentLevel / ft.tankCapacity) * 100) : 0;
                    const barColor = pct < 20 ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-green-500';
                    return (
                      <div key={ft.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-300">{ft.name}</span>
                          <span className="text-[10px] text-slate-400">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-600/50 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
