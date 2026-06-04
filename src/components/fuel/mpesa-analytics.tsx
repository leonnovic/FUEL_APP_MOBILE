'use client';

import { useState, useMemo } from 'react';
import {
  Smartphone,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  DollarSign,
  Plus,
  Filter,
  AlertTriangle,
  Wallet,
  RefreshCw,
  CreditCard,
  TrendingUp,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────
type MpesaTransactionType = 'C2B' | 'B2C' | 'Paybill' | 'Till';
type MpesaTransactionStatus = 'completed' | 'pending' | 'failed' | 'reversed';

interface MpesaTransaction {
  id: string;
  time: string;
  phone: string;
  amount: number;
  type: MpesaTransactionType;
  status: MpesaTransactionStatus;
  reference: string;
  description?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPhone(phone: string): string {
  if (phone.startsWith('254')) return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  return phone;
}

// ─── Mock Data ────────────────────────────────────────────────────────────
const PHONES = [
  '254712345678', '254723456789', '254734567890', '254745678901',
  '254756789012', '254767890123', '254778901234', '254789012345',
  '254790123456', '254701234567',
];

const NAMES = [
  'John Mwangi', 'Akinyi Odhiambo', 'Wanjiku Kamau', 'Hassan Ali',
  'Fatuma Abdi', 'Peter Njoroge', 'Grace Wambui', 'Samuel Kiprop',
  'Eve Achieng', 'David Ochieng',
];

function generateMockTransactions(): MpesaTransaction[] {
  const types: MpesaTransactionType[] = ['C2B', 'B2C', 'Paybill', 'Till'];
  const statuses: MpesaTransactionStatus[] = ['completed', 'completed', 'completed', 'completed', 'completed', 'pending', 'failed', 'reversed'];
  const transactions: MpesaTransaction[] = [];

  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const d = new Date(now);
    d.setMinutes(d.getMinutes() - i * 45 - Math.floor(Math.random() * 30));
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const phoneIdx = Math.floor(Math.random() * PHONES.length);

    let amount: number;
    if (type === 'C2B' || type === 'Paybill') {
      amount = Math.floor(Math.random() * 15000) + 500;
    } else {
      amount = Math.floor(Math.random() * 5000) + 100;
    }

    transactions.push({
      id: `MP${String(Date.now() - i * 1000).slice(-8)}`,
      time: d.toISOString(),
      phone: PHONES[phoneIdx],
      amount,
      type,
      status,
      reference: `QJK${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      description: type === 'C2B' ? `Payment from ${NAMES[phoneIdx]}` : type === 'B2C' ? `Disbursement to ${NAMES[phoneIdx]}` : `Fuel purchase - ${NAMES[phoneIdx]}`,
    });
  }
  return transactions;
}

const chartConfig: ChartConfig = {
  c2b: { label: 'C2B', color: '#22c55e' },
  b2c: { label: 'B2C', color: '#f59e0b' },
  paybill: { label: 'Paybill', color: '#06b6d4' },
  till: { label: 'Till', color: '#a855f7' },
};

const TYPE_COLORS: Record<MpesaTransactionType, string> = {
  C2B: 'bg-green-500/80 text-white',
  B2C: 'bg-amber-500/80 text-black',
  Paybill: 'bg-cyan-500/80 text-white',
  Till: 'bg-purple-500/80 text-white',
};

const STATUS_COLORS: Record<MpesaTransactionStatus, string> = {
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  reversed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

// ─── Component ────────────────────────────────────────────────────────────
export function MpesaAnalytics() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<MpesaTransaction[]>(generateMockTransactions);
  const [filterType, setFilterType] = useState<MpesaTransactionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MpesaTransactionStatus | 'all'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addPhone, setAddPhone] = useState('');
  const [addAmount, setAddAmount] = useState(0);
  const [addType, setAddType] = useState<MpesaTransactionType>('C2B');
  const [addReference, setAddReference] = useState('');

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // ─── Filtered Transactions ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterDate) {
        const txDate = new Date(t.time).toISOString().slice(0, 10);
        if (txDate !== filterDate) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterStatus, filterDate]);

  // ─── Summary Calculations ─────────────────────────────────────────────
  const totalMpesa = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMpesa = useMemo(
    () => transactions.filter((t) => new Date(t.time).toISOString().slice(0, 10) === todayStr && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
    [transactions, todayStr]
  );

  const pendingReversals = useMemo(
    () => transactions.filter((t) => t.status === 'reversed' || t.status === 'pending').reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const avgTransaction = useMemo(
    () => transactions.length ? Math.round(totalMpesa / transactions.length) : 0,
    [totalMpesa, transactions.length]
  );

  const floatBalance = 247850;

  // ─── Chart Data ───────────────────────────────────────────────────────
  const dailyData = useMemo(() => {
    const days: { day: string; c2b: number; b2c: number; paybill: number; till: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-KE', { weekday: 'short' });
      const dayTxns = transactions.filter((t) => new Date(t.time).toISOString().slice(0, 10) === dayStr && t.status === 'completed');
      days.push({
        day: label,
        c2b: dayTxns.filter((t) => t.type === 'C2B').reduce((s, t) => s + t.amount, 0),
        b2c: dayTxns.filter((t) => t.type === 'B2C').reduce((s, t) => s + t.amount, 0),
        paybill: dayTxns.filter((t) => t.type === 'Paybill').reduce((s, t) => s + t.amount, 0),
        till: dayTxns.filter((t) => t.type === 'Till').reduce((s, t) => s + t.amount, 0),
      });
    }
    return days;
  }, [transactions]);

  // ─── Add Transaction Handler ──────────────────────────────────────────
  const handleAddTransaction = () => {
    if (!addPhone || !addAmount) {
      toast({ title: 'Error', description: 'Phone number and amount are required', variant: 'destructive' });
      return;
    }
    const newTxn: MpesaTransaction = {
      id: `MP${String(Date.now()).slice(-8)}`,
      time: new Date().toISOString(),
      phone: addPhone.startsWith('+') ? addPhone.replace('+', '') : addPhone.startsWith('0') ? `254${addPhone.slice(1)}` : addPhone,
      amount: addAmount,
      type: addType,
      status: 'pending',
      reference: addReference || `QJK${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      description: `${addType} transaction`,
    };
    setTransactions((prev) => [newTxn, ...prev]);
    toast({ title: 'Transaction Initiated', description: `${addType} of ${formatKsh(addAmount)} queued for processing` });
    setShowAddDialog(false);
    setAddPhone('');
    setAddAmount(0);
    setAddReference('');
  };

  // ─── Type Breakdown for quick stats ──────────────────────────────────
  const typeBreakdown = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'completed');
    return {
      C2B: completed.filter((t) => t.type === 'C2B').reduce((s, t) => s + t.amount, 0),
      B2C: completed.filter((t) => t.type === 'B2C').reduce((s, t) => s + t.amount, 0),
      Paybill: completed.filter((t) => t.type === 'Paybill').reduce((s, t) => s + t.amount, 0),
      Till: completed.filter((t) => t.type === 'Till').reduce((s, t) => s + t.amount, 0),
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total M-PESA</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Smartphone className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalMpesa)}</div>
            <div className="text-xs text-slate-400 mt-1">{transactions.length} transactions</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Today&apos;s M-PESA</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <ArrowDownLeft className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(todayMpesa)}</div>
            <div className="text-xs text-slate-400 mt-1">{transactions.filter((t) => new Date(t.time).toISOString().slice(0, 10) === todayStr && t.status === 'completed').length} completed</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Pending Reversals</CardDescription>
              <div className="size-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <RefreshCw className="size-4 text-orange-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(pendingReversals)}</div>
            <div className="text-xs text-slate-400 mt-1">{transactions.filter((t) => t.status === 'reversed' || t.status === 'pending').length} pending</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Avg Transaction</CardDescription>
              <div className="size-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="size-4 text-cyan-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(avgTransaction)}</div>
            <div className="text-xs text-slate-400 mt-1">Per transaction</div>
          </CardContent>
        </Card>
      </div>

      {/* ── M-PESA Balance + Type Breakdown ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Float Balance Card */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">M-PESA Float Balance</CardTitle>
              <Wallet className="size-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold text-amber-400">{formatKsh(floatBalance)}</div>
            <Separator className="bg-slate-700/50" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Minimum Float Alert</span>
              <span className="text-amber-400 font-semibold">Ksh 50,000</span>
            </div>
            <div className="flex items-center gap-2">
              {floatBalance < 50000 ? (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                  <AlertTriangle className="size-3 mr-1" /> Low Float
                </Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  <DollarSign className="size-3 mr-1" /> Float OK
                </Badge>
              )}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${floatBalance < 50000 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min((floatBalance / 500000) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transaction Type Breakdown */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Transaction Types</CardTitle>
              <CreditCard className="size-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['C2B', 'B2C', 'Paybill', 'Till'] as const).map((type) => (
                <div key={type} className="bg-slate-700/30 rounded-xl p-3 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`size-2 rounded-full ${type === 'C2B' ? 'bg-green-500' : type === 'B2C' ? 'bg-amber-500' : type === 'Paybill' ? 'bg-cyan-500' : 'bg-purple-500'}`} />
                    <span className="text-xs text-slate-400">{type}</span>
                  </div>
                  <div className="text-base font-bold">{formatKsh(typeBreakdown[type])}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {transactions.filter((t) => t.type === type && t.status === 'completed').length} txns
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {type === 'C2B' ? 'Customer → Business' : type === 'B2C' ? 'Business → Customer' : type === 'Paybill' ? 'Paybill Payment' : 'Till Number'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters + Add Button ────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full">
              <div>
                <Label className="text-slate-400 text-xs">Date</Label>
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Type</Label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as MpesaTransactionType | 'all')}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="C2B">C2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                    <SelectItem value="Paybill">Paybill</SelectItem>
                    <SelectItem value="Till">Till Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as MpesaTransactionStatus | 'all')}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="reversed">Reversed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0">
                  <Plus className="size-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>New M-PESA Transaction</DialogTitle>
                  <DialogDescription className="text-slate-400">Initiate a new M-PESA transaction</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-400 text-xs">Phone Number</Label>
                    <Input
                      placeholder="0712 345678"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Amount (Ksh)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={addAmount || ''}
                      onChange={(e) => setAddAmount(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Transaction Type</Label>
                    <Select value={addType} onValueChange={(v) => setAddType(v as MpesaTransactionType)}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        <SelectItem value="C2B">C2B - Customer to Business</SelectItem>
                        <SelectItem value="B2C">B2C - Business to Customer</SelectItem>
                        <SelectItem value="Paybill">Paybill</SelectItem>
                        <SelectItem value="Till">Till Number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Reference (Optional)</Label>
                    <Input
                      placeholder="Invoice number or description"
                      value={addReference}
                      onChange={(e) => setAddReference(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" className="text-slate-400" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={handleAddTransaction}>
                    Initiate Transaction
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* ── Transaction List ────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent M-PESA Transactions</CardTitle>
              <CardDescription className="text-slate-400 text-xs">{filtered.length} transactions found</CardDescription>
            </div>
            <Badge className="bg-slate-700/50 text-slate-300 text-xs">
              <Clock className="size-3 mr-1" /> Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No transactions match the current filters</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Time</TableHead>
                    <TableHead className="text-slate-400 text-xs">Phone</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Amount</TableHead>
                    <TableHead className="text-slate-400 text-xs">Type</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((txn) => (
                    <TableRow key={txn.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs whitespace-nowrap">
                        {new Date(txn.time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-slate-500">{new Date(txn.time).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</div>
                      </TableCell>
                      <TableCell className="text-slate-300 text-xs">{formatPhone(txn.phone)}</TableCell>
                      <TableCell className="text-xs font-semibold text-right">
                        <span className={txn.type === 'B2C' ? 'text-red-300' : 'text-green-300'}>
                          {txn.type === 'B2C' ? '-' : '+'}{formatKsh(txn.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${TYPE_COLORS[txn.type]} text-[10px] px-1.5 py-0`}>
                          {txn.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${STATUS_COLORS[txn.status]} text-[10px] px-1.5 py-0`}>
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs font-mono">{txn.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Daily Volume Chart ──────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daily M-PESA Transaction Volume</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Last 7 days — by transaction type</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.every((d) => d.c2b + d.b2c + d.paybill + d.till === 0) ? (
            <div className="text-center text-slate-500 text-sm py-8">No transaction data to chart</div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="c2b" stackId="a" fill="var(--color-c2b)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="b2c" stackId="a" fill="var(--color-b2c)" />
                <Bar dataKey="paybill" stackId="a" fill="var(--color-paybill)" />
                <Bar dataKey="till" stackId="a" fill="var(--color-till)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
