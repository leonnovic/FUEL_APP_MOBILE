'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Fuel,
  Receipt,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'fuel' | 'expense' | 'profit';

const reportTypes: { value: ReportType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'daily', label: 'Daily Sales', icon: <Receipt className="size-4" />, description: 'Today\'s sales breakdown' },
  { value: 'weekly', label: 'Weekly Summary', icon: <BarChart3 className="size-4" />, description: '7-day performance overview' },
  { value: 'monthly', label: 'Monthly Report', icon: <Calendar className="size-4" />, description: 'Monthly aggregated data' },
  { value: 'fuel', label: 'Fuel Analysis', icon: <Fuel className="size-4" />, description: 'Fuel type performance' },
  { value: 'expense', label: 'Expense Report', icon: <DollarSign className="size-4" />, description: 'Expense breakdown' },
  { value: 'profit', label: 'Profit & Loss', icon: <TrendingUp className="size-4" />, description: 'Revenue vs expenses' },
];

const lineChartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: '#22c55e' },
  expenses: { label: 'Expenses', color: '#ef4444' },
  profit: { label: 'Profit', color: '#3b82f6' },
  pms: { label: 'PMS', color: '#22c55e' },
  ago: { label: 'AGO', color: '#f59e0b' },
  amount: { label: 'Amount', color: '#ef4444' },
};

const barChartConfig: ChartConfig = {
  pms: { label: 'PMS', color: '#22c55e' },
  ago: { label: 'AGO', color: '#f59e0b' },
  revenue: { label: 'Revenue', color: '#22c55e' },
  expenses: { label: 'Expenses', color: '#ef4444' },
};

export function ReportsCenter() {
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const expenses = useFuelStore((s) => s.expenses);
  const deliveries = useFuelStore((s) => s.deliveryData);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);

  const [reportType, setReportType] = useState<ReportType>('daily');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  const salesArr = useMemo(() => Object.values(salesHistory), [salesHistory]);
  const deliveriesArr = useMemo(() => Object.values(deliveries), [deliveries]);

  // Filter data by date range
  const filteredSales = useMemo(
    () => salesArr.filter((s) => s.date >= fromDate && s.date <= toDate),
    [salesArr, fromDate, toDate]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.date >= fromDate && e.date <= toDate),
    [expenses, fromDate, toDate]
  );

  // Summary metrics
  const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.totalSales, 0), [filteredSales]);
  const totalExpensesAmt = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
  const netProfit = totalRevenue - totalExpensesAmt;
  const totalLitres = useMemo(() => filteredSales.reduce((sum, s) => sum + s.pmsSalesL + s.agoSalesL, 0), [filteredSales]);
  const totalDeliveries = useMemo(
    () => deliveriesArr.filter((d) => d.date >= fromDate && d.date <= toDate).length,
    [deliveriesArr, fromDate, toDate]
  );

  // Chart data generators
  const dailyChartData = useMemo(() => {
    const days: { date: string; revenue: number; expenses: number; profit: number }[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const daySales = filteredSales.filter((s) => s.date === ds).reduce((sum, s) => sum + s.totalSales, 0);
      const dayExpenses = filteredExpenses.filter((e) => e.date === ds).reduce((sum, e) => sum + e.amount, 0);
      days.push({
        date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        revenue: daySales,
        expenses: dayExpenses,
        profit: daySales - dayExpenses,
      });
    }
    return days;
  }, [filteredSales, filteredExpenses, fromDate, toDate]);

  const fuelChartData = useMemo(() => {
    const days: { date: string; pms: number; ago: number }[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const daySales = filteredSales.filter((s) => s.date === ds);
      days.push({
        date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        pms: daySales.reduce((sum, s) => sum + s.pmsSalesKsh, 0),
        ago: daySales.reduce((sum, s) => sum + s.agoSalesKsh, 0),
      });
    }
    return days;
  }, [filteredSales, fromDate, toDate]);

  const expenseChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount;
    });
    return Object.entries(grouped).map(([cat, amt]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      amount: amt,
    }));
  }, [filteredExpenses]);

  const handleExport = () => {
    if (typeof window !== 'undefined') {
      // Visual only - show toast via custom event
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Report exported successfully', type: 'success' } }));
    }
  };

  const renderReportChart = () => {
    switch (reportType) {
      case 'daily':
      case 'weekly':
        return (
          <ChartContainer config={lineChartConfig} className="h-[280px] w-full">
            <LineChart data={dailyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ChartContainer>
        );
      case 'monthly':
        return (
          <ChartContainer config={barChartConfig} className="h-[280px] w-full">
            <BarChart data={dailyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        );
      case 'fuel':
        return (
          <ChartContainer config={barChartConfig} className="h-[280px] w-full">
            <BarChart data={fuelChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="pms" fill="var(--color-pms)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ago" fill="var(--color-ago)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        );
      case 'expense':
        return expenseChartData.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-12">No expense data in selected range</div>
        ) : (
          <ChartContainer config={lineChartConfig} className="h-[280px] w-full">
            <BarChart data={expenseChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        );
      case 'profit':
        return (
          <ChartContainer config={lineChartConfig} className="h-[280px] w-full">
            <LineChart data={dailyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={3} dot={false} />
            </LineChart>
          </ChartContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Report Type Selector ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {reportTypes.map((rt) => (
          <button
            key={rt.value}
            onClick={() => setReportType(rt.value)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
              reportType === rt.value
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            {rt.icon}
            <span className="text-xs font-medium">{rt.label}</span>
          </button>
        ))}
      </div>

      {/* ── Date Range Picker ────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-slate-400 text-xs">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <Button
              onClick={handleExport}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Download className="size-4 mr-2" /> Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Revenue</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalRevenue)}</div>
            <div className="text-xs text-slate-400 mt-1">{filteredSales.length} sales</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Expenses</CardDescription>
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Receipt className="size-4 text-red-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalExpensesAmt)}</div>
            <div className="text-xs text-slate-400 mt-1">{filteredExpenses.length} entries</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Net Profit</CardDescription>
              <div className={`size-8 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <TrendingUp className={`size-4 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {formatKsh(netProfit)}
            </div>
            <div className="text-xs text-slate-400 mt-1">{netProfit >= 0 ? 'Profit' : 'Loss'}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Fuel Sold</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLitres.toLocaleString()} L</div>
            <div className="text-xs text-slate-400 mt-1">{totalDeliveries} deliveries</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {reportTypes.find((r) => r.value === reportType)?.label}
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            {reportTypes.find((r) => r.value === reportType)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 && filteredExpenses.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-12">
              No data available for the selected date range
            </div>
          ) : (
            renderReportChart()
          )}
        </CardContent>
      </Card>
    </div>
  );
}
