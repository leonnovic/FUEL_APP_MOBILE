'use client';

import { useState, useMemo } from 'react';
import {
  Droplets,
  AlertTriangle,
  Plus,
  Minus,
  Truck,
  ArrowUpDown,
  Gauge,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function InventoryManagement() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const updateFuelType = useFuelStore((s) => s.updateFuelType);
  const deliveries = useFuelStore((s) => s.deliveryData);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // Stock adjustment form
  const [selectedFuel, setSelectedFuel] = useState('');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustDir, setAdjustDir] = useState<'add' | 'subtract'>('add');
  const [adjustReason, setAdjustReason] = useState('');

  const deliveriesArr = useMemo(() => Object.values(deliveries), [deliveries]);

  // Tank levels
  const tankData = useMemo(
    () =>
      fuelTypes.map((ft) => {
        const pct = ft.tankCapacity > 0 ? Math.min(100, Math.round((ft.currentLevel / ft.tankCapacity) * 100)) : 0;
        const isLow = pct < 20;
        return { ...ft, pct, isLow };
      }),
    [fuelTypes]
  );

  // Low stock alerts
  const lowStock = useMemo(() => tankData.filter((t) => t.isLow), [tankData]);

  // Delivery history
  const sortedDeliveries = useMemo(
    () =>
      [...deliveriesArr]
        .filter((d) => d.status === 'delivered')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [deliveriesArr]
  );

  const handleAdjust = () => {
    if (!selectedFuel || adjustQty <= 0) return;
    const ft = fuelTypes.find((f) => f.id === selectedFuel);
    if (!ft) return;
    const newLevel = adjustDir === 'add'
      ? Math.min(ft.tankCapacity, ft.currentLevel + adjustQty)
      : Math.max(0, ft.currentLevel - adjustQty);
    updateFuelType(selectedFuel, { currentLevel: newLevel });
    setAdjustQty(0);
    setAdjustReason('');
  };

  const getBarColor = (pct: number) => {
    if (pct >= 60) return 'from-green-600 to-green-400';
    if (pct >= 40) return 'from-yellow-600 to-yellow-400';
    if (pct >= 20) return 'from-orange-600 to-orange-400';
    return 'from-red-600 to-red-400';
  };

  return (
    <div className="space-y-6">
      {/* ── Tank Level Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tankData.map((tank) => (
          <Card key={tank.id} className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Droplets className="size-4 text-blue-400" />
                  {tank.name}
                </CardTitle>
                {tank.isLow && (
                  <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0">
                    <AlertTriangle className="size-3 mr-1" /> Low
                  </Badge>
                )}
              </div>
              <CardDescription className="text-slate-400 text-xs">
                {tank.category.charAt(0).toUpperCase() + tank.category.slice(1)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-2xl font-bold">{tank.currentLevel.toLocaleString()} L</div>
                  <div className="text-xs text-slate-400">of {tank.tankCapacity.toLocaleString()} L</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: tank.pct >= 20 ? '#22c55e' : '#ef4444' }}>
                    {tank.pct}%
                  </div>
                  <div className="text-[10px] text-slate-500">capacity</div>
                </div>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all bg-gradient-to-r ${getBarColor(tank.pct)}`}
                  style={{ width: `${tank.pct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>Empty</span>
                <span>{tank.pct}%</span>
                <span>Full</span>
              </div>
              <div className="mt-3 bg-slate-700/30 rounded-lg px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase">Price/Litre</span>
                <span className="text-xs font-semibold text-green-300">Ksh {tank.price.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Stock Adjustment Form ────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base">Stock Adjustment</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Add or remove stock from tanks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">Fuel Type</Label>
              <Select value={selectedFuel} onValueChange={setSelectedFuel}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Select fuel" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {fuelTypes.map((ft) => (
                    <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Direction</Label>
              <Select value={adjustDir} onValueChange={(v) => setAdjustDir(v as 'add' | 'subtract')}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="add">
                    <span className="flex items-center gap-1"><Plus className="size-3" /> Add Stock</span>
                  </SelectItem>
                  <SelectItem value="subtract">
                    <span className="flex items-center gap-1"><Minus className="size-3" /> Remove Stock</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Quantity (L)</Label>
              <Input
                type="number"
                placeholder="0"
                value={adjustQty || ''}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Reason</Label>
              <Input
                placeholder="e.g. Delivery, Spill"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAdjust}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold w-full"
              >
                <ArrowUpDown className="size-4 mr-2" />
                Adjust
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Reorder Alert Section ────────────────────────────────────────── */}
      {lowStock.length > 0 && (
        <Card className="bg-slate-800/60 border-red-500/30 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-400" />
              Reorder Alert
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Items below 20% capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStock.map((tank) => (
                <div key={tank.id} className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Droplets className="size-5 text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-white">{tank.name}</div>
                      <div className="text-xs text-slate-400">{tank.currentLevel.toLocaleString()} / {tank.tankCapacity.toLocaleString()} L</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-300">{tank.pct}%</div>
                    <div className="text-[10px] text-red-400">Need reorder</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Delivery History ─────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="size-4 text-amber-400" />
            Delivery History
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Completed deliveries linked to inventory</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedDeliveries.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No deliveries yet</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Product</TableHead>
                    <TableHead className="text-slate-400 text-xs">Supplier</TableHead>
                    <TableHead className="text-slate-400 text-xs">Quantity</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDeliveries.slice(0, 10).map((d) => (
                    <TableRow key={d.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs">{d.date}</TableCell>
                      <TableCell className="text-white text-xs font-medium">{d.product}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{d.supplier}</TableCell>
                      <TableCell className="text-blue-300 text-xs">{d.quantity.toLocaleString()} L</TableCell>
                      <TableCell className="text-green-300 text-xs text-right">{formatKsh(d.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
