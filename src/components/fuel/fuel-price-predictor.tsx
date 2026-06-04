'use client';

import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  Fuel,
  Calculator,
  Shield,
  BarChart3,
  Mail,
  Phone,
  Zap,
  Percent,
  ChevronRight,
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useFuelStore } from '@/store/fuel-store';

// ─── Chart configs ──────────────────────────────────────────────────────────

const priceTrendConfig: ChartConfig = {
  pms: { label: 'PMS (Ksh/L)', color: '#22c55e' },
  ago: { label: 'AGO (Ksh/L)', color: '#f59e0b' },
  dpk: { label: 'DPK (Ksh/L)', color: '#3b82f6' },
};

const marginConfig: ChartConfig = {
  margin: { label: 'Margin/L (Ksh)', color: '#22c55e' },
  buying: { label: 'Buying (Ksh)', color: '#ef4444' },
  selling: { label: 'Selling (Ksh)', color: '#22c55e' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Generate 30-day mock price data ────────────────────────────────────────

function generatePriceHistory(currentPms: number, currentAgo: number) {
  const data: { date: string; pms: number; ago: number; dpk: number }[] = [];
  const basePms = currentPms || 195.5;
  const baseAgo = currentAgo || 180.2;
  const baseDpk = 168.3;

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayFactor = Math.sin(i * 0.3) * 2 + (Math.random() - 0.5) * 3;
    data.push({
      date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
      pms: Math.round((basePms + dayFactor + (29 - i) * 0.15) * 100) / 100,
      ago: Math.round((baseAgo + dayFactor * 0.8 + (29 - i) * 0.12) * 100) / 100,
      dpk: Math.round((baseDpk + dayFactor * 0.6 + (29 - i) * 0.08) * 100) / 100,
    });
  }
  return data;
}

// ─── Linear extrapolation for price prediction ──────────────────────────────

function predictPrices(history: { pms: number; ago: number; dpk: number }[]) {
  const last7 = history.slice(-7);
  if (last7.length < 2) return { pms: [], ago: [], dpk: [] };

  function linearExtrapolate(values: number[]): number[] {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean);
      den += (i - xMean) * (i - xMean);
    }
    if (den === 0) return Array(7).fill(yMean);
    const m = num / den;
    const b = yMean - m * xMean;
    const predictions: number[] = [];
    for (let i = 0; i < 7; i++) {
      predictions.push(Math.round((m * (n + i) + b) * 100) / 100);
    }
    return predictions;
  }

  return {
    pms: linearExtrapolate(last7.map((d) => d.pms)),
    ago: linearExtrapolate(last7.map((d) => d.ago)),
    dpk: linearExtrapolate(last7.map((d) => d.dpk)),
  };
}

// ─── EPRA Regulated Prices (Kenya) ──────────────────────────────────────────

const epraPrices = {
  pms: 192.68,
  ago: 179.43,
  dpk: 167.21,
};

// ─── Mock competitor data ───────────────────────────────────────────────────

const competitors = [
  { name: 'Shell - Mombasa Rd', pms: 198.50, ago: 183.00, dpk: 170.50, distance: '0.8 km' },
  { name: 'Total - Uhuru Hwy', pms: 197.00, ago: 181.50, dpk: 169.00, distance: '1.2 km' },
  { name: 'National Oil - CBD', pms: 196.50, ago: 182.00, dpk: 168.50, distance: '1.5 km' },
  { name: 'Kenol - Jogoo Rd', pms: 199.00, ago: 184.00, dpk: 171.00, distance: '2.0 km' },
  { name: 'Oil Libya - Haile', pms: 197.50, ago: 180.50, dpk: 169.50, distance: '2.5 km' },
];

// ─── Market factors ─────────────────────────────────────────────────────────

