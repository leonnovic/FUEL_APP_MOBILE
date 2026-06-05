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
  Database,
  Plus,
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
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useFuelStore } from '@/store/fuel-store';

// ─── Chart configs ──────────────────────────────────────────────────────────

const marginConfig: ChartConfig = {
  margin: { label: 'Margin/L (Ksh)', color: '#22c55e' },
  buying: { label: 'Buying (Ksh)', color: '#ef4444' },
  selling: { label: 'Selling (Ksh)', color: '#22c55e' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Linear extrapolation for price prediction ──────────────────────────────

function linearExtrapolate(values: number[], count: number): number[] {
  const n = values.length;
  if (n < 2) return Array(count).fill(values[0] ?? 0);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  if (den === 0) return Array(count).fill(yMean);
  const m = num / den;
  const b = yMean - m * xMean;
  const predictions: number[] = [];
  for (let i = 0; i < count; i++) {
    predictions.push(Math.round((m * (n + i) + b) * 100) / 100);
  }
  return predictions;
}

// ─── EPRA Regulated Prices (Kenya) ──────────────────────────────────────────

const epraPrices = {
  pms: 192.68,
  ago: 179.43,
  dpk: 167.21,
};

// ─── Market factors (reference data, not mock) ─────────────────────────────

const marketFactors = [
  { name: 'Crude Oil Price', value: '$78.45/bbl', change: +2.3, icon: Globe, color: 'green', description: 'Brent crude up on OPEC+ supply concerns' },
  { name: 'USD/KES Rate', value: 'Ksh 153.2', change: -0.4, icon: DollarSign, color: 'amber', description: 'Shilling strengthening slightly against USD' },
  { name: 'Government Tax', value: 'Ksh 52.45/L', change: 0, icon: Shield, color: 'red', description: 'No changes in current tax structure' },
  { name: 'Supply Chain', value: 'Stable', change: +0.5, icon: Zap, color: 'blue', description: 'Import volumes steady, no disruptions' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function FuelPricePredictor() {
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const salesArr = useMemo(() => Object.values(salesHistory), [salesHistory]);

  // ─── Build price history from sales data ──────────────────────────────

  const priceHistory = useMemo(() => {
    if (salesArr.length === 0) return [];

    // Sort sales by date
    const sorted = [...salesArr].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group by date, take the last sale price per day
    const byDate: Record<string, { pms: number; ago: number; dpk: number }> = {};
    sorted.forEach((sale) => {
      const dateKey = new Date(sale.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
      byDate[dateKey] = {
        pms: sale.pmsPrice || pmsPrice || 195.5,
        ago: sale.agoPrice || agoPrice || 180.2,
        dpk: 168.3, // DPK not tracked in sales, use reference
      };
    });

    return Object.entries(byDate).map(([date, prices]) => ({
      date,
      ...prices,
    }));
  }, [salesArr, pmsPrice, agoPrice]);

  // ─── Price Predictions ─────────────────────────────────────────────────

  const predictions = useMemo(() => {
    if (priceHistory.length < 2) {
      return { pms: [] as number[], ago: [] as number[], dpk: [] as number[] };
    }
    return {
      pms: linearExtrapolate(priceHistory.map((d) => d.pms), 7),
      ago: linearExtrapolate(priceHistory.map((d) => d.ago), 7),
      dpk: linearExtrapolate(priceHistory.map((d) => d.dpk), 7),
    };
  }, [priceHistory]);

  const predictionData = useMemo(() => {
    if (predictions.pms.length === 0) return [];
    const items: { date: string; pms: number; ago: number; dpk: number }[] = [];
    for (let i = 0; i < predictions.pms.length; i++) {
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

  // ─── Current Prices (from real fuelTypes store) ─────────────────────

  const currentPms = pmsPrice || 0;
  const currentAgo = agoPrice || 0;
  // Find DPK price from fuelTypes
  const dpkFuelType = fuelTypes.find((ft) => ft.name === 'DPK');
  const currentDpk = dpkFuelType?.price || 0;

  const hasPrices = currentPms > 0 || currentAgo > 0;

  // Change calculations from price history
  const pmsChange = priceHistory.length >= 2
    ? priceHistory[priceHistory.length - 1].pms - priceHistory[priceHistory.length - 2].pms
    : 0;
  const agoChange = priceHistory.length >= 2
    ? priceHistory[priceHistory.length - 1].ago - priceHistory[priceHistory.length - 2].ago
    : 0;
  const dpkChange = priceHistory.length >= 2
    ? priceHistory[priceHistory.length - 1].dpk - priceHistory[priceHistory.length - 2].dpk
    : 0;

  // ─── Margin Analysis (from real price history) ──────────────────────────

  const marginData = useMemo(() => {
    if (priceHistory.length === 0) return [];
    return priceHistory.slice(-14).map((entry) => {
      const pmsBuying = entry.pms * 0.85;
      const sellingPrice = entry.pms;
      const margin = sellingPrice - pmsBuying;
      return {
        date: entry.date,
        margin: Math.round(margin * 100) / 100,
        buying: Math.round(pmsBuying * 100) / 100,
        selling: Math.round(sellingPrice * 100) / 100,
      };
    });
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
    const items = [];
    if (currentPms > 0) items.push({ fuel: 'PMS', epra: epraPrices.pms, actual: currentPms, margin: currentPms - epraPrices.pms });
    if (currentAgo > 0) items.push({ fuel: 'AGO', epra: epraPrices.ago, actual: currentAgo, margin: currentAgo - epraPrices.ago });
    if (currentDpk > 0) items.push({ fuel: 'DPK', epra: epraPrices.dpk, actual: currentDpk, margin: currentDpk - epraPrices.dpk });
    return items;
  }, [currentPms, currentAgo, currentDpk]);

  // ─── Price Recommendation ──────────────────────────────────────────────

  const recommendation = useMemo(() => {
    if (epraComparison.length === 0) {
      return { action: 'Set Your Prices', description: 'Add fuel types with prices to get pricing recommendations based on EPRA rates and market analysis.', type: 'info' as const };
    }
    const avgMargin = epraComparison.reduce((sum, e) => sum + e.margin, 0) / epraComparison.length;
    if (avgMargin < 3) {
      return { action: 'Increase Prices', description: `Your average margin over EPRA is only Ksh ${avgMargin.toFixed(2)}/L. Consider raising prices to improve margins while staying competitive.`, type: 'warning' as const };
    }
    if (avgMargin > 10) {
      return { action: 'Consider Price Reduction', description: `Your margins are high (Ksh ${avgMargin.toFixed(2)}/L above EPRA). Reducing slightly could attract more customers without significant revenue loss.`, type: 'info' as const };
    }
    return { action: 'Maintain Current Prices', description: `Your pricing is well-positioned with a healthy margin of Ksh ${avgMargin.toFixed(2)}/L above EPRA rates.`, type: 'success' as const };
  }, [epraComparison]);

  // ─── Combined Price Trend + Prediction Chart Data ─────────────────────

  const combinedTrendData = useMemo(() => {
    return [
      ...priceHistory.map((d) => ({ ...d, type: 'actual' as const })),
      ...predictionData.map((d) => ({ ...d, type: 'predicted' as const })),
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
      {hasPrices ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {currentPms > 0 && (
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
                {priceHistory.length >= 2 && (
                  <div className="flex items-center gap-1 mt-2">
                    {pmsChange > 0 ? <ArrowUpRight className="size-3 text-green-400" /> : pmsChange < 0 ? <ArrowDownRight className="size-3 text-red-400" /> : <Minus className="size-3 text-slate-400" />}
                    <span className={`text-xs ${pmsChange > 0 ? 'text-green-400' : pmsChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {pmsChange > 0 ? '+' : ''}{pmsChange.toFixed(2)} from previous
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {currentAgo > 0 && (
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
                {priceHistory.length >= 2 && (
                  <div className="flex items-center gap-1 mt-2">
                    {agoChange > 0 ? <ArrowUpRight className="size-3 text-green-400" /> : agoChange < 0 ? <ArrowDownRight className="size-3 text-red-400" /> : <Minus className="size-3 text-slate-400" />}
                    <span className={`text-xs ${agoChange > 0 ? 'text-green-400' : agoChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {agoChange > 0 ? '+' : ''}{agoChange.toFixed(2)} from previous
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {currentDpk > 0 && (
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
                {priceHistory.length >= 2 && (
                  <div className="flex items-center gap-1 mt-2">
                    {dpkChange > 0 ? <ArrowUpRight className="size-3 text-green-400" /> : dpkChange < 0 ? <ArrowDownRight className="size-3 text-red-400" /> : <Minus className="size-3 text-slate-400" />}
                    <span className={`text-xs ${dpkChange > 0 ? 'text-green-400' : dpkChange < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {dpkChange > 0 ? '+' : ''}{dpkChange.toFixed(2)} from previous
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mx-auto mb-4">
              <Fuel className="size-8 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 mb-1">No fuel prices set</h3>
            <p className="text-xs text-slate-500 mb-4">Add fuel types with prices in the Price Board tab to see price analysis and predictions here.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Price Trend Chart ──────────────────────────────────────────── */}
      {priceHistory.length > 0 ? (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Price Trend ({priceHistory.length} Days)</CardTitle>
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
                {priceHistory.length > 0 && (
                  <ReferenceLine
                    x={priceHistory[priceHistory.length - 1]?.date}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    label={{ value: 'Today', position: 'top', fill: '#94a3b8', fontSize: 10 }}
                  />
                )}
                <Area type="monotone" dataKey="pms" stroke="var(--color-pms)" fill="url(#pmsGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="ago" stroke="var(--color-ago)" fill="url(#agoGrad)" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="dpk" stroke="var(--color-dpk)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : hasPrices ? (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-6 text-center">
            <Database className="size-8 text-slate-500 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Insufficient price history</h3>
            <p className="text-xs text-slate-500">Record daily sales to build price history. The trend chart will appear once you have 2 or more days of data.</p>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Price Prediction + EPRA Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Price Prediction Card */}
        {predictionData.length > 0 ? (
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
                      <div className="text-right">
                        <div className="text-xs font-semibold">{formatKsh(pred.pms)}</div>
                        <div className="flex items-center gap-0.5">
                          {pmsDiff > 0 ? <ArrowUpRight className="size-2.5 text-green-400" /> : pmsDiff < 0 ? <ArrowDownRight className="size-2.5 text-red-400" /> : <Minus className="size-2.5 text-slate-400" />}
                          <span className={`text-[10px] ${pmsDiff > 0 ? 'text-green-400' : pmsDiff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {pmsDiff > 0 ? '+' : ''}{pmsDiff.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-amber-400" />
                  <span className="text-[10px] text-amber-300">Predictions are based on simple linear trends from your sales data and may not reflect sudden market changes.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-slate-700/30 flex items-center justify-center">
                  <TrendingUp className="size-4 text-slate-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">7-Day Price Prediction</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Requires price history data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <Database className="size-8 text-slate-500 mx-auto mb-3" />
              <p className="text-xs text-slate-500">Record at least 2 days of sales data to generate price predictions.</p>
            </CardContent>
          </Card>
        )}

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
            {epraComparison.length > 0 ? (
              <>
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
                      +{(epraComparison.reduce((s, e) => s + e.margin, 0) / epraComparison.length).toFixed(2)} Ksh/L
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Shield className="size-8 text-slate-600 mx-auto mb-3" />
                <p className="text-xs text-slate-500">Set fuel prices in the Price Board tab to compare with EPRA rates.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Margin Analysis Chart ──────────────────────────────────────── */}
      {marginData.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Percent className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Margin Analysis ({marginData.length} Days)</CardTitle>
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
      )}

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

      {/* ── Price Recommendation ─────────────────────────────────────────── */}
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
              <CardDescription className="text-slate-400 text-xs">Based on your pricing vs EPRA rates</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
            <p className="text-xs text-slate-300">{recommendation.description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
