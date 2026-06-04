'use client';

import { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  AlertTriangle,
  DollarSign,
  CalendarClock,
  TrendingUp,
  Users,
  Shield,
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
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';

type RiskLevel = 'Low' | 'Medium' | 'High';
type CreditTerms = 30 | 60 | 90;

interface CreditEntry {
  id: string;
  clientId: string;
  clientName: string;
  creditLimit: number;
  balanceDue: number;
  utilization: number;
  daysOutstanding: number;
  riskLevel: RiskLevel;
}

interface PaymentSchedule {
  id: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: 'Upcoming' | 'Overdue' | 'Paid';
}

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  Low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  Medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  High: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

function calculateRisk(utilization: number, daysOutstanding: number): RiskLevel {
  if (utilization > 80 || daysOutstanding > 60) return 'High';
  if (utilization > 50 || daysOutstanding > 30) return 'Medium';
  return 'Low';
}

export function CreditManagement() {
  const clients = useFuelStore((s) => s.clients);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formClientId, setFormClientId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTerms, setFormTerms] = useState<CreditTerms>(30);
  const [formInterestRate, setFormInterestRate] = useState('5');

  // Build credit entries from clients
  const creditEntries: CreditEntry[] = useMemo(() => {
    return Object.values(clients).map((client) => {
      const utilization = client.creditLimit > 0
        ? Math.round((client.balanceDue / client.creditLimit) * 100)
        : 0;
      const daysOutstanding = client.balanceDue > 0
        ? Math.floor(Math.random() * 90) + 1 // Simulated
        : 0;
      return {
        id: `credit-${client.id}`,
        clientId: client.id,
        clientName: client.name,
        creditLimit: client.creditLimit,
        balanceDue: client.balanceDue,
        utilization: Math.min(utilization, 100),
        daysOutstanding,
        riskLevel: calculateRisk(utilization, daysOutstanding),
      };
    });
  }, [clients]);

  // Payment schedule (simulated)
  const paymentSchedule: PaymentSchedule[] = useMemo(() => {
    const schedule: PaymentSchedule[] = [];
    const now = new Date();
    Object.values(clients).forEach((client, idx) => {
      if (client.balanceDue > 0) {
        const dueDate = new Date(now.getTime() + (idx * 7 - 10) * 86400000);
        schedule.push({
          id: `pay-${client.id}`,
          clientName: client.name,
          amount: client.balanceDue,
          dueDate: dueDate.toISOString().slice(0, 10),
          status: dueDate < now ? 'Overdue' : 'Upcoming',
        });
      }
    });
    return schedule.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [clients]);

  // Summary stats
  const totalCreditExtended = creditEntries.reduce((s, c) => s + c.creditLimit, 0);
  const totalOutstanding = creditEntries.reduce((s, c) => s + c.balanceDue, 0);
  const creditUtilization = totalCreditExtended > 0
    ? Math.round((totalOutstanding / totalCreditExtended) * 100)
    : 0;
  const overdueAmount = paymentSchedule
    .filter((p) => p.status === 'Overdue')
    .reduce((s, p) => s + p.amount, 0);

  const highRiskCount = creditEntries.filter((c) => c.riskLevel === 'High').length;

  const handleExtendCredit = () => {
    const amount = parseFloat(formAmount);
    if (!formClientId || isNaN(amount) || amount <= 0) return;
    setDialogOpen(false);
    setFormAmount('');
    toast({
      title: 'Credit Extended',
      description: `${formatKsh(amount)} credit extended with ${formTerms}-day terms at ${formInterestRate}% interest`,
    });
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Overview Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Credit</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalCreditExtended)}</div>
            <div className="text-xs text-slate-400 mt-1">Extended to clients</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Outstanding</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalOutstanding)}</div>
            <div className="text-xs text-slate-400 mt-1">Balance due</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Utilization</CardDescription>
              <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="size-4 text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditUtilization}%</div>
            <Progress value={creditUtilization} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Overdue</CardDescription>
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="size-4 text-red-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{formatKsh(overdueAmount)}</div>
            <div className="text-xs text-slate-400 mt-1">{highRiskCount} high-risk clients</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Client Credit Cards ────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4 text-amber-400" />
                Client Credit Overview
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">{creditEntries.length} clients with credit</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                  <Plus className="size-3.5 mr-1.5" />
                  Extend Credit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Extend Credit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label className="text-slate-400 text-xs">Client</Label>
                    <Select value={formClientId} onValueChange={setFormClientId}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        {Object.values(clients).map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Amount (Ksh)</Label>
                    <Input
                      type="number"
                      placeholder="Enter credit amount"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-400 text-xs">Terms</Label>
                      <Select value={String(formTerms)} onValueChange={(v) => setFormTerms(Number(v) as CreditTerms)}>
                        <SelectTrigger className={inputClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                          <SelectItem value="30">30 Days</SelectItem>
                          <SelectItem value="60">60 Days</SelectItem>
                          <SelectItem value="90">90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Interest Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formInterestRate}
                        onChange={(e) => setFormInterestRate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleExtendCredit}
                    disabled={!formClientId || !formAmount}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  >
                    Extend Credit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {creditEntries.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No clients with credit</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {creditEntries.map((entry) => {
                const risk = RISK_COLORS[entry.riskLevel];
                return (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-xl border ${
                      entry.riskLevel === 'High'
                        ? 'bg-red-500/5 border-red-500/30'
                        : 'bg-slate-700/30 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">{entry.clientName}</span>
                      <Badge className={`${risk.bg} ${risk.text} border ${risk.border} text-[10px] px-1.5 py-0`}>
                        <Shield className="size-3 mr-1" />
                        {entry.riskLevel}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Credit Limit</div>
                        <div className="text-xs font-medium">{formatKsh(entry.creditLimit)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Balance Due</div>
                        <div className="text-xs font-medium text-amber-400">{formatKsh(entry.balanceDue)}</div>
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-500">Utilization</span>
                        <span className="text-[10px] text-slate-400">{entry.utilization}%</span>
                      </div>
                      <Progress
                        value={entry.utilization}
                        className={`h-1.5 ${
                          entry.utilization > 80 ? '[&>div]:bg-red-500' :
                          entry.utilization > 50 ? '[&>div]:bg-yellow-500' :
                          '[&>div]:bg-green-500'
                        }`}
                      />
                    </div>

                    <div className="text-[10px] text-slate-500">
                      {entry.daysOutstanding} days outstanding
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payment Schedule ──────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="size-4 text-amber-400" />
            Payment Schedule
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Upcoming and overdue payments</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentSchedule.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No upcoming payments</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Client</TableHead>
                    <TableHead className="text-slate-400 text-xs">Amount</TableHead>
                    <TableHead className="text-slate-400 text-xs">Due Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSchedule.map((payment) => (
                    <TableRow key={payment.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs font-medium">{payment.clientName}</TableCell>
                      <TableCell className="text-amber-400 text-xs font-semibold">{formatKsh(payment.amount)}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{payment.dueDate}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 border ${
                            payment.status === 'Overdue'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : payment.status === 'Paid'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {payment.status}
                        </Badge>
                      </TableCell>
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
