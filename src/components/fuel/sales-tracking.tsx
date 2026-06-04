'use client';

import { useState, useMemo } from 'react';
import { CalendarDays, Plus, Trash2, Save } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';
import type { ExpenseFormData } from '@/types/fuel';

interface ExpenseEntry {
  description: string;
  amount: number;
}

export function SalesTracking() {
  const addSale = useFuelStore((s) => s.addSale);
  const addExpense = useFuelStore((s) => s.addExpense);
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pmsOpening, setPmsOpening] = useState(0);
  const [pmsClosing, setPmsClosing] = useState(0);
  const [pmsPriceInput, setPmsPriceInput] = useState(pmsPrice || 0);
  const [agoOpening, setAgoOpening] = useState(0);
  const [agoClosing, setAgoClosing] = useState(0);
  const [agoPriceInput, setAgoPriceInput] = useState(agoPrice || 0);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState(0);

  // Calculated
  const pmsLitres = Math.max(0, pmsClosing - pmsOpening);
  const agoLitres = Math.max(0, agoClosing - agoOpening);
  const pmsKsh = pmsLitres * pmsPriceInput;
  const agoKsh = agoLitres * agoPriceInput;
  const totalKsh = pmsKsh + agoKsh;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Sales array for table
  const salesArr = useMemo(
    () => Object.values(salesHistory).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [salesHistory]
  );

  // Running totals
  const runningTotals = useMemo(() => {
    let totalSales = 0;
    let totalPmsL = 0;
    let totalAgoL = 0;
    salesArr.forEach((s) => {
      totalSales += s.totalSales;
      totalPmsL += s.pmsSalesL;
      totalAgoL += s.agoSalesL;
    });
    return { totalSales, totalPmsL, totalAgoL };
  }, [salesArr]);

  // Add expense row
  const handleAddExpense = () => {
    if (newExpDesc.trim() && newExpAmount > 0) {
      setExpenses([...expenses, { description: newExpDesc.trim(), amount: newExpAmount }]);
      setNewExpDesc('');
      setNewExpAmount(0);
    }
  };

  // Remove expense row
  const handleRemoveExpense = (idx: number) => {
    setExpenses(expenses.filter((_, i) => i !== idx));
  };

  // Save sale
  const handleSave = () => {
    if (!date) return;

    // Add the sale
    addSale({
      date,
      pmsOpeningReading: pmsOpening,
      pmsClosingReading: pmsClosing,
      agoOpeningReading: agoOpening,
      agoClosingReading: agoClosing,
      pmsPrice: pmsPriceInput,
      agoPrice: agoPriceInput,
      expenses: totalExpenses,
    });

    // Add individual expenses
    expenses.forEach((exp) => {
      addExpense({
        date,
        category: 'misc',
        description: exp.description,
        amount: exp.amount,
      });
    });

    // Reset form
    setPmsOpening(0);
    setPmsClosing(0);
    setAgoOpening(0);
    setAgoClosing(0);
    setExpenses([]);
    setNewExpDesc('');
    setNewExpAmount(0);
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Sales Entry Form ───────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base">Daily Sales Entry</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Record pump readings and sales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date */}
          <div className="flex items-center gap-3">
            <Label className="text-slate-300 text-xs w-16 shrink-0">Date</Label>
            <div className="relative flex-1">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <Separator className="bg-slate-700/50" />

          {/* PMS Section */}
          <div>
            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-400" />
              PMS (Super Petrol)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Opening Reading</Label>
                <Input
                  type="number"
                  value={pmsOpening || ''}
                  onChange={(e) => setPmsOpening(Number(e.target.value))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Closing Reading</Label>
                <Input
                  type="number"
                  value={pmsClosing || ''}
                  onChange={(e) => setPmsClosing(Number(e.target.value))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Price / Litre (Ksh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pmsPriceInput || ''}
                  onChange={(e) => setPmsPriceInput(Number(e.target.value))}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Sales</Label>
                <div className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2 text-sm">
                  <div className="text-green-300 font-semibold">{pmsKsh.toLocaleString()} Ksh</div>
                  <div className="text-green-400/70 text-xs">{pmsLitres.toLocaleString()} L</div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700/50" />

          {/* AGO Section */}
          <div>
            <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-400" />
              AGO (Diesel)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Opening Reading</Label>
                <Input
                  type="number"
                  value={agoOpening || ''}
                  onChange={(e) => setAgoOpening(Number(e.target.value))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Closing Reading</Label>
                <Input
                  type="number"
                  value={agoClosing || ''}
                  onChange={(e) => setAgoClosing(Number(e.target.value))}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Price / Litre (Ksh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={agoPriceInput || ''}
                  onChange={(e) => setAgoPriceInput(Number(e.target.value))}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Sales</Label>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 text-sm">
                  <div className="text-amber-300 font-semibold">{agoKsh.toLocaleString()} Ksh</div>
                  <div className="text-amber-400/70 text-xs">{agoLitres.toLocaleString()} L</div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700/50" />

          {/* Expenses Section */}
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-400" />
              Expenses
            </h3>
            <div className="space-y-2">
              {expenses.map((exp, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-slate-200">{exp.description}</span>
                  <span className="text-sm font-semibold text-red-300">Ksh {exp.amount.toLocaleString()}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-slate-500 hover:text-red-400"
                    onClick={() => handleRemoveExpense(idx)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Description"
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={newExpAmount || ''}
                  onChange={(e) => setNewExpAmount(Number(e.target.value))}
                  className={`${inputClass} w-28`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={handleAddExpense}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {totalExpenses > 0 && (
                <div className="text-right text-xs text-slate-400">
                  Total Expenses: <span className="text-red-300 font-semibold">Ksh {totalExpenses.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-slate-700/50" />

          {/* Total & Save */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-slate-400">Total Sales: </span>
              <span className="text-lg font-bold text-white">Ksh {totalKsh.toLocaleString()}</span>
            </div>
            <Button
              onClick={handleSave}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Save className="size-4 mr-2" />
              Save Sale
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Running Totals ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Total Revenue</div>
            <div className="text-xl font-bold mt-1">Ksh {runningTotals.totalSales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-green-400 uppercase tracking-wider">PMS Sold</div>
            <div className="text-xl font-bold mt-1 text-green-300">{runningTotals.totalPmsL.toLocaleString()} L</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-amber-400 uppercase tracking-wider">AGO Sold</div>
            <div className="text-xl font-bold mt-1 text-amber-300">{runningTotals.totalAgoL.toLocaleString()} L</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Sales Table ─────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base">Recent Sales</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Last 10 entries</CardDescription>
        </CardHeader>
        <CardContent>
          {salesArr.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No sales recorded yet</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">PMS (L)</TableHead>
                    <TableHead className="text-slate-400 text-xs">PMS (Ksh)</TableHead>
                    <TableHead className="text-slate-400 text-xs">AGO (L)</TableHead>
                    <TableHead className="text-slate-400 text-xs">AGO (Ksh)</TableHead>
                    <TableHead className="text-slate-400 text-xs">Expenses</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesArr.slice(0, 10).map((sale) => (
                    <TableRow key={sale.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs">{sale.date}</TableCell>
                      <TableCell className="text-green-300 text-xs">{sale.pmsSalesL.toLocaleString()}</TableCell>
                      <TableCell className="text-green-300 text-xs">{sale.pmsSalesKsh.toLocaleString()}</TableCell>
                      <TableCell className="text-amber-300 text-xs">{sale.agoSalesL.toLocaleString()}</TableCell>
                      <TableCell className="text-amber-300 text-xs">{sale.agoSalesKsh.toLocaleString()}</TableCell>
                      <TableCell className="text-red-300 text-xs">{sale.expenses.toLocaleString()}</TableCell>
                      <TableCell className="text-white text-xs font-semibold text-right">{sale.totalSales.toLocaleString()}</TableCell>
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