const marketFactors = [
  {
    name: 'Crude Oil Price',
    value: '$78.45/bbl',
    change: +2.3,
    icon: Globe,
    color: 'green',
    description: 'Brent crude up on OPEC+ supply concerns',
  },
  {
    name: 'USD/KES Rate',
    value: 'Ksh 153.2',
    change: -0.4,
    icon: DollarSign,
    color: 'amber',
    description: 'Shilling strengthening slightly against USD',
  },
  {
    name: 'Government Tax',
    value: 'Ksh 52.45/L',
    change: 0,
    icon: Shield,
    color: 'red',
    description: 'No changes in current tax structure',
  },
  {
    name: 'Supply Chain',
    value: 'Stable',
    change: +0.5,
    icon: Zap,
    color: 'blue',
    description: 'Import volumes steady, no disruptions',
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function FuelPricePredictor() {
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const salesArr = useMemo(() => Object.values(salesHistory), [salesHistory]);

  // ─── Price History ─────────────────────────────────────────────────────

  const priceHistory = useMemo(() => generatePriceHistory(pmsPrice, agoPrice), [pmsPrice, agoPrice]);

  // ─── Price Predictions ─────────────────────────────────────────────────

  const predictions = useMemo(() => predictPrices(priceHistory), [priceHistory]);

  const predictionData = useMemo(() => {
    const items: { date: string; pms: number; ago: number; dpk: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      items.push({
        date: d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' }),
        pms: predictions.pms[i],
        ago: predictions.ago[i],
        dpk: predictions.dpk[i],
      });
    }
    return items;
  }, [predictions]);

  // ─── Current Prices ────────────────────────────────────────────────────

  const currentPms = pmsPrice || priceHistory[priceHistory.length - 1]?.pms || 195.5;
  const currentAgo = agoPrice || priceHistory[priceHistory.length - 1]?.ago || 180.2;
  const currentDpk = priceHistory[priceHistory.length - 1]?.dpk || 168.3;

  const prevPms = priceHistory[priceHistory.length - 2]?.pms || currentPms;
  const prevAgo = priceHistory[priceHistory.length - 2]?.ago || currentAgo;
  const prevDpk = priceHistory[priceHistory.length - 2]?.dpk || currentDpk;

  const pmsChange = currentPms - prevPms;
  const agoChange = currentAgo - prevAgo;
  const dpkChange = currentDpk - prevDpk;

  // ─── Margin Analysis ───────────────────────────────────────────────────

  const marginData = useMemo(() => {
    const days: { date: string; margin: number; buying: number; selling: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const idx = priceHistory.length - 1 - i;
      const histEntry = idx >= 0 ? priceHistory[idx] : priceHistory[0];

      // Estimate buying price at ~85% of selling
      const pmsBuying = histEntry.pms * 0.85;
      const sellingPrice = histEntry.pms;
      const margin = sellingPrice - pmsBuying;

      days.push({
        date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        margin: Math.round(margin * 100) / 100,
        buying: Math.round(pmsBuying * 100) / 100,
        selling: Math.round(sellingPrice * 100) / 100,
      });
    }
    return days;
  }, [priceHistory]);

  // ─── Price Alert Form ──────────────────────────────────────────────────

  const [alertFuel, setAlertFuel] = useState('pms');
  const [alertCondition, setAlertCondition] = useState('above');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertMethod, setAlertMethod] = useState('email');
  const [alertSubmitted, setAlertSubmitted] = useState(false);

  const handleAlertSubmit = () => {
    setAlertSubmitted(true);
    setTimeout(() => setAlertSubmitted(false), 3000);
  };

  // ─── EPRA Comparison ───────────────────────────────────────────────────

  const epraComparison = useMemo(() => {
    const pmsMargin = currentPms - epraPrices.pms;
    const agoMargin = currentAgo - epraPrices.ago;
    const dpkMargin = currentDpk - epraPrices.dpk;
    return [
      { fuel: 'PMS', epra: epraPrices.pms, actual: currentPms, margin: pmsMargin },
      { fuel: 'AGO', epra: epraPrices.ago, actual: currentAgo, margin: agoMargin },
      { fuel: 'DPK', epra: epraPrices.dpk, actual: currentDpk, margin: dpkMargin },
    ];
  }, [currentPms, currentAgo, currentDpk]);

  // ─── Price Recommendation ──────────────────────────────────────────────

  const recommendation = useMemo(() => {
    const avgMargin = epraComparison.reduce((sum, e) => sum + e.margin, 0) / epraComparison.length;
    const avgCompetitorPms = competitors.reduce((sum, c) => sum + c.pms, 0) / competitors.length;

    if (avgMargin < 3) {
      return {
        action: 'Increase Prices',
        description: `Your average margin over EPRA is only Ksh ${avgMargin.toFixed(2)}/L. Consider raising PMS to Ksh ${(avgCompetitorPms * 0.98).toFixed(2)} to remain competitive while improving margins.`,
        type: 'warning' as const,
      };
    }
    if (avgMargin > 10) {
      return {
        action: 'Consider Price Reduction',
        description: `Your margins are high (Ksh ${avgMargin.toFixed(2)}/L above EPRA). Reducing slightly could attract more customers from nearby competitors without significant revenue loss.`,
        type: 'info' as const,
      };
    }
    return {
      action: 'Maintain Current Prices',
      description: `Your pricing is well-positioned with a healthy margin of Ksh ${avgMargin.toFixed(2)}/L above EPRA rates. You're competitive with nearby stations.`,
      type: 'success' as const,
    };
  }, [epraComparison]);

  // ─── Combined Price Trend + Prediction Chart Data ─────────────────────

  const combinedTrendData = useMemo(() => {
    return [
      ...priceHistory.map((d) => ({ ...d, type: 'actual' })),
      ...predictionData.map((d) => ({ ...d, type: 'predicted' })),
    ];
  }, [priceHistory, predictionData]);

  const trendWithPredictionConfig: ChartConfig = {
    pms: { label: 'PMS (Ksh/L)', color: '#22c55e' },
    ago: { label: 'AGO (Ksh/L)', color: '#f59e0b' },
    dpk: { label: 'DPK (Ksh/L)', color: '#3b82f6' },
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Current Prices Card ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* PMS */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-green-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">PMS / Super</span>
            </div>
            <div className="text-2xl font-bold">{formatKsh(currentPms)}</div>
            <div className="text-[10px] text-slate-500">per litre</div>
            <div className="flex items-center gap-1 mt-2">
              {pmsChange > 0 ? (
                <ArrowUpRight className="size-3 text-green-400" />
              ) : pmsChange < 0 ? (
                <ArrowDownRight className="size-3 text-red-400" />
              ) : (
                <Minus className="size-3 text-slate-400" />
              )}
              <span className={`text-xs ${pmsChange > 0 ? 'text-green-400' : pmsChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {pmsChange > 0 ? '+' : ''}{pmsChange.toFixed(2)} from yesterday
              </span>
            </div>
          </CardContent>
        </Card>

        {/* AGO */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-amber-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">AGO / Diesel</span>
            </div>
            <div className="text-2xl font-bold">{formatKsh(currentAgo)}</div>
            <div className="text-[10px] text-slate-500">per litre</div>
            <div className="flex items-center gap-1 mt-2">
              {agoChange > 0 ? (
                <ArrowUpRight className="size-3 text-green-400" />
              ) : agoChange < 0 ? (
                <ArrowDownRight className="size-3 text-red-400" />
              ) : (
                <Minus className="size-3 text-slate-400" />
              )}
              <span className={`text-xs ${agoChange > 0 ? 'text-green-400' : agoChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {agoChange > 0 ? '+' : ''}{agoChange.toFixed(2)} from yesterday
              </span>
            </div>
          </CardContent>
        </Card>

        {/* DPK */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Fuel className="size-4 text-blue-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">DPK / Kerosene</span>
            </div>
            <div className="text-2xl font-bold">{formatKsh(currentDpk)}</div>
            <div className="text-[10px] text-slate-500">per litre</div>
            <div className="flex items-center gap-1 mt-2">
              {dpkChange > 0 ? (
                <ArrowUpRight className="size-3 text-green-400" />
              ) : dpkChange < 0 ? (
                <ArrowDownRight className="size-3 text-red-400" />
              ) : (
                <Minus className="size-3 text-slate-400" />
              )}
              <span className={`text-xs ${dpkChange > 0 ? 'text-green-400' : dpkChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {dpkChange > 0 ? '+' : ''}{dpkChange.toFixed(2)} from yesterday
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Price Trend Chart (30-day) ──────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Price Trend (30 Days)</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Historical prices with 7-day prediction</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] bg-slate-700/50 text-slate-300">
                <span className="size-2 rounded-full bg-green-500 mr-1 inline-block" /> Actual
              </Badge>
              <Badge className="text-[10px] bg-slate-700/50 text-slate-300 border-dashed">
                <span className="size-2 rounded-full bg-green-500/50 mr-1 inline-block" /> Predicted
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendWithPredictionConfig} className="h-[280px] w-full">
            <AreaChart data={combinedTrendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="pmsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="agoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} interval={4} />
              <YAxis stroke="#94a3b8" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} tickFormatter={(v: number) => `${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <ReferenceLine
                x={priceHistory[priceHistory.length - 1]?.date}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{ value: 'Today', position: 'top', fill: '#94a3b8', fontSize: 10 }}
              />
              <Area type="monotone" dataKey="pms" stroke="var(--color-pms)" fill="url(#pmsGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="ago" stroke="var(--color-ago)" fill="url(#agoGrad)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="dpk" stroke="var(--color-dpk)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ── Price Prediction + EPRA Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Price Prediction Card */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white border-amber-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="size-4 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">7-Day Price Prediction</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Linear extrapolation from recent trends</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {predictionData.map((pred, i) => {
                const prevPmsPred = i > 0 ? predictions.pms[i - 1] : currentPms;
                const pmsDiff = pred.pms - prevPmsPred;
                return (
                  <div key={i} className="flex items-center justify-between bg-slate-700/40 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600/50 text-slate-400'}`}>
                        {i + 1}
                      </div>
                      <span className="text-xs text-slate-300">{pred.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-semibold">{formatKsh(pred.pms)}</div>
                        <div className="flex items-center gap-0.5">
                          {pmsDiff > 0 ? (
                            <ArrowUpRight className="size-2.5 text-green-400" />
                          ) : pmsDiff < 0 ? (
                            <ArrowDownRight className="size-2.5 text-red-400" />
                          ) : (
                            <Minus className="size-2.5 text-slate-400" />
                          )}
                          <span className={`text-[10px] ${pmsDiff > 0 ? 'text-green-400' : pmsDiff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {pmsDiff > 0 ? '+' : ''}{pmsDiff.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-amber-400" />
                <span className="text-[10px] text-amber-300">Predictions are based on simple linear trends and may not reflect sudden market changes.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EPRA Price Comparison */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">EPRA Price Comparison</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Regulated prices vs your selling prices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {epraComparison.map((item) => (
                <div key={item.fuel} className="bg-slate-700/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-200">{item.fuel}</span>
                    <Badge className={`text-[10px] ${item.margin > 5 ? 'bg-green-500/20 text-green-400' : item.margin > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {item.margin > 0 ? '+' : ''}{item.margin.toFixed(2)} margin
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center bg-slate-600/40 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400">EPRA</div>
                      <div className="text-sm font-bold">{item.epra.toFixed(2)}</div>
                    </div>
                    <div className="text-center bg-slate-600/40 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400">Your Price</div>
                      <div className="text-sm font-bold text-green-400">{item.actual.toFixed(2)}</div>
                    </div>
                    <div className="text-center bg-slate-600/40 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400">Margin</div>
                      <div className={`text-sm font-bold ${item.margin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.margin > 0 ? '+' : ''}{item.margin.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Avg Margin Above EPRA</span>
                <span className="text-sm font-bold text-green-400">
                  +{((currentPms - epraPrices.pms + currentAgo - epraPrices.ago + currentDpk - epraPrices.dpk) / 3).toFixed(2)} Ksh/L
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Margin Analysis Chart ──────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Percent className="size-4 text-amber-400" />
            <div>
              <CardTitle className="text-sm font-semibold">Margin Analysis (14 Days)</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Profit margin per litre - PMS buying vs selling</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={marginConfig} className="h-[220px] w-full">
            <BarChart data={marginData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v: number) => `${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="margin" fill="var(--color-margin)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-slate-700/40 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Avg Margin/L</div>
              <div className="text-sm font-bold text-green-400">
                Ksh {(marginData.reduce((s, d) => s + d.margin, 0) / marginData.length).toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Best Day</div>
              <div className="text-sm font-bold text-amber-400">
                Ksh {Math.max(...marginData.map((d) => d.margin)).toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-400 uppercase">Margin %</div>
              <div className="text-sm font-bold text-cyan-400">
                {((marginData[marginData.length - 1]?.margin || 0) / (marginData[marginData.length - 1]?.selling || 1) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Market Factors + Price Alert Row ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Market Factors */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Market Factors</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Factors affecting fuel prices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {marketFactors.map((factor) => (
              <div key={factor.name} className="bg-slate-700/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`size-7 rounded-lg flex items-center justify-center ${
                      factor.color === 'green' ? 'bg-green-500/20' :
                      factor.color === 'amber' ? 'bg-amber-500/20' :
                      factor.color === 'red' ? 'bg-red-500/20' :
                      'bg-blue-500/20'
                    }`}>
                      <factor.icon className={`size-3.5 ${
                        factor.color === 'green' ? 'text-green-400' :
                        factor.color === 'amber' ? 'text-amber-400' :
                        factor.color === 'red' ? 'text-red-400' :
                        'text-blue-400'
                      }`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{factor.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{factor.value}</span>
                    {factor.change !== 0 ? (
                      <Badge className={`text-[10px] ${factor.change > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {factor.change > 0 ? <ArrowUpRight className="size-3 mr-0.5" /> : <ArrowDownRight className="size-3 mr-0.5" />}
                        {Math.abs(factor.change)}%
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-slate-600/50 text-slate-400">No change</Badge>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 ml-9">{factor.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Price Alert Setup */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Price Alert Setup</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Get notified when prices cross thresholds</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Fuel Type</Label>
              <Select value={alertFuel} onValueChange={setAlertFuel}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="pms">PMS / Super</SelectItem>
                  <SelectItem value="ago">AGO / Diesel</SelectItem>
                  <SelectItem value="dpk">DPK / Kerosene</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Condition</Label>
              <Select value={alertCondition} onValueChange={setAlertCondition}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="above">Price goes above</SelectItem>
                  <SelectItem value="below">Price goes below</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Threshold Price (Ksh/L)</Label>
              <Input
                type="number"
                placeholder="e.g. 200.00"
                value={alertPrice}
                onChange={(e) => setAlertPrice(e.target.value)}
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Notification Method</Label>
              <Select value={alertMethod} onValueChange={setAlertMethod}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="email">
                    <span className="flex items-center gap-2"><Mail className="size-3" /> Email</span>
                  </SelectItem>
                  <SelectItem value="sms">
                    <span className="flex items-center gap-2"><Phone className="size-3" /> SMS</span>
                  </SelectItem>
                  <SelectItem value="both">
                    <span className="flex items-center gap-2"><Bell className="size-3" /> Both</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAlertSubmit}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              disabled={!alertPrice}
            >
              {alertSubmitted ? (
                <span className="flex items-center gap-2">✓ Alert Created!</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Bell className="size-4" />
                  Create Alert
                </span>
              )}
            </Button>

            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase mb-2">Active Alerts</div>
              <div className="text-xs text-slate-500">No active alerts. Create one above to get started.</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Competitor Analysis + Price Recommendation Row ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Competitor Analysis */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Competitor Analysis</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Nearby station prices comparison</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 pr-2 text-slate-400 font-medium">Station</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium">PMS</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium">AGO</th>
                    <th className="text-right py-2 px-2 text-slate-400 font-medium">DPK</th>
                    <th className="text-right py-2 pl-2 text-slate-400 font-medium">Dist.</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Your station row */}
                  <tr className="border-b border-slate-700/30 bg-amber-500/5">
                    <td className="py-2 pr-2 font-semibold text-amber-400">Your Station</td>
                    <td className="text-right py-2 px-2 font-bold text-green-400">{currentPms.toFixed(2)}</td>
                    <td className="text-right py-2 px-2 font-bold text-amber-400">{currentAgo.toFixed(2)}</td>
                    <td className="text-right py-2 px-2 font-bold text-blue-400">{currentDpk.toFixed(2)}</td>
                    <td className="text-right py-2 pl-2 text-slate-500">—</td>
                  </tr>
                  {competitors.map((comp) => {
                    const pmsDiff = comp.pms - currentPms;
                    return (
                      <tr key={comp.name} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                        <td className="py-2 pr-2 text-slate-300">{comp.name}</td>
                        <td className={`text-right py-2 px-2 ${pmsDiff > 0 ? 'text-green-400' : pmsDiff < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                          {comp.pms.toFixed(2)}
                          <span className="text-[9px] ml-0.5">({pmsDiff > 0 ? '+' : ''}{pmsDiff.toFixed(2)})</span>
                        </td>
                        <td className="text-right py-2 px-2 text-slate-300">{comp.ago.toFixed(2)}</td>
                        <td className="text-right py-2 px-2 text-slate-300">{comp.dpk.toFixed(2)}</td>
                        <td className="text-right py-2 pl-2 text-slate-500">{comp.distance}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-2 bg-slate-700/30 rounded-lg p-3">
              <Calculator className="size-3.5 text-amber-400" />
              <span className="text-[10px] text-slate-400">
                Avg competitor PMS: <span className="font-semibold text-slate-200">{(competitors.reduce((s, c) => s + c.pms, 0) / competitors.length).toFixed(2)}</span>
                {' '}&middot; You are{' '}
                <span className={currentPms <= (competitors.reduce((s, c) => s + c.pms, 0) / competitors.length) ? 'text-green-400' : 'text-red-400'}>
                  {currentPms <= (competitors.reduce((s, c) => s + c.pms, 0) / competitors.length) ? 'below' : 'above'}
                </span>
                {' '}average
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Price Recommendation */}
        <Card className={`bg-slate-800/60 border-slate-700/50 text-white ${
          recommendation.type === 'warning' ? 'border-amber-500/30' :
          recommendation.type === 'info' ? 'border-blue-500/30' :
          'border-green-500/30'
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className={`size-8 rounded-lg flex items-center justify-center ${
                recommendation.type === 'warning' ? 'bg-amber-500/20' :
                recommendation.type === 'info' ? 'bg-blue-500/20' :
                'bg-green-500/20'
              }`}>
                <TrendingUp className={`size-4 ${
                  recommendation.type === 'warning' ? 'text-amber-400' :
                  recommendation.type === 'info' ? 'text-blue-400' :
                  'text-green-400'
                }`} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Price Recommendation</CardTitle>
                <CardDescription className="text-slate-400 text-xs">AI-suggested pricing strategy</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-xl p-4 ${
              recommendation.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
              recommendation.type === 'info' ? 'bg-blue-500/10 border border-blue-500/20' :
              'bg-green-500/10 border border-green-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`text-xs ${
                  recommendation.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                  recommendation.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {recommendation.action}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{recommendation.description}</p>
            </div>

            {/* Suggested Prices */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Suggested Pricing</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-400">PMS</div>
                  <div className="text-lg font-bold text-green-400">
                    {Math.max(currentPms, epraPrices.pms + 5).toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-500">Ksh/L</div>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-400">AGO</div>
                  <div className="text-lg font-bold text-amber-400">
                    {Math.max(currentAgo, epraPrices.ago + 4).toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-500">Ksh/L</div>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-400">DPK</div>
                  <div className="text-lg font-bold text-blue-400">
                    {Math.max(currentDpk, epraPrices.dpk + 3).toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-500">Ksh/L</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                <span className="text-xs text-slate-400">Expected Margin/L</span>
                <span className="text-xs font-bold text-green-400">
                  Ksh {((Math.max(currentPms, epraPrices.pms + 5) - epraPrices.pms * 0.85)).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                <span className="text-xs text-slate-400">Competitiveness</span>
                <span className="text-xs font-bold text-amber-400">
                  {currentPms <= (competitors.reduce((s, c) => s + c.pms, 0) / competitors.length) ? 'Above Average' : 'Below Average'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                <span className="text-xs text-slate-400">Market Trend</span>
                <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  Slightly Upward
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
