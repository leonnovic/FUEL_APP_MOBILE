'use client';

import { useState, useMemo } from 'react';
import {
  Fuel,
  Droplets,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Package,
  DollarSign,
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';
import type { FuelCategory } from '@/types/fuel';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getTankColor(pct: number): string {
  if (pct < 20) return 'bg-red-500';
  if (pct < 50) return 'bg-amber-500';
  return 'bg-green-500';
}

function getTankBorderColor(pct: number): string {
  if (pct < 20) return 'border-red-500/30';
  if (pct < 50) return 'border-amber-500/30';
  return 'border-green-500/30';
}

function getCategoryBadge(cat: FuelCategory) {
  switch (cat) {
    case 'fuel':
      return <Badge className="bg-green-500/20 text-green-400 text-[10px]">Fuel</Badge>;
    case 'lubricant':
      return <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">Lubricant</Badge>;
    case 'gas':
      return <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">Gas</Badge>;
    default:
      return <Badge className="bg-slate-500/20 text-slate-400 text-[10px]">{cat}</Badge>;
  }
}

function getCategoryIcon(cat: FuelCategory) {
  switch (cat) {
    case 'fuel':
      return <Fuel className="size-5 text-green-400" />;
    case 'lubricant':
      return <Droplets className="size-5 text-purple-400" />;
    case 'gas':
      return <Droplets className="size-5 text-amber-400" />;
    default:
      return <Package className="size-5 text-slate-400" />;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FuelTypesManager() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const addFuelType = useFuelStore((s) => s.addFuelType);
  const updateFuelType = useFuelStore((s) => s.updateFuelType);
  const deleteFuelType = useFuelStore((s) => s.deleteFuelType);
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState('all');
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<FuelCategory>('fuel');
  const [newPrice, setNewPrice] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newLevel, setNewLevel] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  // ─── Filtered fuel types ────────────────────────────────────────────────

  const filteredTypes = useMemo(() => {
    if (activeCategory === 'all') return fuelTypes;
    return fuelTypes.filter((ft) => ft.category === activeCategory);
  }, [fuelTypes, activeCategory]);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const totalStockValue = useMemo(
    () => fuelTypes.reduce((sum, ft) => sum + ft.currentLevel * ft.price, 0),
    [fuelTypes]
  );

  const lowStockCount = useMemo(
    () => fuelTypes.filter((ft) => ft.tankCapacity > 0 && (ft.currentLevel / ft.tankCapacity) < 0.2).length,
    [fuelTypes]
  );

  const totalCapacity = useMemo(
    () => fuelTypes.reduce((sum, ft) => sum + ft.tankCapacity, 0),
    [fuelTypes]
  );

  const totalCurrentLevel = useMemo(
    () => fuelTypes.reduce((sum, ft) => sum + ft.currentLevel, 0),
    [fuelTypes]
  );

  // ─── Add Fuel Type ──────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!newName.trim() || !newPrice) {
      toast({ title: 'Validation Error', description: 'Name and price are required.', variant: 'destructive' });
      return;
    }

    addFuelType({
      name: newName.trim(),
      category: newCategory,
      price: parseFloat(newPrice) || 0,
      tankCapacity: parseFloat(newCapacity) || 0,
      currentLevel: parseFloat(newLevel) || 0,
    });

    toast({ title: 'Fuel Type Added', description: `${newName} has been added.` });
    setNewName('');
    setNewCategory('fuel');
    setNewPrice('');
    setNewCapacity('');
    setNewLevel('');
    setAddOpen(false);
  };

  // ─── Inline Price Edit ──────────────────────────────────────────────────

  const startEditPrice = (id: string, currentPrice: number) => {
    setEditingId(id);
    setEditPrice(currentPrice.toString());
  };

  const saveEditPrice = (id: string) => {
    const newP = parseFloat(editPrice);
    if (isNaN(newP) || newP < 0) {
      toast({ title: 'Invalid Price', description: 'Please enter a valid price.', variant: 'destructive' });
      return;
    }
    updateFuelType(id, { price: newP });
    toast({ title: 'Price Updated', description: `Price updated to ${formatKsh(newP)}/L.` });
    setEditingId(null);
    setEditPrice('');
  };

  const cancelEditPrice = () => {
    setEditingId(null);
    setEditPrice('');
  };

  // ─── Delete ─────────────────────────────────────────────────────────────

  const handleDelete = (id: string, name: string) => {
    deleteFuelType(id);
    toast({ title: 'Fuel Type Deleted', description: `${name} has been removed.` });
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Package className="size-4 text-green-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Products</span>
            </div>
            <div className="text-xl font-bold">{fuelTypes.length}</div>
            <div className="text-[10px] text-slate-500 mt-1">Fuel types configured</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="size-4 text-amber-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Stock Value</span>
            </div>
            <div className="text-xl font-bold">{formatKsh(totalStockValue)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Current inventory value</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Gauge className="size-4 text-blue-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Total Stock</span>
            </div>
            <div className="text-xl font-bold">{totalCurrentLevel.toLocaleString()} L</div>
            <div className="text-[10px] text-slate-500 mt-1">Of {totalCapacity.toLocaleString()} L capacity</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`size-8 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                <AlertTriangle className={`size-4 ${lowStockCount > 0 ? 'text-red-400' : 'text-green-400'}`} />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Low Stock</span>
            </div>
            <div className={`text-xl font-bold ${lowStockCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{lowStockCount}</div>
            <div className="text-[10px] text-slate-500 mt-1">Below 20% capacity</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Category Filter + Add Button ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="bg-slate-800/60 border border-slate-700/50">
            <TabsTrigger value="all" className="text-xs data-[state=active]:bg-slate-700">All ({fuelTypes.length})</TabsTrigger>
            <TabsTrigger value="fuel" className="text-xs data-[state=active]:bg-slate-700">Fuel ({fuelTypes.filter(f => f.category === 'fuel').length})</TabsTrigger>
            <TabsTrigger value="lubricant" className="text-xs data-[state=active]:bg-slate-700">Lubricant ({fuelTypes.filter(f => f.category === 'lubricant').length})</TabsTrigger>
            <TabsTrigger value="gas" className="text-xs data-[state=active]:bg-slate-700">Gas ({fuelTypes.filter(f => f.category === 'gas').length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium text-xs">
              <Plus className="size-4 mr-1" /> Add Fuel Type
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700/50 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Add Fuel Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-slate-300 text-xs">Name *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Super Petrol"
                  className="bg-slate-700/50 border-slate-600/50 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Category</Label>
                <Select value={newCategory} onValueChange={(v) => setNewCategory(v as FuelCategory)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="fuel">Fuel</SelectItem>
                    <SelectItem value="lubricant">Lubricant</SelectItem>
                    <SelectItem value="gas">Gas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Price per Litre (Ksh) *</Label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="e.g. 212.36"
                  className="bg-slate-700/50 border-slate-600/50 text-white mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 text-xs">Tank Capacity (L)</Label>
                  <Input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    placeholder="e.g. 20000"
                    className="bg-slate-700/50 border-slate-600/50 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Current Level (L)</Label>
                  <Input
                    type="number"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    placeholder="e.g. 15000"
                    className="bg-slate-700/50 border-slate-600/50 text-white mt-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="text-slate-400 text-xs">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAdd} className="bg-amber-500 hover:bg-amber-600 text-black font-medium text-xs">
                Add Fuel Type
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Tank Level Overview ─────────────────────────────────────────── */}
      {fuelTypes.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tank Level Overview</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Visual representation of all tanks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fuelTypes.map((ft) => {
                const pct = ft.tankCapacity > 0 ? Math.round((ft.currentLevel / ft.tankCapacity) * 100) : 0;
                return (
                  <div
                    key={ft.id}
                    className={`rounded-lg border p-3 ${getTankBorderColor(pct)} bg-slate-700/30`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(ft.category)}
                        <span className="text-xs font-medium text-slate-200">{ft.name}</span>
                      </div>
                      {getCategoryBadge(ft.category)}
                    </div>
                    <div className="h-6 bg-slate-600/50 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${getTankColor(pct)}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{ft.currentLevel.toLocaleString()} L</span>
                      <span className={`font-medium ${pct < 20 ? 'text-red-400' : pct < 50 ? 'text-amber-400' : 'text-green-400'}`}>
                        {pct}%
                      </span>
                      <span className="text-slate-400">{ft.tankCapacity.toLocaleString()} L</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Fuel Product Cards ──────────────────────────────────────────── */}
      {filteredTypes.length === 0 ? (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Fuel className="size-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-medium text-slate-300">No fuel types found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeCategory === 'all'
                ? 'Add your first fuel type to get started'
                : `No ${activeCategory} products configured`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTypes.map((ft) => {
            const pct = ft.tankCapacity > 0 ? Math.round((ft.currentLevel / ft.tankCapacity) * 100) : 0;
            const isLow = pct < 20 && ft.tankCapacity > 0;

            return (
              <Card
                key={ft.id}
                className={`bg-slate-800/60 border-slate-700/50 text-white ${isLow ? 'border-red-500/40' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${
                        ft.category === 'fuel' ? 'bg-green-500/20' :
                        ft.category === 'lubricant' ? 'bg-purple-500/20' : 'bg-amber-500/20'
                      }`}>
                        {getCategoryIcon(ft.category)}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{ft.name}</CardTitle>
                        <div className="mt-0.5">{getCategoryBadge(ft.category)}</div>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-red-400">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-700/50">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete {ft.name}?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            This action cannot be undone. This will permanently delete the fuel type &quot;{ft.name}&quot; from your station.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="text-slate-400">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(ft.id, ft.name)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Price with inline edit */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Price per Litre</span>
                    {editingId === ft.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Ksh</span>
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="h-7 w-24 bg-slate-700/50 border-slate-600/50 text-white text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditPrice(ft.id);
                            if (e.key === 'Escape') cancelEditPrice();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                          onClick={() => saveEditPrice(ft.id)}
                        >
                          <Check className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          onClick={cancelEditPrice}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditPrice(ft.id, ft.price)}
                        className="flex items-center gap-1.5 group cursor-pointer"
                      >
                        <span className="text-sm font-bold text-amber-300">{formatKsh(ft.price)}</span>
                        <Pencil className="size-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                      </button>
                    )}
                  </div>

                  {/* Tank Level */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Tank Level</span>
                      <span className="text-[10px] text-slate-500">
                        {ft.currentLevel.toLocaleString()} / {ft.tankCapacity.toLocaleString()} L
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getTankColor(pct)}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-medium ${pct < 20 ? 'text-red-400' : pct < 50 ? 'text-amber-400' : 'text-green-400'}`}>
                        {pct}%
                      </span>
                      {isLow && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                          <AlertTriangle className="size-2.5 mr-0.5" /> Low Stock
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stock Value */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-slate-400">Stock Value</span>
                    <span className="text-sm font-semibold text-green-300">
                      {formatKsh(ft.currentLevel * ft.price)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Stock Value Summary Card ────────────────────────────────────── */}
      {fuelTypes.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Stock Value Breakdown</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Current value of inventory by product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fuelTypes
                .sort((a, b) => (b.currentLevel * b.price) - (a.currentLevel * a.price))
                .map((ft) => {
                  const stockValue = ft.currentLevel * ft.price;
                  const pct = totalStockValue > 0 ? (stockValue / totalStockValue) * 100 : 0;
                  return (
                    <div key={ft.id} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-slate-300 truncate">{ft.name}</div>
                      <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ft.category === 'fuel' ? 'bg-green-500' :
                            ft.category === 'lubricant' ? 'bg-purple-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-28 text-right text-xs font-medium text-slate-200">{formatKsh(stockValue)}</div>
                      <div className="w-12 text-right text-[10px] text-slate-500">{pct.toFixed(1)}%</div>
                    </div>
                  );
                })}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
                <div className="w-24 text-xs font-semibold text-slate-200">Total</div>
                <div className="flex-1" />
                <div className="w-28 text-right text-sm font-bold text-amber-300">{formatKsh(totalStockValue)}</div>
                <div className="w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
