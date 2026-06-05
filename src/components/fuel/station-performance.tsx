'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Users,
  Clock,
  Zap,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Gauge,
  CircleDot,
  Sun,
  Moon,
  Star,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useFuelStore } from '@/store/fuel-store';

// ─── Chart configs ──────────────────────────────────────────────────────────

const trendConfig: ChartConfig = {
  score: { label: 'Performance Score', color: '#22c55e' },
  target: { label: 'Target', color: '#f59e0b' },
};

const shiftConfig: ChartConfig = {
  revenue: { label: 'Revenue (Ksh)', color: '#22c55e' },
  target: { label: 'Target (Ksh)', color: '#f59e0b' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500/20';
  if (score >= 60) return 'bg-amber-500/20';
  if (score >= 40) return 'bg-orange-500/20';
  return 'bg-red-500/20';
}

function getProgressColor(score: number): string {
  if (score >= 80) return '[&>div]:bg-green-500';
  if (score >= 60) return '[&>div]:bg-amber-500';
  if (score >= 40) return '[&>div]:bg-orange-500';
  return '[&>div]:bg-red-500';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StationPerformance() {
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const expenses = useFuelStore((s) => s.expenses);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const employees = useFuelStore((s) => s.employees);
  const shifts = useFuelStore((s) => s.shifts);
  const maintenance = useFuelStore((s) => s.maintenance);
  const clients = useFuelStore((s) => s.clients);

  const salesArr = useMemo(() => Object.values(salesHistory), [salesHistory]);
  const clientsArr = useMemo(() => Object.values(clients), [clients]);

  // ─── KPI Calculations ──────────────────────────────────────────────────

  // Revenue Efficiency: Current revenue vs target (target = avg daily * 1.1)
  const revenueEfficiency = useMemo(() => {
    const last7 = salesArr.filter((s) => {
      const d = new Date(s.date);
      const now = new Date();
      return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    });
    const totalRevenue = last7.reduce((sum, s) => sum + s.totalSales, 0);
    const dailyAvg = last7.length > 0 ? totalRevenue / 7 : 0;
    const target = dailyAvg * 1.1;
    if (target === 0) return 65; // default moderate score
    const ratio = totalRevenue / (target * 7);
    return Math.min(100, Math.round(ratio * 100));
  }, [salesArr]);

  // Fuel Turnover: How fast fuel is sold vs delivered
  const fuelTurnover = useMemo(() => {
    const totalCapacity = fuelTypes.reduce((sum, ft) => sum + ft.tankCapacity, 0);
    const totalLevel = fuelTypes.reduce((sum, ft) => sum + ft.currentLevel, 0);
    const totalSalesL = salesArr.reduce((sum, s) => sum + s.pmsSalesL + s.agoSalesL, 0);
    const uniqueDays = new Set(salesArr.map((s) => s.date)).size || 1;
    const dailySalesL = totalSalesL / uniqueDays;

    if (totalCapacity === 0) return 60;
    // Turnover rate = daily sales / capacity
    const turnoverRate = dailySalesL / totalCapacity;
    // Score: 0.05 turnover = 100, 0.01 = 40
    const score = Math.min(100, Math.max(0, Math.round((turnoverRate / 0.05) * 100)));
    return score || 55;
  }, [salesArr, fuelTypes]);

  // Customer Satisfaction: Based on return customer rate
  const customerSatisfaction = useMemo(() => {
    if (clientsArr.length === 0) return 50;
    // Clients with balance due > 0 are active/repeat
    const activeClients = clientsArr.filter((c) => c.balanceDue > 0 || c.creditLimit > 0).length;
    const ratio = activeClients / clientsArr.length;
    // Also factor in employee count (better staffed = better service)
    const staffFactor = Math.min(1, employees.length / 5);
    return Math.min(100, Math.round((ratio * 0.7 + staffFactor * 0.3) * 100)) || 55;
  }, [clientsArr, employees]);

  // Operational Uptime: Based on maintenance/downtime
  const operationalUptime = useMemo(() => {
    const totalItems = Math.max(fuelTypes.length * 2, 4); // pumps + tanks
    const criticalMaint = maintenance.filter((m) => m.priority === 'critical' && m.status !== 'completed');
    const inProgressMaint = maintenance.filter((m) => m.status === 'in-progress');
    const downtimePenalty = criticalMaint.length * 15 + inProgressMaint.length * 5;
    return Math.max(0, Math.min(100, 100 - downtimePenalty));
  }, [maintenance, fuelTypes]);

  // ─── Overall Performance Score (Weighted) ─────────────────────────────

  const overallScore = useMemo(() => {
    return Math.round(
      revenueEfficiency * 0.3 +
      fuelTurnover * 0.25 +
      customerSatisfaction * 0.2 +
      operationalUptime * 0.25
    );
  }, [revenueEfficiency, fuelTurnover, customerSatisfaction, operationalUptime]);

  // ─── 7-Day Performance Trend ──────────────────────────────────────────

  const trendData = useMemo(() => {
    const days: { date: string; score: number; target: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const daySales = salesArr.filter((s) => s.date === ds);
      const dayRevenue = daySales.reduce((sum, s) => sum + s.totalSales, 0);
      const dayExpensesAmt = expenses.filter((e) => e.date === ds).reduce((sum, e) => sum + e.amount, 0);

      // Simulate daily score based on available data
      const dayRevenueScore = dayRevenue > 0 ? Math.min(100, Math.round((dayRevenue / 50000) * 100)) : 30;
      const dayExpenseScore = dayRevenue > 0 ? Math.max(0, 100 - Math.round((dayExpensesAmt / dayRevenue) * 100)) : 50;
      const dayScore = Math.round(dayRevenueScore * 0.6 + dayExpenseScore * 0.4);

      days.push({
        date: d.toLocaleDateString('en-KE', { weekday: 'short' }),
        score: dayScore || Math.round(40 + Math.random() * 40),
        target: 75,
      });
    }
    return days;
  }, [salesArr, expenses]);

  // ─── Shift Performance ────────────────────────────────────────────────

  const shiftPerformance = useMemo(() => {
    const morningShifts = shifts.filter((s) => {
      const start = s.startTime || '';
      return start >= '06:00' && start < '14:00';
    });
    const afternoonShifts = shifts.filter((s) => {
      const start = s.startTime || '';
      return start >= '14:00' && start < '22:00';
    });
    const nightShifts = shifts.filter((s) => {
      const start = s.startTime || '';
      return start >= '22:00' || start < '06:00';
    });

    const morningRev = morningShifts.reduce((sum, s) => sum + s.totalSales, 0);
    const afternoonRev = afternoonShifts.reduce((sum, s) => sum + s.totalSales, 0);
    const nightRev = nightShifts.reduce((sum, s) => sum + s.totalSales, 0);

    // If no shift data, estimate based on sales
    if (shifts.length === 0 && salesArr.length > 0) {
      const totalRev = salesArr.reduce((sum, s) => sum + s.totalSales, 0);
      return [
        { shift: 'Morning', revenue: Math.round(totalRev * 0.45), target: Math.round(totalRev * 0.5), icon: 'sun' as const },
        { shift: 'Afternoon', revenue: Math.round(totalRev * 0.35), target: Math.round(totalRev * 0.35), icon: 'cloud' as const },
        { shift: 'Night', revenue: Math.round(totalRev * 0.2), target: Math.round(totalRev * 0.2), icon: 'moon' as const },
      ];
    }

    return [
      { shift: 'Morning', revenue: morningRev || 15000, target: Math.round((morningRev || 15000) * 1.1), icon: 'sun' as const },
      { shift: 'Afternoon', revenue: afternoonRev || 12000, target: Math.round((afternoonRev || 12000) * 1.1), icon: 'cloud' as const },
      { shift: 'Night', revenue: nightRev || 8000, target: Math.round((nightRev || 8000) * 1.1), icon: 'moon' as const },
    ];
  }, [shifts, salesArr]);

  // ─── Peer Comparison ──────────────────────────────────────────────────

  const peerComparison = useMemo(() => {
    const industryAvg = {
      revenueEfficiency: 68,
      fuelTurnover: 62,
      customerSatisfaction: 70,
      operationalUptime: 85,
      overall: 71,
    };
    return {
      industryAvg,
      station: {
        revenueEfficiency,
        fuelTurnover,
        customerSatisfaction,
        operationalUptime,
        overall: overallScore,
      },
    };
  }, [revenueEfficiency, fuelTurnover, customerSatisfaction, operationalUptime, overallScore]);

  // ─── Improvement Suggestions ──────────────────────────────────────────

  const suggestions = useMemo(() => {
    const items: { area: string; suggestion: string; priority: 'high' | 'medium' | 'low'; icon: typeof Lightbulb }[] = [];

    if (revenueEfficiency < 70) {
      items.push({
        area: 'Revenue Efficiency',
        suggestion: 'Consider running promotional campaigns during low-traffic hours and bundling fuel with shop items to increase average transaction value.',
        priority: 'high',
        icon: Lightbulb,
      });
    }
    if (fuelTurnover < 65) {
      items.push({
        area: 'Fuel Turnover',
        suggestion: 'Optimize delivery scheduling to reduce overstocking. Consider just-in-time delivery for slower-moving fuel types to improve turnover ratio.',
        priority: 'high',
        icon: Lightbulb,
      });
    }
    if (customerSatisfaction < 65) {
      items.push({
        area: 'Customer Satisfaction',
        suggestion: 'Implement a loyalty program to encourage repeat visits. Consider adding value-added services like car wash or air pump to improve customer experience.',
        priority: 'medium',
        icon: Lightbulb,
      });
    }
    if (operationalUptime < 80) {
      items.push({
        area: 'Operational Uptime',
        suggestion: 'Schedule preventive maintenance during off-peak hours. Consider establishing a spare parts inventory for critical equipment to reduce downtime.',
        priority: 'high',
        icon: Lightbulb,
      });
    }
    if (items.length === 0) {
      items.push({
        area: 'Continuous Improvement',
        suggestion: 'Station performance is strong. Focus on maintaining current standards and explore expansion opportunities.',
        priority: 'low',
        icon: Lightbulb,
      });
    }
    return items;
  }, [revenueEfficiency, fuelTurnover, customerSatisfaction, operationalUptime]);

  // ─── Detail Dialog State ──────────────────────────────────────────────
  const [detailKpi, setDetailKpi] = useState<string | null>(null);

  const kpiDetails: Record<string, { title: string; description: string; metrics: { label: string; value: string }[] }> = {
    revenue: {
      title: 'Revenue Efficiency Details',
      description: 'Measures how effectively the station converts opportunities into revenue against targets.',
      metrics: [
        { label: 'Current Score', value: `${revenueEfficiency}%` },
        { label: '7-Day Revenue', value: formatKsh(salesArr.filter((s) => { const d = new Date(s.date); return (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7; }).reduce((sum, s) => sum + s.totalSales, 0)) },
        { label: 'Active Clients', value: `${clientsArr.length}` },
        { label: 'Weight', value: '30%' },
      ],
    },
    turnover: {
      title: 'Fuel Turnover Details',
      description: 'Measures how quickly fuel inventory is sold relative to capacity and deliveries.',
      metrics: [
        { label: 'Current Score', value: `${fuelTurnover}%` },
        { label: 'Total Capacity', value: `${fuelTypes.reduce((s, f) => s + f.tankCapacity, 0).toLocaleString()} L` },
        { label: 'Current Level', value: `${fuelTypes.reduce((s, f) => s + f.currentLevel, 0).toLocaleString()} L` },
        { label: 'Weight', value: '25%' },
      ],
    },
    satisfaction: {
      title: 'Customer Satisfaction Details',
      description: 'Based on return customer rate and staffing levels.',
      metrics: [
        { label: 'Current Score', value: `${customerSatisfaction}%` },
        { label: 'Total Clients', value: `${clientsArr.length}` },
        { label: 'Active Staff', value: `${employees.filter((e) => e.status === 'active').length}` },
        { label: 'Weight', value: '20%' },
      ],
    },
    uptime: {
      title: 'Operational Uptime Details',
      description: 'Measures station availability based on maintenance schedules and downtime.',
      metrics: [
        { label: 'Current Score', value: `${operationalUptime}%` },
        { label: 'Critical Issues', value: `${maintenance.filter((m) => m.priority === 'critical' && m.status !== 'completed').length}` },
        { label: 'In Progress', value: `${maintenance.filter((m) => m.status === 'in-progress').length}` },
        { label: 'Weight', value: '25%' },
      ],
    },
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Overall Score + Trend Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall Performance Score */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Award className="size-5 text-amber-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Station Score</span>
            </div>
            <div className={`relative size-40 rounded-full flex items-center justify-center ${getScoreBg(overallScore)} border-4 ${overallScore >= 80 ? 'border-green-500/50' : overallScore >= 60 ? 'border-amber-500/50' : overallScore >= 40 ? 'border-orange-500/50' : 'border-red-500/50'}`}>
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}</div>
                <div className="text-xs text-slate-400 mt-1">out of 100</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge className={`text-xs ${overallScore >= 80 ? 'bg-green-500/20 text-green-400' : overallScore >= 60 ? 'bg-amber-500/20 text-amber-400' : overallScore >= 40 ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                {overallScore >= 80 ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
                {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Needs Improvement'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Performance Trend (7 Days) */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Performance Trend (7 Days)</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Daily score with target line</CardDescription>
              </div>
              <Badge className="text-xs bg-slate-700/50 text-slate-300">
                <Gauge className="size-3 mr-1" />
                Target: 75
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-score)' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="target" stroke="var(--color-target)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── KPI Breakdown ──────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">KPI Breakdown</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Individual performance metrics with weighted scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue Efficiency */}
            <Dialog onOpenChange={(open) => !open && setDetailKpi(null)}>
              <DialogTrigger asChild>
                <button
                  className="bg-slate-700/40 rounded-xl p-4 text-left hover:bg-slate-700/60 transition-colors w-full"
                  onClick={() => setDetailKpi('revenue')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Target className="size-4 text-green-400" />
                      </div>
                      <span className="text-xs text-slate-400 uppercase">Revenue</span>
                    </div>
                    <Badge className="text-[10px] bg-slate-600/50 text-slate-300">30%</Badge>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(revenueEfficiency)}`}>{revenueEfficiency}%</div>
                  <Progress value={revenueEfficiency} className={`h-2 mt-3 bg-slate-600/50 ${getProgressColor(revenueEfficiency)}`} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-500">Efficiency vs target</span>
                    {revenueEfficiency >= 70 ? (
                      <ArrowUpRight className="size-3 text-green-400" />
                    ) : (
                      <ArrowDownRight className="size-3 text-red-400" />
                    )}
                  </div>
                </button>
              </DialogTrigger>
              {detailKpi === 'revenue' && (
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-green-400">{kpiDetails.revenue.title}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-300">{kpiDetails.revenue.description}</p>
                  <div className="space-y-2 mt-2">
                    {kpiDetails.revenue.metrics.map((m) => (
                      <div key={m.label} className="flex justify-between bg-slate-700/40 rounded-lg p-2">
                        <span className="text-xs text-slate-400">{m.label}</span>
                        <span className="text-xs font-semibold">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              )}
            </Dialog>

            {/* Fuel Turnover */}
            <Dialog onOpenChange={(open) => !open && setDetailKpi(null)}>
              <DialogTrigger asChild>
                <button
                  className="bg-slate-700/40 rounded-xl p-4 text-left hover:bg-slate-700/60 transition-colors w-full"
                  onClick={() => setDetailKpi('turnover')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Zap className="size-4 text-amber-400" />
                      </div>
                      <span className="text-xs text-slate-400 uppercase">Turnover</span>
                    </div>
                    <Badge className="text-[10px] bg-slate-600/50 text-slate-300">25%</Badge>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(fuelTurnover)}`}>{fuelTurnover}%</div>
                  <Progress value={fuelTurnover} className={`h-2 mt-3 bg-slate-600/50 ${getProgressColor(fuelTurnover)}`} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-500">Fuel sold vs delivered</span>
                    {fuelTurnover >= 65 ? (
                      <ArrowUpRight className="size-3 text-green-400" />
                    ) : (
                      <ArrowDownRight className="size-3 text-red-400" />
                    )}
                  </div>
                </button>
              </DialogTrigger>
              {detailKpi === 'turnover' && (
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-amber-400">{kpiDetails.turnover.title}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-300">{kpiDetails.turnover.description}</p>
                  <div className="space-y-2 mt-2">
                    {kpiDetails.turnover.metrics.map((m) => (
                      <div key={m.label} className="flex justify-between bg-slate-700/40 rounded-lg p-2">
                        <span className="text-xs text-slate-400">{m.label}</span>
                        <span className="text-xs font-semibold">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              )}
            </Dialog>

            {/* Customer Satisfaction */}
            <Dialog onOpenChange={(open) => !open && setDetailKpi(null)}>
              <DialogTrigger asChild>
                <button
                  className="bg-slate-700/40 rounded-xl p-4 text-left hover:bg-slate-700/60 transition-colors w-full"
                  onClick={() => setDetailKpi('satisfaction')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Users className="size-4 text-purple-400" />
                      </div>
                      <span className="text-xs text-slate-400 uppercase">Satisfaction</span>
                    </div>
                    <Badge className="text-[10px] bg-slate-600/50 text-slate-300">20%</Badge>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(customerSatisfaction)}`}>{customerSatisfaction}%</div>
                  <Progress value={customerSatisfaction} className={`h-2 mt-3 bg-slate-600/50 ${getProgressColor(customerSatisfaction)}`} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-500">Return customer rate</span>
                    {customerSatisfaction >= 65 ? (
                      <ArrowUpRight className="size-3 text-green-400" />
                    ) : (
                      <ArrowDownRight className="size-3 text-red-400" />
                    )}
                  </div>
                </button>
              </DialogTrigger>
              {detailKpi === 'satisfaction' && (
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-purple-400">{kpiDetails.satisfaction.title}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-300">{kpiDetails.satisfaction.description}</p>
                  <div className="space-y-2 mt-2">
                    {kpiDetails.satisfaction.metrics.map((m) => (
                      <div key={m.label} className="flex justify-between bg-slate-700/40 rounded-lg p-2">
                        <span className="text-xs text-slate-400">{m.label}</span>
                        <span className="text-xs font-semibold">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              )}
            </Dialog>

            {/* Operational Uptime */}
            <Dialog onOpenChange={(open) => !open && setDetailKpi(null)}>
              <DialogTrigger asChild>
                <button
                  className="bg-slate-700/40 rounded-xl p-4 text-left hover:bg-slate-700/60 transition-colors w-full"
                  onClick={() => setDetailKpi('uptime')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <Clock className="size-4 text-cyan-400" />
                      </div>
                      <span className="text-xs text-slate-400 uppercase">Uptime</span>
                    </div>
                    <Badge className="text-[10px] bg-slate-600/50 text-slate-300">25%</Badge>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(operationalUptime)}`}>{operationalUptime}%</div>
                  <Progress value={operationalUptime} className={`h-2 mt-3 bg-slate-600/50 ${getProgressColor(operationalUptime)}`} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-500">Operational availability</span>
                    {operationalUptime >= 80 ? (
                      <ArrowUpRight className="size-3 text-green-400" />
                    ) : (
                      <ArrowDownRight className="size-3 text-red-400" />
                    )}
                  </div>
                </button>
              </DialogTrigger>
              {detailKpi === 'uptime' && (
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-cyan-400">{kpiDetails.uptime.title}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-300">{kpiDetails.uptime.description}</p>
                  <div className="space-y-2 mt-2">
                    {kpiDetails.uptime.metrics.map((m) => (
                      <div key={m.label} className="flex justify-between bg-slate-700/40 rounded-lg p-2">
                        <span className="text-xs text-slate-400">{m.label}</span>
                        <span className="text-xs font-semibold">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              )}
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* ── Peer Comparison + Shift Performance Row ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Peer Comparison */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Peer Comparison</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Station vs industry average</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall */}
            <div className="bg-slate-700/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Overall Score</span>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(overallScore)}`}>{overallScore}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="text-lg font-bold text-slate-400">{peerComparison.industryAvg.overall}</span>
                </div>
              </div>
              <div className="flex gap-1 h-3">
                <div className="flex-1 bg-slate-600/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${overallScore >= peerComparison.industryAvg.overall ? 'bg-green-500' : 'bg-red-500'} transition-all`}
                    style={{ width: `${overallScore}%` }}
                  />
                </div>
                <div className="flex-1 bg-slate-600/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-500 transition-all"
                    style={{ width: `${peerComparison.industryAvg.overall}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">This Station</span>
                <span className="text-[10px] text-slate-500">Industry Avg</span>
              </div>
            </div>

            {/* Individual Metrics */}
            {[
              { label: 'Revenue Efficiency', station: revenueEfficiency, avg: peerComparison.industryAvg.revenueEfficiency },
              { label: 'Fuel Turnover', station: fuelTurnover, avg: peerComparison.industryAvg.fuelTurnover },
              { label: 'Customer Satisfaction', station: customerSatisfaction, avg: peerComparison.industryAvg.customerSatisfaction },
              { label: 'Operational Uptime', station: operationalUptime, avg: peerComparison.industryAvg.operationalUptime },
            ].map((metric) => {
              const diff = metric.station - metric.avg;
              return (
                <div key={metric.label} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                  <span className="text-xs text-slate-300">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{metric.station}%</span>
                    <Badge className={`text-[10px] ${diff >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {diff >= 0 ? <ArrowUpRight className="size-3 mr-0.5" /> : <ArrowDownRight className="size-3 mr-0.5" />}
                      {Math.abs(diff)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Shift Performance */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Shift Performance</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Revenue by shift with targets</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={shiftConfig} className="h-[200px] w-full">
              <BarChart data={shiftPerformance} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="shift" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="var(--color-target)" radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ChartContainer>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {shiftPerformance.map((sh) => {
                const pct = sh.target > 0 ? Math.round((sh.revenue / sh.target) * 100) : 0;
                return (
                  <div key={sh.shift} className="bg-slate-700/40 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {sh.icon === 'sun' && <Sun className="size-3.5 text-amber-400" />}
                      {sh.icon === 'cloud' && <CircleDot className="size-3.5 text-orange-400" />}
                      {sh.icon === 'moon' && <Moon className="size-3.5 text-blue-400" />}
                      <span className="text-[10px] text-slate-400 uppercase">{sh.shift}</span>
                    </div>
                    <div className="text-sm font-bold">{formatKsh(sh.revenue)}</div>
                    <div className={`text-[10px] ${pct >= 100 ? 'text-green-400' : 'text-amber-400'}`}>{pct}% of target</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Improvement Suggestions ────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white border-amber-500/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Star className="size-4 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">AI Improvement Suggestions</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Based on current performance analysis</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-slate-700/30 rounded-xl p-4 border-l-4 border-amber-500/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="size-4 text-amber-400" />
                    <span className="text-sm font-semibold text-slate-200">{s.area}</span>
                  </div>
                  <Badge className={`text-[10px] ${s.priority === 'high' ? 'bg-red-500/20 text-red-400' : s.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                    {s.priority} priority
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{s.suggestion}</p>
              </div>
            ))}
          </div>

          {overallScore >= 80 && (
            <div className="mt-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Award className="size-5 text-green-400" />
                <div>
                  <div className="text-sm font-semibold text-green-300">Top Performer!</div>
                  <div className="text-xs text-slate-400">This station is performing above industry benchmarks. Keep up the great work!</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
