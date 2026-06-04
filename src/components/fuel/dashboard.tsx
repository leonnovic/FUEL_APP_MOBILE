'use client';

import { useMemo } from 'react';
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

  // ─── Charts data ───────────────────────────────────────────────────────

  // Last 7 days sales trend
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

  // Fuel distribution
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

  // Expense breakdown by category
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

  // Pump/invoice/employee counts
  const activeInvoices = invoicesArr.filter((i) => i.status === 'pending' || i.status === 'overdue').length;
  const activeEmployees = employees.filter((e) => e.status === 'active').length;

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

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Revenue */}
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
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="size-3 text-green-400" />
              <span className="text-xs text-green-400">{formatKsh(todaySales)} today</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Net Profit</CardDescription>
              <div className={`size-8 rounded-lg flex items-center justify-center ${profitUp ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {profitUp ? <TrendingUp className="size-4 text-green-400" /> : <TrendingDown className="size-4 text-red-400" />}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(netProfit)}</div>
            <div className="text-xs text-slate-400 mt-1">Expenses: {formatKsh(totalExpenses)}</div>
          </CardContent>
        </Card>

        {/* Fuel Sold */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Fuel Sold (L)</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFuelL.toLocaleString()} L</div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-green-400">PMS @{pmsPrice || 0}</span>
              <span className="text-amber-400">AGO @{agoPrice || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Balance Due */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Balance Due</CardDescription>
              <div className={`size-8 rounded-lg flex items-center justify-center ${totalBalanceDue > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                {totalBalanceDue > 0 ? <AlertCircle className="size-4 text-red-400" /> : <DollarSign className="size-4 text-green-400" />}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalBalanceDue)}</div>
            <div className="flex items-center gap-1 mt-1">
              {totalBalanceDue > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>}
              <span className="text-xs text-slate-400">{clientsArr.length} clients</span>
            </div>
          </CardContent>
        </Card>
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

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Trend */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Trend (7 Days)</CardTitle>
            <CardDescription className="text-slate-400 text-xs">PMS vs AGO daily revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesTrendConfig} className="h-[220px] w-full">
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
            <ChartContainer config={fuelDistConfig} className="h-[220px] w-full">
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
            <ChartContainer config={expenseConfig} className="h-[200px] w-full">
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

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              onClick={() => dispatchTab('pos')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              <ShoppingCart className="size-6 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">Point of Sale</span>
            </button>
            <button
              onClick={() => dispatchTab('sales')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
            >
              <BarChart3 className="size-6 text-green-400" />
              <span className="text-xs font-medium text-green-300">Sales Tracking</span>
            </button>
            <button
              onClick={() => dispatchTab('delivery')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              <Truck className="size-6 text-amber-400" />
              <span className="text-xs font-medium text-amber-300">Delivery</span>
            </button>
            <button
              onClick={() => dispatchTab('invoice')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
            >
              <FileText className="size-6 text-purple-400" />
              <span className="text-xs font-medium text-purple-300">Invoice</span>
            </button>
            <button
              onClick={() => dispatchTab('mpesa')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <Smartphone className="size-6 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">M-PESA</span>
            </button>
            <button
              onClick={() => dispatchTab('reports')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            >
              <CreditCard className="size-6 text-rose-400" />
              <span className="text-xs font-medium text-rose-300">Reports</span>
            </button>
          </div>
        </CardContent>
      </Card>

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
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                <Gauge className="size-6 text-green-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-300">
                  {fuelTypes.filter((f) => f.name.toLowerCase().includes('pms') || f.name.toLowerCase().includes('petrol')).length || 2}
                </div>
                <div className="text-[10px] text-green-400 uppercase tracking-wider mt-1">PMS Pumps</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                <Gauge className="size-6 text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-300">
                  {fuelTypes.filter((f) => f.name.toLowerCase().includes('ago') || f.name.toLowerCase().includes('diesel')).length || 2}
                </div>
                <div className="text-[10px] text-amber-400 uppercase tracking-wider mt-1">AGO Pumps</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                <Receipt className="size-6 text-purple-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-purple-300">{activeInvoices}</div>
                <div className="text-[10px] text-purple-400 uppercase tracking-wider mt-1">Invoices</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
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
