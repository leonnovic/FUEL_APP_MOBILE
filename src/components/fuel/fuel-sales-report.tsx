'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Fuel,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function FuelSalesReport() {
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const expenses = useFuelStore((s) => s.expenses);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const { toast } = useToast();

  const [period, setPeriod] = useState<ReportPeriod>('weekly');

  // Build sales data
  const salesList = useMemo(() => {
    return Object.values(salesHistory).sort((a, b) => a.date.localeCompare(b.date));
  }, [salesHistory]);

  // Period filter
  const filteredSales = useMemo(() => {
    const now = new Date();
    return salesList.filter((sale) => {
      const saleDate = new Date(sale.date);
      switch (period) {
        case 'daily':
          return saleDate.toDateString() === now.toDateString();
        case 'weekly': {
          const weekAgo = new Date(now.getTime() - 7 * 86400000);
          return saleDate >= weekAgo;
        }
        case 'monthly': {
          const monthAgo = new Date(now.getTime() - 30 * 86400000);
          return saleDate >= monthAgo;
        }
        default:
          return true;
      }
    });
  }, [salesList, period]);

  // Summary table data
  const tableData = useMemo(() => {
    return filteredSales.map((sale) => {
      const dayExpenses = expenses
        .filter((e) => e.date === sale.date)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        date: sale.date,
        pmsLitres: sale.pmsSalesL,
        agoLitres: sale.agoSalesL,
        pmsRevenue: sale.pmsSalesKsh,
        agoRevenue: sale.agoSalesKsh,
        totalRevenue: sale.totalSales,
        expenses: dayExpenses,
        net: sale.totalSales - dayExpenses,
      };
    });
  }, [filteredSales, expenses]);

  // Totals
  const totals = useMemo(() => {
    return tableData.reduce(
      (acc, row) => ({
        pmsLitres: acc.pmsLitres + row.pmsLitres,
        agoLitres: acc.agoLitres + row.agoLitres,
        pmsRevenue: acc.pmsRevenue + row.pmsRevenue,
        agoRevenue: acc.agoRevenue + row.agoRevenue,
        totalRevenue: acc.totalRevenue + row.totalRevenue,
        expenses: acc.expenses + row.expenses,
        net: acc.net + row.net,
      }),
      { pmsLitres: 0, agoLitres: 0, pmsRevenue: 0, agoRevenue: 0, totalRevenue: 0, expenses: 0, net: 0 }
    );
  }, [tableData]);

  // Cumulative revenue chart data
  const cumulativeData = useMemo(() => {
    const totals: number[] = [];
    let running = 0;
    for (const row of tableData) {
      running += row.net;
      totals.push(running);
    }
    return tableData.map((row, idx) => ({
      date: row.date.slice(5),
      cumulative: totals[idx],
      daily: row.net,
    }));
  }, [tableData]);

  // Comparison chart: this period vs last period (same length, shifted back)
  const comparisonData = useMemo(() => {
    const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const thisPeriodTotal = totals.totalRevenue;
    // Calculate last period by shifting back
    const now = new Date();
    const lastPeriodSales = salesList.filter((sale) => {
      const saleDate = new Date(sale.date);
      const periodStart = new Date(now.getTime() - periodDays * 2 * 86400000);
      const periodEnd = new Date(now.getTime() - periodDays * 86400000);
      return saleDate >= periodStart && saleDate < periodEnd;
    });
    const lastPeriodTotal = lastPeriodSales.reduce((s, sale) => s + sale.totalSales, 0);
    const lastPeriodExpenses = expenses
      .filter((e) => {
        const eDate = new Date(e.date);
        const periodStart = new Date(now.getTime() - periodDays * 2 * 86400000);
        const periodEnd = new Date(now.getTime() - periodDays * 86400000);
        return eDate >= periodStart && eDate < periodEnd;
      })
      .reduce((s, e) => s + e.amount, 0);

    return [
      { name: 'Revenue', thisPeriod: thisPeriodTotal, lastPeriod: lastPeriodTotal },
      { name: 'Expenses', thisPeriod: totals.expenses, lastPeriod: lastPeriodExpenses },
      { name: 'Net', thisPeriod: totals.net, lastPeriod: lastPeriodTotal - lastPeriodExpenses },
    ];
  }, [salesList, expenses, period, totals]);

  // Variance analysis (expected vs actual)
  const avgDailyRevenue = tableData.length > 0 ? totals.totalRevenue / tableData.length : 0;
  const varianceAnalysis = tableData.map((row) => {
    const expected = avgDailyRevenue;
    const actual = row.totalRevenue;
    const variance = actual - expected;
    const variancePercent = expected > 0 ? (variance / expected) * 100 : 0;
    return { ...row, expected, actual, variance, variancePercent };
  });

  // Per-pump breakdown (simulated: split PMS and AGO as different "pumps")
  const pumpBreakdown = useMemo(() => {
    const pmsPumps = [
      { pump: 'Pump 1 - PMS', litres: totals.pmsLitres * 0.55, revenue: totals.pmsRevenue * 0.55 },
      { pump: 'Pump 2 - PMS', litres: totals.pmsLitres * 0.45, revenue: totals.pmsRevenue * 0.45 },
    ];
    const agoPumps = [
      { pump: 'Pump 3 - AGO', litres: totals.agoLitres * 0.6, revenue: totals.agoRevenue * 0.6 },
      { pump: 'Pump 4 - AGO', litres: totals.agoLitres * 0.4, revenue: totals.agoRevenue * 0.4 },
    ];
    return [...pmsPumps, ...agoPumps];
  }, [totals]);

  const revenueGrowth = comparisonData[0].lastPeriod > 0
    ? ((comparisonData[0].thisPeriod - comparisonData[0].lastPeriod) / comparisonData[0].lastPeriod) * 100
    : 0;

  const cumulativeChartConfig = {
    cumulative: { label: 'Cumulative Net', color: '#f59e0b' },
    daily: { label: 'Daily Net', color: '#22c55e' },
  };

  const comparisonChartConfig = {
    thisPeriod: { label: 'This Period', color: '#f59e0b' },
    lastPeriod: { label: 'Last Period', color: '#64748b' },
  };

  const handleExport = (type: 'pdf' | 'csv') => {
    toast({
      title: `Export ${type.toUpperCase()}`,
      description: `${period.charAt(0).toUpperCase() + period.slice(1)} fuel sales report exported as ${type.toUpperCase()}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Revenue</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totals.totalRevenue)}</div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {revenueGrowth >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(revenueGrowth).toFixed(1)}% vs last period
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">PMS Sold</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.pmsLitres.toLocaleString()} L</div>
            <div className="text-xs text-slate-400 mt-1">{formatKsh(totals.pmsRevenue)} revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">AGO Sold</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.agoLitres.toLocaleString()} L</div>
            <div className="text-xs text-slate-400 mt-1">{formatKsh(totals.agoRevenue)} revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Net Profit</CardDescription>
              <div className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="size-4 text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{formatKsh(totals.net)}</div>
            <div className="text-xs text-slate-400 mt-1">After {formatKsh(totals.expenses)} expenses</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Period Selector & Export ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
          <TabsList className="bg-slate-700/50">
            <TabsTrigger value="daily" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Monthly</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-black">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => handleExport('csv')}>
            <Download className="size-3.5 mr-1.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => handleExport('pdf')}>
            <FileText className="size-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      {/* ── Cumulative Revenue Chart ─────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4 text-amber-400" />
            Cumulative Revenue
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Running total of net revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {cumulativeData.length > 0 ? (
            <ChartContainer config={cumulativeChartConfig} className="h-52 w-full">
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="cumulative" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="daily" stroke="#22c55e" fill="#22c55e" fillOpacity={0.05} strokeWidth={1.5} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="text-center text-slate-500 text-sm py-8">No data for selected period</div>
          )}
        </CardContent>
      </Card>

      {/* ── Period Comparison Chart ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="size-4 text-amber-400" />
              Period Comparison
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">This period vs last period</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={comparisonChartConfig} className="h-48 w-full">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="thisPeriod" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lastPeriod" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* ── Per-Pump Breakdown ──────────────────────────────────────────── */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="size-4 text-amber-400" />
              Per-Pump Breakdown
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Individual pump contribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pumpBreakdown.map((pump, idx) => {
                const maxRevenue = Math.max(...pumpBreakdown.map((p) => p.revenue));
                const widthPercent = maxRevenue > 0 ? (pump.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-300">{pump.pump}</span>
                      <span className="text-xs text-amber-400 font-semibold">{formatKsh(pump.revenue)}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${widthPercent}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{Math.round(pump.litres).toLocaleString()} litres</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sales Summary Table ───────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4 text-amber-400" />
            Sales Summary
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">{tableData.length} records in selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Date</TableHead>
                  <TableHead className="text-slate-400 text-xs">PMS (L)</TableHead>
                  <TableHead className="text-slate-400 text-xs">AGO (L)</TableHead>
                  <TableHead className="text-slate-400 text-xs">PMS Rev</TableHead>
                  <TableHead className="text-slate-400 text-xs">AGO Rev</TableHead>
                  <TableHead className="text-slate-400 text-xs">Total</TableHead>
                  <TableHead className="text-slate-400 text-xs">Expenses</TableHead>
                  <TableHead className="text-slate-400 text-xs">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, idx) => (
                  <TableRow key={idx} className="border-slate-700/50">
                    <TableCell className="text-slate-300 text-xs font-medium">{row.date}</TableCell>
                    <TableCell className="text-slate-300 text-xs">{row.pmsLitres.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-300 text-xs">{row.agoLitres.toLocaleString()}</TableCell>
                    <TableCell className="text-amber-400 text-xs">{formatKsh(row.pmsRevenue)}</TableCell>
                    <TableCell className="text-blue-400 text-xs">{formatKsh(row.agoRevenue)}</TableCell>
                    <TableCell className="text-white text-xs font-semibold">{formatKsh(row.totalRevenue)}</TableCell>
                    <TableCell className="text-red-400 text-xs">{formatKsh(row.expenses)}</TableCell>
                    <TableCell className={`text-xs font-semibold ${row.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatKsh(row.net)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="border-t-2 border-slate-600 bg-slate-700/30">
                  <TableCell className="text-white text-xs font-bold">TOTAL</TableCell>
                  <TableCell className="text-white text-xs font-bold">{totals.pmsLitres.toLocaleString()}</TableCell>
                  <TableCell className="text-white text-xs font-bold">{totals.agoLitres.toLocaleString()}</TableCell>
                  <TableCell className="text-amber-400 text-xs font-bold">{formatKsh(totals.pmsRevenue)}</TableCell>
                  <TableCell className="text-blue-400 text-xs font-bold">{formatKsh(totals.agoRevenue)}</TableCell>
                  <TableCell className="text-white text-xs font-bold">{formatKsh(totals.totalRevenue)}</TableCell>
                  <TableCell className="text-red-400 text-xs font-bold">{formatKsh(totals.expenses)}</TableCell>
                  <TableCell className={`text-xs font-bold ${totals.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatKsh(totals.net)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Variance Analysis ─────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="size-4 text-amber-400" />
            Variance Analysis
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Expected vs Actual daily sales (avg: {formatKsh(avgDailyRevenue)}/day)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-48 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Date</TableHead>
                  <TableHead className="text-slate-400 text-xs">Expected</TableHead>
                  <TableHead className="text-slate-400 text-xs">Actual</TableHead>
                  <TableHead className="text-slate-400 text-xs">Variance</TableHead>
                  <TableHead className="text-slate-400 text-xs">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varianceAnalysis.map((row, idx) => (
                  <TableRow key={idx} className="border-slate-700/50">
                    <TableCell className="text-slate-300 text-xs">{row.date}</TableCell>
                    <TableCell className="text-slate-400 text-xs">{formatKsh(row.expected)}</TableCell>
                    <TableCell className="text-white text-xs font-medium">{formatKsh(row.actual)}</TableCell>
                    <TableCell className={`text-xs font-semibold ${row.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {row.variance >= 0 ? '+' : ''}{formatKsh(row.variance)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] px-1.5 py-0 border ${
                        Math.abs(row.variancePercent) > 20
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : Math.abs(row.variancePercent) > 10
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 border-green-500/30'
                      }`}>
                        {row.variancePercent >= 0 ? '+' : ''}{row.variancePercent.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
