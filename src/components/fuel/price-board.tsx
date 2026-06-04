'use client';

import { useState, useMemo } from 'react';
import {
  Droplets,
  Pencil,
  Check,
  X,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Building2,
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
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';

// Price history stored locally (simulated)
interface PriceChange {
  fuelName: string;
  oldPrice: number;
  newPrice: number;
  date: string;
}

// Mock competitor data
const competitors = [
  { name: 'Shell', pms: 214.50, ago: 201.30 },
  { name: 'Total', pms: 213.00, ago: 200.50 },
  { name: 'Kobil', pms: 212.36, ago: 199.47 },
  { name: 'Gapco', pms: 211.00, ago: 198.50 },
];

export function PriceBoard() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const updateFuelType = useFuelStore((s) => s.updateFuelType);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState<PriceChange[]>([]);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // Price history: last 5 changes
  const recentHistory = useMemo(() => priceHistory.slice(-5).reverse(), [priceHistory]);

  const handleStartEdit = (id: string, currentPrice: number) => {
    setEditingId(id);
    setEditPrice(currentPrice);
  };

  const handleSavePrice = () => {
    if (!editingId) return;
    const ft = fuelTypes.find((f) => f.id === editingId);
    if (ft && ft.price !== editPrice) {
      // Record price change
      setPriceHistory((prev) => [
        ...prev,
        {
          fuelName: ft.name,
          oldPrice: ft.price,
          newPrice: editPrice,
          date: new Date().toISOString().slice(0, 10),
        },
      ]);
      updateFuelType(editingId, { price: editPrice });
    }
    setEditingId(null);
    setEditPrice(0);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrice(0);
  };

  const getFuelColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('pms') || lower.includes('petrol') || lower.includes('super')) return { primary: 'text-green-300', bg: 'bg-green-500/10', border: 'border-green-500/30', accent: 'text-green-400', glow: 'shadow-green-500/20' };
    if (lower.includes('ago') || lower.includes('diesel')) return { primary: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', accent: 'text-amber-400', glow: 'shadow-amber-500/20' };
    if (lower.includes('kerosene') || lower.includes('ike')) return { primary: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/30', accent: 'text-red-400', glow: 'shadow-red-500/20' };
    return { primary: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/30', accent: 'text-blue-400', glow: 'shadow-blue-500/20' };
  };

  return (
    <div className="space-y-6">
      {/* ── Large Price Board Display ────────────────────────────────────── */}
      <Card className="bg-slate-900 border-2 border-slate-600 text-white shadow-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Droplets className="size-5 text-amber-400" />
                FuelPro Price Board
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Current fuel prices per litre</CardDescription>
            </div>
            <Badge className="bg-green-500/20 text-green-300 border border-green-500/30 text-xs">
              <span className="size-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {fuelTypes.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-12">
              No fuel types configured. Set up fuel types first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {fuelTypes.map((ft) => {
                const colors = getFuelColor(ft.name);
                const isEditing = editingId === ft.id;
                return (
                  <div
                    key={ft.id}
                    className={`relative rounded-2xl ${colors.bg} border-2 ${colors.border} p-6 text-center shadow-lg ${colors.glow}`}
                  >
                    {/* Fuel icon and name */}
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Droplets className={`size-5 ${colors.accent}`} />
                      <span className={`text-sm font-semibold uppercase tracking-widest ${colors.accent}`}>
                        {ft.name}
                      </span>
                    </div>

                    {/* Category badge */}
                    <Badge className="bg-slate-800/60 text-slate-300 text-[10px] px-2 py-0.5 mb-3">
                      {ft.category.charAt(0).toUpperCase() + ft.category.slice(1)}
                    </Badge>

                    {isEditing ? (
                      /* Inline Editing */
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-slate-400 text-sm">Ksh</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={editPrice || ''}
                            onChange={(e) => setEditPrice(Number(e.target.value))}
                            className={`${inputClass} w-28 text-center text-lg font-bold`}
                          />
                          <span className="text-slate-400 text-sm">/L</span>
                        </div>
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={handleSavePrice}
                            className="bg-green-500 hover:bg-green-600 text-white size-8 p-0"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 size-8 p-0"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Price Display */
                      <div className="mt-2">
                        <div className="flex items-center justify-center">
                          <span className="text-slate-400 text-lg mr-2">Ksh</span>
                          <span className={`text-5xl font-black ${colors.primary} tabular-nums`}>
                            {ft.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-slate-500 text-xs mt-1">per litre</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3 text-slate-400 hover:text-amber-400 hover:bg-slate-800/50"
                          onClick={() => handleStartEdit(ft.id, ft.price)}
                        >
                          <Pencil className="size-3 mr-1" /> Edit Price
                        </Button>
                      </div>
                    )}

                    {/* Tank level indicator */}
                    {ft.tankCapacity > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-700/50">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span>Stock Level</span>
                          <span>{ft.currentLevel.toLocaleString()} / {ft.tankCapacity.toLocaleString()} L</span>
                        </div>
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
                            style={{ width: `${Math.min(100, Math.round((ft.currentLevel / ft.tankCapacity) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Price History ─────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-blue-400" />
            Price Change History
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Last 5 price changes</CardDescription>
        </CardHeader>
        <CardContent>
          {recentHistory.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No price changes recorded yet</div>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((change, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Droplets className="size-4 text-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-white">{change.fuelName}</div>
                      <div className="text-[10px] text-slate-500">{change.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Ksh {change.oldPrice.toFixed(2)}</span>
                    <ArrowUpDown className="size-3 text-slate-500" />
                    <span className="text-xs font-semibold text-white">Ksh {change.newPrice.toFixed(2)}</span>
                    {change.newPrice > change.oldPrice ? (
                      <TrendingUp className="size-3 text-red-400" />
                    ) : (
                      <TrendingDown className="size-3 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Competitor Price Comparison ───────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4 text-purple-400" />
            Competitor Price Comparison
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Nearby station prices (mock data)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {competitors.map((comp) => {
              const ourPms = fuelTypes.find((f) => f.name.toLowerCase().includes('pms') || f.name.toLowerCase().includes('petrol'))?.price || pmsPrice;
              const ourAgo = fuelTypes.find((f) => f.name.toLowerCase().includes('ago') || f.name.toLowerCase().includes('diesel'))?.price || agoPrice;
              return (
                <div key={comp.name} className="bg-slate-700/30 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{comp.name}</span>
                    <div className="flex items-center gap-1">
                      {ourPms <= comp.pms && ourAgo <= comp.ago ? (
                        <Badge className="bg-green-500/20 text-green-300 text-[10px] px-1.5 py-0">Competitive</Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-300 text-[10px] px-1.5 py-0">Higher</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">PMS</span>
                      <div className="flex items-center gap-1">
                        <span className="text-green-300">Ksh {comp.pms.toFixed(2)}</span>
                        {ourPms < comp.pms && <TrendingDown className="size-3 text-green-400" />}
                        {ourPms > comp.pms && <TrendingUp className="size-3 text-red-400" />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">AGO</span>
                      <div className="flex items-center gap-1">
                        <span className="text-amber-300">Ksh {comp.ago.toFixed(2)}</span>
                        {ourAgo < comp.ago && <TrendingDown className="size-3 text-green-400" />}
                        {ourAgo > comp.ago && <TrendingUp className="size-3 text-red-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
