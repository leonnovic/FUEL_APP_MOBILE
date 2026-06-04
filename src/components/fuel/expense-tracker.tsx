'use client';

import { useState, useMemo } from 'react';
import {
  DollarSign,
  CalendarDays,
  Plus,
  Trash2,
  TrendingDown,
  Tag,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useFuelStore } from '@/store/fuel-store';
import type { ExpenseCategory } from '@/types/fuel';

const CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: 'fuel', label: 'Fuel Purchase', color: 'bg-green-500' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-blue-500' },
  { value: 'salary', label: 'Salary', color: 'bg-purple-500' },
  { value: 'utilities', label: 'Utilities', color: 'bg-yellow-500' },
  { value: 'rent', label: 'Rent', color: 'bg-orange-500' },
  { value: 'transport', label: 'Transport', color: 'bg-cyan-500' },
  { value: 'misc', label: 'Miscellaneous', color: 'bg-slate-500' },
];

const chartConfig: ChartConfig = {
  fuel: { label: 'Fuel', color: '#22c55e' },
  maintenance: { label: 'Maintenance', color: '#3b82f6' },
  salary: { label: 'Salary', color: '#a855f7' },
  utilities: { label: 'Utilities', color: '#eab308' },
  rent: { label: 'Rent', color: '#f97316' },
  transport: { label: 'Transport', color: '#06b6d4' },
  misc: { label: 'Misc', color: '#64748b' },
};

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ExpenseTracker() {
  const expenses = useFuelStore((s) => s.expenses);
  const addExpense = useFuelStore((s) => s.addExpense);
  const deleteExpense = useFuelStore((s) => s.deleteExpense);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>('misc');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // Summary calculations
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return expenses
      .filter((e) => e.date.startsWith(monthStr))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = useMemo(
    () => expenses.filter((e) => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0),
    [expenses, todayStr]
  );

  const categoryBreakdown = useMemo(() => {
    const grouped: Record<string, number> = {};
    expenses.forEach((e) => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount;
    });
    return Object.entries(grouped).map(([cat, amt]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      amount: amt,
      key: cat,
    }));
  }, [expenses]);

  // Monthly bar chart data - last 6 months
  const monthlyData = useMemo(() => {
    const months: { month: string; fuel: number; maintenance: number; salary: number; utilities: number; rent: number; transport: number; misc: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-KE', { month: 'short' });
      const monthExpenses = expenses.filter((e) => e.date.startsWith(monthStr));
      months.push({
        month: label,
        fuel: monthExpenses.filter((e) => e.category === 'fuel').reduce((s, e) => s + e.amount, 0),
        maintenance: monthExpenses.filter((e) => e.category === 'maintenance').reduce((s, e) => s + e.amount, 0),
        salary: monthExpenses.filter((e) => e.category === 'salary').reduce((s, e) => s + e.amount, 0),
        utilities: monthExpenses.filter((e) => e.category === 'utilities').reduce((s, e) => s + e.amount, 0),
        rent: monthExpenses.filter((e) => e.category === 'rent').reduce((s, e) => s + e.amount, 0),
        transport: monthExpenses.filter((e) => e.category === 'transport').reduce((s, e) => s + e.amount, 0),
        misc: monthExpenses.filter((e) => e.category === 'misc').reduce((s, e) => s + e.amount, 0),
      });
    }
    return months;
  }, [expenses]);

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses]
  );

  const getCategoryColor = (cat: ExpenseCategory) =>
    CATEGORIES.find((c) => c.value === cat)?.color ?? 'bg-slate-500';

  const handleAdd = () => {
    if (!date || !amount) return;
    addExpense({ date, category, description: description || undefined, amount });
    setDescription('');
    setAmount(0);
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Expenses</CardDescription>
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <DollarSign className="size-4 text-red-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalExpenses)}</div>
            <div className="text-xs text-slate-400 mt-1">{expenses.length} entries</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">This Month</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <CalendarDays className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(thisMonth)}</div>
            <div className="text-xs text-slate-400 mt-1">Current period</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Today</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Receipt className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(todayExpenses)}</div>
            <div className="text-xs text-slate-400 mt-1">{expenses.filter((e) => e.date === todayStr).length} entries</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">By Category</CardDescription>
              <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Tag className="size-4 text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryBreakdown.length}</div>
            <div className="text-xs text-slate-400 mt-1">Active categories</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Add Expense Form ────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base">Add Expense</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Record a new expense entry</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Description</Label>
              <Input
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Amount (Ksh)</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            <Plus className="size-4 mr-2" />
            Add Expense
          </Button>
        </CardContent>
      </Card>

      {/* ── Expense List ────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base">Expense History</CardTitle>
          <CardDescription className="text-slate-400 text-xs">All recorded expenses</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedExpenses.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No expenses recorded yet</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Category</TableHead>
                    <TableHead className="text-slate-400 text-xs">Description</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Amount</TableHead>
                    <TableHead className="text-slate-400 text-xs w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExpenses.map((exp) => (
                    <TableRow key={exp.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs">{exp.date}</TableCell>
                      <TableCell>
                        <Badge className={`${getCategoryColor(exp.category)} text-white text-[10px] px-1.5 py-0`}>
                          {exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-xs">{exp.description || '—'}</TableCell>
                      <TableCell className="text-red-300 text-xs font-semibold text-right">{formatKsh(exp.amount)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-slate-500 hover:text-red-400"
                          onClick={() => deleteExpense(exp.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Monthly Bar Chart ───────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Expense Breakdown</CardTitle>
          <CardDescription className="text-slate-400 text-xs">By category — last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.every((m) => m.fuel + m.maintenance + m.salary + m.utilities + m.rent + m.transport + m.misc === 0) ? (
            <div className="text-center text-slate-500 text-sm py-8">No expense data to chart</div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="fuel" stackId="a" fill="var(--color-fuel)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="maintenance" stackId="a" fill="var(--color-maintenance)" />
                <Bar dataKey="salary" stackId="a" fill="var(--color-salary)" />
                <Bar dataKey="utilities" stackId="a" fill="var(--color-utilities)" />
                <Bar dataKey="rent" stackId="a" fill="var(--color-rent)" />
                <Bar dataKey="transport" stackId="a" fill="var(--color-transport)" />
                <Bar dataKey="misc" stackId="a" fill="var(--color-misc)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
