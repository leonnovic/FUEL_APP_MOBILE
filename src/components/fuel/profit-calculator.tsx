'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
  AlertTriangle,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Fuel,
  PieChart,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useFuelStore } from '@/store/fuel-store';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatKsh = (val: number): string =>
  `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ─── Types ──────────────────────────────────────────────────────────────────
interface FuelCalcData {
  name: string;
  buyPrice: number;
  sellPrice: number;
  volume: number;
  operatingCostPerLitre: number;
}

interface CalcResults {
  grossMarginPerLitre: number;
  grossMarginPct: number;
  netMarginPerLitre: number;
  netMarginPct: number;
  totalProfit: number;
  breakEvenVolume: number;
  dailyProfit: number;
  monthlyProfit: number;
  vatImpact: number;
  exciseDuty: number;
  profitAfterTax: number;
}

const VAT_RATE = 0.16;
const EXCISE_DUTY_RATE = 0.08; // Excise duty on fuel in Kenya ~Ksh per litre approx 8% of margin for simplicity

const calcFuel = (d: FuelCalcData): CalcResults => {
  const grossMarginPerLitre = d.sellPrice - d.buyPrice;
  const grossMarginPct = d.sellPrice > 0 ? (grossMarginPerLitre / d.sellPrice) * 100 : 0;
  const netMarginPerLitre = grossMarginPerLitre - d.operatingCostPerLitre;
  const netMarginPct = d.sellPrice > 0 ? (netMarginPerLitre / d.sellPrice) * 100 : 0;
  const dailyProfit = netMarginPerLitre * d.volume;
  const monthlyProfit = dailyProfit * 30;
  const totalProfit = monthlyProfit;
  const breakEvenVolume = netMarginPerLitre > 0 ? Math.ceil(d.operatingCostPerLitre * d.volume / netMarginPerLitre) : 0;
  const grossProfit = grossMarginPerLitre * d.volume * 30;
  const vatImpact = grossProfit * VAT_RATE;
  const exciseDuty = grossProfit * EXCISE_DUTY_RATE;
  const profitAfterTax = monthlyProfit - vatImpact - exciseDuty;

  return {
    grossMarginPerLitre,
    grossMarginPct,
    netMarginPerLitre,
    netMarginPct,
    totalProfit,
    breakEvenVolume,
    dailyProfit,
    monthlyProfit,
    vatImpact,
    exciseDuty,
    profitAfterTax,
  };
};

const getMarginColor = (pct: number) => {
  if (pct >= 15) return { text: 'text-green-400', bg: 'bg-green-500', badge: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Healthy' };
  if (pct >= 5) return { text: 'text-amber-400', bg: 'bg-amber-500', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Moderate' };
  return { text: 'text-red-400', bg: 'bg-red-500', badge: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'At Risk' };
};

const getRiskLevel = (avgMargin: number) => {
  if (avgMargin >= 15) return { level: 'Low Risk', color: 'text-green-400', icon: TrendingUp };
  if (avgMargin >= 5) return { level: 'Medium Risk', color: 'text-amber-400', icon: AlertTriangle };
  return { level: 'High Risk', color: 'text-red-400', icon: TrendingDown };
};

// ─── Chart Config ───────────────────────────────────────────────────────────
const breakEvenChartConfig: ChartConfig = {
  volume: { label: 'Break-even Volume (L)', color: '#f59e0b' },
};

const sensitivityChartConfig: ChartConfig = {
  profit: { label: 'Monthly Profit (Ksh)', color: '#f59e0b' },
};

// ─── Component ──────────────────────────────────────────────────────────────
export function ProfitCalculator() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // Default data state
  const [fuelData, setFuelData] = useState<Record<string, FuelCalcData>>({
    PMS: { name: 'PMS', buyPrice: 185.50, sellPrice: 212.36, volume: 1200, operatingCostPerLitre: 8.50 },
    AGO: { name: 'AGO', buyPrice: 172.30, sellPrice: 199.47, volume: 900, operatingCostPerLitre: 8.50 },
    DPK: { name: 'DPK', buyPrice: 155.00, sellPrice: 178.20, volume: 300, operatingCostPerLitre: 8.50 },
  });

  const [activeTab, setActiveTab] = useState('PMS');

  // Update fuel data field
  const updateField = (fuel: string, field: keyof FuelCalcData, value: number) => {
    setFuelData((prev) => ({
      ...prev,
      [fuel]: { ...prev[fuel], [field]: value },
    }));
  };

  // Calculations
  const results = useMemo(() => {
    const r: Record<string, CalcResults> = {};
    for (const key of Object.keys(fuelData)) {
      r[key] = calcFuel(fuelData[key]);
    }
    return r;
  }, [fuelData]);

  // Average margin
  const avgMargin = useMemo(() => {
    const keys = Object.keys(results);
    if (keys.length === 0) return 0;
    return keys.reduce((sum, k) => sum + results[k].netMarginPct, 0) / keys.length;
  }, [results]);

  // Best performer
  const bestPerformer = useMemo(() => {
    let best = '';
    let bestMargin = -Infinity;
    for (const [k, r] of Object.entries(results)) {
      if (r.netMarginPct > bestMargin) {
        bestMargin = r.netMarginPct;
        best = k;
      }
    }
    return best;
  }, [results]);

  // Monthly projected profit (total)
  const totalMonthlyProfit = useMemo(() => {
    return Object.values(results).reduce((sum, r) => sum + r.monthlyProfit, 0);
  }, [results]);

  // Risk level
  const risk = getRiskLevel(avgMargin);

  // ── Break-even chart data ───────────────────────────────────────────────
  const breakEvenChartData = useMemo(() => {
    return Object.entries(fuelData).map(([name, d]) => {
      const netPerL = d.sellPrice - d.buyPrice - d.operatingCostPerLitre;
      // Break-even at different margin targets
      const baseBreakEven = netPerL > 0 ? Math.ceil((d.operatingCostPerLitre * d.volume) / netPerL) : d.volume * 2;
      return {
        name,
        volume: baseBreakEven,
        currentVolume: d.volume,
      };
    });
  }, [fuelData]);

  // ── What-if sensitivity data ────────────────────────────────────────────
  const sensitivityData = useMemo(() => {
    const d = fuelData[activeTab];
    if (!d) return [];
    const scenarios = [
      { label: '-10% Buy', buyMult: 0.90, sellMult: 1.00 },
      { label: '-5% Buy', buyMult: 0.95, sellMult: 1.00 },
      { label: 'Current', buyMult: 1.00, sellMult: 1.00 },
      { label: '+5% Buy', buyMult: 1.05, sellMult: 1.00 },
      { label: '+10% Buy', buyMult: 1.10, sellMult: 1.00 },
      { label: '-10% Sell', buyMult: 1.00, sellMult: 0.90 },
      { label: '-5% Sell', buyMult: 1.00, sellMult: 0.95 },
      { label: '+5% Sell', buyMult: 1.00, sellMult: 1.05 },
      { label: '+10% Sell', buyMult: 1.00, sellMult: 1.10 },
    ];
    return scenarios.map((s) => {
      const mod = { ...d, buyPrice: d.buyPrice * s.buyMult, sellPrice: d.sellPrice * s.sellMult };
      const r = calcFuel(mod);
      return { name: s.label, profit: Math.round(r.monthlyProfit) };
    });
  }, [fuelData, activeTab]);

  // ── Margin gauge component ──────────────────────────────────────────────
  const MarginGauge = ({ pct }: { pct: number }) => {
    const clampedPct = Math.max(0, Math.min(100, pct));
    const color = getMarginColor(pct);
    const rotation = (clampedPct / 100) * 180 - 90; // -90 to 90 degrees
    return (
      <div className="relative w-28 h-16 mx-auto">
        <svg viewBox="0 0 120 70" className="w-full">
          {/* Background arc */}
          <path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke="#334155"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Green zone >15% */}
          <path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke={clampedPct >= 15 ? '#22c55e' : clampedPct >= 5 ? '#eab308' : '#ef4444'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(clampedPct / 100) * 157} 157`}
          />
          {/* Needle */}
          <line
            x1="60"
            y1="65"
            x2="60"
            y2="25"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation}, 60, 65)`}
          />
          <circle cx="60" cy="65" r="4" fill="white" />
        </svg>
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-bold ${color.text}`}>
          {pct.toFixed(1)}%
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Percent className="size-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Average Margin</p>
                <p className={`text-xl font-bold ${getMarginColor(avgMargin).text}`}>{avgMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowUpRight className="size-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Best Performer</p>
                <p className="text-xl font-bold text-green-400">{bestPerformer || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <risk.icon className={`size-5 ${risk.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Risk Level</p>
                <p className={`text-xl font-bold ${risk.color}`}>{risk.level}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DollarSign className="size-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Monthly Projected Profit</p>
                <p className="text-xl font-bold text-amber-400">{formatKsh(totalMonthlyProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Side-by-Side Comparison ────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="size-4 text-amber-400" />
            Profitability Comparison — PMS vs AGO vs DPK
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Side-by-side margin analysis for each fuel type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(fuelData).map(([name, d]) => {
              const r = results[name];
              if (!r) return null;
              const marginColor = getMarginColor(r.netMarginPct);
              return (
                <Card key={name} className={`bg-slate-700/30 border-slate-600/50 backdrop-blur-sm hover:border-amber-500/30 transition-colors`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Fuel className="size-4 text-amber-400" />
                        {name}
                      </CardTitle>
                      <Badge className={`${marginColor.badge} border text-[10px]`}>
                        {marginColor.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Margin Gauge */}
                    <MarginGauge pct={r.netMarginPct} />

                    {/* Key Metrics */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gross Margin/L</span>
                        <span className={r.grossMarginPerLitre >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {formatKsh(r.grossMarginPerLitre)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gross Margin %</span>
                        <span className="text-white font-semibold">{r.grossMarginPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Net Margin/L</span>
                        <span className={r.netMarginPerLitre >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {formatKsh(r.netMarginPerLitre)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Net Margin %</span>
                        <span className={`${marginColor.text} font-semibold`}>{r.netMarginPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-px bg-slate-600/50" />
                      <div className="flex justify-between">
                        <span className="text-slate-400">Daily Profit</span>
                        <span className={r.dailyProfit >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {formatKsh(r.dailyProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly Profit</span>
                        <span className={r.monthlyProfit >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {formatKsh(r.monthlyProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Break-even Vol</span>
                        <span className="text-white font-semibold">{r.breakEvenVolume.toLocaleString()} L</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Input Fields & Calculator ──────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="size-4 text-amber-400" />
            Profit Calculator — Adjust Parameters
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Modify buy/sell prices, volumes, and operating costs to see real-time impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-700/50">
              {Object.keys(fuelData).map((name) => (
                <TabsTrigger key={name} value={name} className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(fuelData).map(([name, d]) => (
              <TabsContent key={name} value={name} className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Buy Price per Litre (Ksh)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={d.buyPrice || ''}
                      onChange={(e) => updateField(name, 'buyPrice', Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Sell Price per Litre (Ksh)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={d.sellPrice || ''}
                      onChange={(e) => updateField(name, 'sellPrice', Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Volume (Litres/Day)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={d.volume || ''}
                      onChange={(e) => updateField(name, 'volume', Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs">Operating Cost/Litre (Ksh)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={d.operatingCostPerLitre || ''}
                      onChange={(e) => updateField(name, 'operatingCostPerLitre', Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Inline calculation result for active tab */}
                {results[name] && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">Gross Margin/L</p>
                      <p className={`text-sm font-bold ${results[name].grossMarginPerLitre >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatKsh(results[name].grossMarginPerLitre)}
                      </p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">Gross Margin %</p>
                      <p className="text-sm font-bold text-white">{results[name].grossMarginPct.toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">Net Margin/L</p>
                      <p className={`text-sm font-bold ${results[name].netMarginPerLitre >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatKsh(results[name].netMarginPerLitre)}
                      </p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">Net Margin %</p>
                      <p className={`text-sm font-bold ${getMarginColor(results[name].netMarginPct).text}`}>
                        {results[name].netMarginPct.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">Total Profit (Mo)</p>
                      <p className={`text-sm font-bold ${results[name].monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatKsh(results[name].monthlyProfit)}
                      </p>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 mb-1">Break-even Vol</p>
                      <p className="text-sm font-bold text-white">{results[name].breakEvenVolume.toLocaleString()} L</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* ── What-If Scenarios & Sensitivity Analysis ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="size-4 text-amber-400" />
              Price Sensitivity — {activeTab}
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              What happens to monthly profit if buy/sell prices change by ±5% and ±10%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={sensitivityChartConfig} className="h-[280px] w-full">
              <BarChart data={sensitivityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                  {sensitivityData.map((entry, index) => {
                    const currentIdx = sensitivityData.findIndex((e) => e.name === 'Current');
                    const isCurrent = index === currentIdx;
                    const isPositive = entry.profit >= 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isCurrent ? '#f59e0b' : isPositive ? '#22c55e' : '#ef4444'}
                        opacity={isCurrent ? 1 : 0.7}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* ── What-If Summary Table ──────────────────────────────────────────── */}
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-amber-400" />
              What-If Scenario Details — {activeTab}
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Impact on profitability under different price conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 px-2 text-slate-400 font-medium">Scenario</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium">Monthly Profit</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium">Change</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const currentData = fuelData[activeTab];
                    if (!currentData) return null;
                    const baseProfit = calcFuel(currentData).monthlyProfit;
                    const scenarios = [
                      { label: 'Buy -10%', buyMult: 0.90, sellMult: 1.00 },
                      { label: 'Buy -5%', buyMult: 0.95, sellMult: 1.00 },
                      { label: 'Base Case', buyMult: 1.00, sellMult: 1.00 },
                      { label: 'Buy +5%', buyMult: 1.05, sellMult: 1.00 },
                      { label: 'Buy +10%', buyMult: 1.10, sellMult: 1.00 },
                      { label: 'Sell -10%', buyMult: 1.00, sellMult: 0.90 },
                      { label: 'Sell -5%', buyMult: 1.00, sellMult: 0.95 },
                      { label: 'Sell +5%', buyMult: 1.00, sellMult: 1.05 },
                      { label: 'Sell +10%', buyMult: 1.00, sellMult: 1.10 },
                    ];
                    return scenarios.map((s, idx) => {
                      const mod = { ...currentData, buyPrice: currentData.buyPrice * s.buyMult, sellPrice: currentData.sellPrice * s.sellMult };
                      const r = calcFuel(mod);
                      const change = baseProfit !== 0 ? ((r.monthlyProfit - baseProfit) / Math.abs(baseProfit)) * 100 : 0;
                      const isBase = s.buyMult === 1 && s.sellMult === 1;
                      return (
                        <tr key={idx} className={`border-b border-slate-700/30 ${isBase ? 'bg-amber-500/10' : ''}`}>
                          <td className="py-2 px-2 text-white font-medium">{s.label}</td>
                          <td className={`py-2 px-2 text-right font-semibold ${r.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatKsh(r.monthlyProfit)}
                          </td>
                          <td className={`py-2 px-2 text-right ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {change >= 0 ? <ArrowUpRight className="inline size-3" /> : <ArrowDownRight className="inline size-3" />}
                            {' '}{Math.abs(change).toFixed(1)}%
                          </td>
                          <td className={`py-2 px-2 text-right ${getMarginColor(r.netMarginPct).text}`}>
                            {r.netMarginPct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Break-even Chart ────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="size-4 text-amber-400" />
            Break-even Volume Analysis
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Minimum daily volume needed to cover operating costs per fuel type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={breakEvenChartConfig} className="h-[250px] w-full">
            <BarChart data={breakEvenChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `${v.toLocaleString()}L`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                {breakEvenChartData.map((entry, index) => {
                  const isBelowBreakEven = entry.currentVolume < entry.volume;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isBelowBreakEven ? '#ef4444' : '#22c55e'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="flex items-center justify-center gap-6 mt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-green-500" /> Above Break-even</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-500" /> Below Break-even</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Monthly Profit Projection ───────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="size-4 text-amber-400" />
            Monthly Profit Projection
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Based on average daily sales volumes over 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(fuelData).map(([name, d]) => {
              const r = results[name];
              if (!r) return null;
              const marginColor = getMarginColor(r.netMarginPct);
              return (
                <div key={name} className="bg-slate-700/30 rounded-xl p-4 space-y-3 border border-slate-600/30 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Fuel className="size-4 text-amber-400" />
                      {name}
                    </span>
                    <Badge className={`${marginColor.badge} border text-[10px]`}>
                      {r.netMarginPct.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Daily Volume</span>
                      <span className="text-white">{d.volume.toLocaleString()} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net Margin/L</span>
                      <span className={r.netMarginPerLitre >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatKsh(r.netMarginPerLitre)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Daily Profit</span>
                      <span className={r.dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatKsh(r.dailyProfit)}
                      </span>
                    </div>
                    <div className="h-px bg-slate-600/50" />
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 font-medium">Monthly (30d)</span>
                      <span className={`font-bold ${r.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatKsh(r.monthlyProfit)}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar showing % contribution to total profit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Contribution to Total</span>
                      <span>{totalMonthlyProfit !== 0 ? ((r.monthlyProfit / totalMonthlyProfit) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
                        style={{ width: `${totalMonthlyProfit !== 0 ? Math.max(0, (r.monthlyProfit / totalMonthlyProfit) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Monthly Projection */}
          <div className="mt-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total Projected Monthly Profit</p>
                <p className="text-2xl font-bold text-amber-400">{formatKsh(totalMonthlyProfit)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Daily Average</p>
                <p className="text-lg font-semibold text-white">{formatKsh(totalMonthlyProfit / 30)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tax Impact Section ──────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400" />
            Tax Impact on Profit
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            VAT (16%) and Excise Duty impact on monthly profitability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {Object.entries(results).map(([name, r]) => (
              <div key={name} className="bg-slate-700/30 rounded-xl p-4 space-y-3 border border-slate-600/30">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Fuel className="size-4 text-amber-400" />
                  {name}
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Monthly Profit</span>
                    <span className="text-white font-semibold">{formatKsh(r.monthlyProfit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">VAT (16%)</span>
                    <span className="text-red-400 font-semibold">-{formatKsh(r.vatImpact)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Excise Duty (~8%)</span>
                    <span className="text-red-400 font-semibold">-{formatKsh(r.exciseDuty)}</span>
                  </div>
                  <div className="h-px bg-slate-600/50" />
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">Profit After Tax</span>
                    <span className={`font-bold ${r.profitAfterTax >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatKsh(r.profitAfterTax)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Effective Tax Rate</span>
                    <span className="text-amber-400 font-semibold">
                      {r.monthlyProfit > 0 ? (((r.vatImpact + r.exciseDuty) / r.monthlyProfit) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>

                {/* Visual tax impact bar */}
                <div className="space-y-1">
                  <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden flex">
                    {r.monthlyProfit > 0 && (
                      <>
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${(r.profitAfterTax / r.monthlyProfit) * 100}%` }}
                          title="After-tax profit"
                        />
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${(r.vatImpact / r.monthlyProfit) * 100}%` }}
                          title="VAT"
                        />
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{ width: `${(r.exciseDuty / r.monthlyProfit) * 100}%` }}
                          title="Excise Duty"
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-green-500" /> Profit</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-red-500" /> VAT</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-500" /> Excise</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tax Summary */}
          <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
            <h4 className="text-sm font-bold text-white mb-3">Tax Impact Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="text-center">
                <p className="text-slate-400">Total VAT</p>
                <p className="text-lg font-bold text-red-400">
                  {formatKsh(Object.values(results).reduce((s, r) => s + r.vatImpact, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-400">Total Excise Duty</p>
                <p className="text-lg font-bold text-red-400">
                  {formatKsh(Object.values(results).reduce((s, r) => s + r.exciseDuty, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-400">Total Tax Burden</p>
                <p className="text-lg font-bold text-amber-400">
                  {formatKsh(Object.values(results).reduce((s, r) => s + r.vatImpact + r.exciseDuty, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-400">Net Profit After Tax</p>
                <p className={`text-lg font-bold ${Object.values(results).reduce((s, r) => s + r.profitAfterTax, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatKsh(Object.values(results).reduce((s, r) => s + r.profitAfterTax, 0))}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Reference: Margin Zones ───────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="size-4 text-amber-400" />
            Margin Health Reference
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Understanding profitability zones for fuel retail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center hover:border-green-500/40 transition-colors">
              <div className="size-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="size-5 text-green-400" />
              </div>
              <h4 className="text-sm font-bold text-green-400 mb-1">Healthy (&gt;15%)</h4>
              <p className="text-[10px] text-slate-400">Strong margins. Room for competitive pricing and promotional offers.</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center hover:border-amber-500/40 transition-colors">
              <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="size-5 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-amber-400 mb-1">Moderate (5-15%)</h4>
              <p className="text-[10px] text-slate-400">Acceptable but watch costs closely. Limited room for price changes.</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center hover:border-red-500/40 transition-colors">
              <div className="size-10 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-2">
                <TrendingDown className="size-5 text-red-400" />
              </div>
              <h4 className="text-sm font-bold text-red-400 mb-1">At Risk (&lt;5%)</h4>
              <p className="text-[10px] text-slate-400">Dangerous territory. Immediate action needed to renegotiate or increase prices.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
