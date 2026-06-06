'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DollarSign,
  Users,
  Calculator,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  Printer,
  Banknote,
  Receipt,
  UserCheck,
  TrendingDown,
  Download,
  Edit3,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  AlertTriangle,
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
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useToast } from '@/hooks/use-toast';

// ─── Kenya Payroll Calculation Helpers ──────────────────────────────────

/** SHA (Social Health Authority) – 2.75% of gross pay */
function calculateSHA(grossPay: number): number {
  return Math.round(grossPay * 0.0275 * 100) / 100;
}

/** NSSF (National Social Security Fund) – Tier I: 6% of first 7,000, Tier II: 6% of 7,001-36,000 */
function calculateNSSF(grossPay: number): number {
  const tier1 = Math.min(grossPay, 7000) * 0.06;
  const tier2 = Math.max(0, Math.min(grossPay - 7000, 29000)) * 0.06;
  return Math.round((tier1 + tier2) * 100) / 100;
}

/** PAYE (Pay As You Earn) – Progressive tax rates (Kenya 2024) */
function calculatePAYE(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  if (taxableIncome <= 24000) return Math.round(taxableIncome * 0.10 * 100) / 100;
  if (taxableIncome <= 32333) return Math.round((2400 + (taxableIncome - 24000) * 0.25) * 100) / 100;
  if (taxableIncome <= 500000) return Math.round((4483.25 + (taxableIncome - 32333) * 0.30) * 100) / 100;
  if (taxableIncome <= 800000) return Math.round((144783.25 + (taxableIncome - 500000) * 0.325) * 100) / 100;
  return Math.round((242283.25 + (taxableIncome - 800000) * 0.35) * 100) / 100;
}

/** Full payroll calculation */
function calculatePayroll(basicSalary: number, allowances: number = 0, advance: number = 0) {
  const grossPay = basicSalary + allowances;
  const shaDeduction = calculateSHA(grossPay);
  const nssfDeduction = calculateNSSF(grossPay);
  const taxableIncome = Math.max(0, grossPay - nssfDeduction);
  const payeDeduction = calculatePAYE(taxableIncome);
  const totalDeductions = shaDeduction + nssfDeduction + payeDeduction + advance;
  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  return {
    basicSalary,
    allowances,
    grossPay,
    shaDeduction,
    nssfDeduction,
    taxableIncome,
    payeDeduction,
    advanceDeduction: advance,
    totalDeductions,
    netPay,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────
interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  payPeriod: string;
  basicSalary: number;
  allowances: number;
  grossPay: number;
  shaDeduction: number;
  nssfDeduction: number;
  payeDeduction: number;
  advanceDeduction: number;
  totalDeductions: number;
  netPay: number;
  paymentMethod: string;
  bankName: string;
  status: 'pending' | 'processed' | 'paid';
  createdAt: string;
}

interface EmployeeData {
  id: string;
  name: string;
  role: string;
  salary: number;
  phone?: string;
  nationalId?: string;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  paid: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  processed: CheckCircle2,
  paid: CheckCircle2,
};

const BANKS = ['Equity Bank', 'KCB Bank', 'Co-operative Bank', 'NCBA Bank', 'Stanbic Bank', 'Absa Bank', 'I&M Bank', 'DTB Bank', 'NIC Bank', 'M-PESA'];

// ─── Component ────────────────────────────────────────────────────────────
export function PayrollSystem() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);

  // State
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditSHADialog, setShowEditSHADialog] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customBasic, setCustomBasic] = useState(0);
  const [customAllowances, setCustomAllowances] = useState(0);
  const [customAdvance, setCustomAdvance] = useState(0);
  const [selectedBank, setSelectedBank] = useState('M-PESA');
  const [customSHARate, setCustomSHARate] = useState('2.75');
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expandedPayslip, setExpandedPayslip] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // ─── Fetch Employees ──────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    if (!token || !currentStation) return;
    try {
      const res = await fetch(`/api/employees?stationId=${currentStation.id}&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        setEmployees(data.data.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          name: e.name as string,
          role: e.role as string,
          salary: Number(e.salary) || 0,
          phone: e.phone as string | undefined,
          nationalId: e.nationalId as string | undefined,
          status: e.status as string,
        })));
      }
    } catch {
      // Silently fail - use empty employees
    }
  }, [token, currentStation]);

  // ─── Fetch Payroll Records ────────────────────────────────────────────
  const fetchPayroll = useCallback(async () => {
    if (!token || !currentStation) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/payroll?stationId=${currentStation.id}&payPeriod=${payrollMonth}&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) {
        setPayrollRecords(data.data.map((r: Record<string, unknown>) => {
          const emp = (r.employee as Record<string, unknown>) || {};
          return {
            id: r.id as string,
            employeeId: r.employeeId as string,
            employeeName: (emp.name as string) || 'Unknown',
            employeeRole: (emp.role as string) || 'N/A',
            payPeriod: payrollMonth,
            basicSalary: Number(r.basicSalary) || 0,
            allowances: Number(r.allowances) || 0,
            grossPay: Number(r.grossPay) || 0,
            shaDeduction: Number(r.shaDeduction) || 0,
            nssfDeduction: Number(r.nssfDeduction) || 0,
            payeDeduction: Number(r.payeDeduction) || 0,
            advanceDeduction: Number(r.advanceDeduction) || 0,
            totalDeductions: Number(r.totalDeductions) || 0,
            netPay: Number(r.netPay) || 0,
            paymentMethod: (r.paymentMethod as string) || 'bank_transfer',
            bankName: 'M-PESA',
            status: (r.status as 'pending' | 'processed' | 'paid') || 'pending',
            createdAt: (r.createdAt as string) || new Date().toISOString(),
          };
        }));
      } else {
        setPayrollRecords([]);
      }
    } catch {
      setPayrollRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentStation, payrollMonth]);

  useEffect(() => {
    void fetchEmployees(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchEmployees]);

  useEffect(() => {
    void fetchPayroll(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchPayroll]);

  // ─── Compute Payroll Preview ──────────────────────────────────────────
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const payrollPreview = useMemo(() => {
    const basic = customBasic || selectedEmployee?.salary || 0;
    if (!basic) return null;
    return calculatePayroll(basic, customAllowances, customAdvance);
  }, [customBasic, customAllowances, customAdvance, selectedEmployee]);

  // ─── Summary Calculations ─────────────────────────────────────────────
  const totalGross = useMemo(() => payrollRecords.reduce((sum, r) => sum + r.grossPay, 0), [payrollRecords]);
  const totalDeductions = useMemo(() => payrollRecords.reduce((sum, r) => sum + r.totalDeductions, 0), [payrollRecords]);
  const totalNetPay = useMemo(() => payrollRecords.reduce((sum, r) => sum + r.netPay, 0), [payrollRecords]);

  // ─── Process Payroll for All ──────────────────────────────────────────
  const handleProcessPayroll = async () => {
    if (!token || !currentStation) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/payroll?stationId=${currentStation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'process_all', payPeriod: payrollMonth }),
      });
      const data = await res.json();
      if (data.data) {
        toast({
          title: 'Payroll Processed',
          description: `${data.data.created} employee payroll records created for ${getMonthLabel(payrollMonth)}`,
        });
        fetchPayroll();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process payroll', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to process payroll', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Add Single Payroll Record ────────────────────────────────────────
  const handleAddRecord = async () => {
    if (!token || !currentStation || !selectedEmployeeId || !payrollPreview) {
      toast({ title: 'Error', description: 'Select an employee first', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch(`/api/payroll?stationId=${currentStation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          payPeriod: payrollMonth,
          basicSalary: payrollPreview.basicSalary,
          allowances: payrollPreview.allowances,
          advanceDeduction: payrollPreview.advanceDeduction,
          paymentMethod: selectedBank === 'M-PESA' ? 'mpesa' : 'bank_transfer',
        }),
      });
      const data = await res.json();
      if (data.data) {
        toast({ title: 'Payroll Added', description: `${selectedEmployee?.name}: ${formatKsh(payrollPreview.netPay)} net pay` });
        setShowAddDialog(false);
        setSelectedEmployeeId('');
        setCustomBasic(0);
        setCustomAllowances(0);
        setCustomAdvance(0);
        fetchPayroll();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to add payroll record', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add payroll record', variant: 'destructive' });
    }
  };

  // ─── Edit SHA for All ─────────────────────────────────────────────────
  const handleEditSHAForAll = async () => {
    if (!token || !currentStation) return;
    try {
      const shaRate = parseFloat(customSHARate) / 100;
      const res = await fetch(`/api/payroll?stationId=${currentStation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'update_sha', payPeriod: payrollMonth, shaRate }),
      });
      const data = await res.json();
      if (data.data) {
        toast({ title: 'SHA Updated', description: `${data.data.updated} records updated with ${customSHARate}% SHA rate` });
        setShowEditSHADialog(false);
        fetchPayroll();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update SHA', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update SHA', variant: 'destructive' });
    }
  };

  // ─── Mark as Paid ─────────────────────────────────────────────────────
  const handleMarkPaid = async (recordIds: string[]) => {
    if (!token || !currentStation) return;
    try {
      const res = await fetch(`/api/payroll?stationId=${currentStation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'mark_paid', recordIds }),
      });
      const data = await res.json();
      if (data.data) {
        toast({ title: 'Payments Marked', description: `${data.data.paid} records marked as paid` });
        fetchPayroll();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to mark as paid', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to mark as paid', variant: 'destructive' });
    }
  };

  // ─── Export CSV (NSSF or SHA List) ────────────────────────────────────
  const handleExportNSSFList = () => {
    const headers = ['#', 'Employee Name', 'Role', 'Gross Pay', 'NSSF Deduction', 'Employer Contribution', 'Total NSSF', 'Period'];
    const rows = payrollRecords.map((r, i) => [
      String(i + 1),
      r.employeeName,
      r.employeeRole,
      String(r.grossPay),
      String(r.nssfDeduction),
      String(r.nssfDeduction), // Employer matches
      String(r.nssfDeduction * 2),
      getMonthLabel(r.payPeriod),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    downloadCSV(csv, `nssf-list-${payrollMonth}.csv`);
    toast({ title: 'NSSF List Exported', description: `${payrollRecords.length} employee records` });
  };

  const handleExportSHAList = () => {
    const headers = ['#', 'Employee Name', 'Role', 'Gross Pay', 'SHA Deduction (2.75%)', 'Period'];
    const rows = payrollRecords.map((r, i) => [
      String(i + 1),
      r.employeeName,
      r.employeeRole,
      String(r.grossPay),
      String(r.shaDeduction),
      getMonthLabel(r.payPeriod),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    downloadCSV(csv, `sha-list-${payrollMonth}.csv`);
    toast({ title: 'SHA List Exported', description: `${payrollRecords.length} employee records` });
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Group records by month for history ──────────────────────────────
  const monthlyHistory = useMemo(() => {
    const grouped: Record<string, PayrollRecord[]> = {};
    for (const r of payrollRecords) {
      if (!grouped[r.payPeriod]) grouped[r.payPeriod] = [];
      grouped[r.payPeriod].push(r);
    }
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [payrollRecords]);

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Employees</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Users className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollRecords.length}</div>
            <div className="text-xs text-slate-400 mt-1">Active payroll records</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Gross Pay</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Banknote className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalGross)}</div>
            <div className="text-xs text-slate-400 mt-1">Total gross for {getMonthLabel(payrollMonth)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Deductions</CardDescription>
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="size-4 text-red-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-300">{formatKsh(totalDeductions)}</div>
            <div className="text-xs text-slate-400 mt-1">SHA + NSSF + PAYE + Advance</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Net Pay</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatKsh(totalNetPay)}</div>
            <div className="text-xs text-slate-400 mt-1">Take-home amount</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Actions Bar ────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Calculator className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Payroll Period</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Month / Year</Label>
                <Input type="month" value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleProcessPayroll}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                disabled={isProcessing}
              >
                {isProcessing ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Users className="size-4 mr-2" />}
                Process Payroll
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    <Plus className="size-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Employee to Payroll</DialogTitle>
                    <DialogDescription className="text-slate-400">Select employee and auto-calculate Kenya deductions</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400 text-xs">Employee</Label>
                      <Select value={selectedEmployeeId} onValueChange={(v) => { setSelectedEmployeeId(v); setCustomBasic(0); setCustomAllowances(0); setCustomAdvance(0); }}>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                          {employees.filter((e) => e.status === 'active').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} — {formatKsh(emp.salary)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Basic Salary (Ksh) — leave 0 for default</Label>
                        <Input
                          type="number"
                          placeholder="0 = use employee salary"
                          value={customBasic || ''}
                          onChange={(e) => setCustomBasic(Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Allowances (Ksh)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={customAllowances || ''}
                          onChange={(e) => setCustomAllowances(Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Advance / Loan Deduction (Ksh)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={customAdvance || ''}
                          onChange={(e) => setCustomAdvance(Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Payment Method / Bank</Label>
                        <Select value={selectedBank} onValueChange={setSelectedBank}>
                          <SelectTrigger className={inputClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            {BANKS.map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Live Calculation Preview */}
                    {payrollPreview && (
                      <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-700/30 space-y-2">
                        <div className="text-xs text-amber-400 font-semibold mb-2">Kenya Payroll Preview (2024 Rates)</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <span className="text-slate-400">Basic Salary</span>
                          <span className="text-white font-semibold text-right">{formatKsh(payrollPreview.basicSalary)}</span>

                          <span className="text-slate-400">Allowances</span>
                          <span className="text-white font-semibold text-right">{formatKsh(payrollPreview.allowances)}</span>

                          <span className="text-slate-400">Gross Pay</span>
                          <span className="text-white font-bold text-right">{formatKsh(payrollPreview.grossPay)}</span>

                          <Separator className="col-span-2 bg-slate-600" />

                          <span className="text-slate-400">SHA (2.75% of Gross)</span>
                          <span className="text-red-300 text-right">-{formatKsh(payrollPreview.shaDeduction)}</span>

                          <span className="text-slate-400">NSSF (Tier I + Tier II)</span>
                          <span className="text-red-300 text-right">-{formatKsh(payrollPreview.nssfDeduction)}</span>

                          <span className="text-slate-400">Taxable Income (Gross - NSSF)</span>
                          <span className="text-white text-right">{formatKsh(payrollPreview.taxableIncome)}</span>

                          <span className="text-slate-400">PAYE (Progressive)</span>
                          <span className="text-red-300 font-semibold text-right">-{formatKsh(payrollPreview.payeDeduction)}</span>

                          {payrollPreview.advanceDeduction > 0 && (
                            <>
                              <span className="text-slate-400">Advance / Loan</span>
                              <span className="text-red-300 text-right">-{formatKsh(payrollPreview.advanceDeduction)}</span>
                            </>
                          )}

                          <Separator className="col-span-2 bg-slate-600" />

                          <span className="text-slate-400">Total Deductions</span>
                          <span className="text-red-300 font-semibold text-right">-{formatKsh(payrollPreview.totalDeductions)}</span>

                          <span className="text-white font-semibold">Net Pay</span>
                          <span className="text-green-400 font-bold text-right text-sm">{formatKsh(payrollPreview.netPay)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" className="text-slate-400" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={handleAddRecord}>
                      Add to Payroll
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showEditSHADialog} onOpenChange={setShowEditSHADialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
                    <Edit3 className="size-4 mr-2" />
                    Edit SHA for All
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit SHA Rate for All Employees</DialogTitle>
                    <DialogDescription className="text-slate-400">Update the Social Health Authority deduction rate for all pending payroll records</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400 text-xs">SHA Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={customSHARate}
                        onChange={(e) => setCustomSHARate(e.target.value)}
                        className={inputClass}
                      />
                      <div className="text-xs text-slate-500 mt-1">Default: 2.75% (Kenya 2024)</div>
                    </div>
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-amber-300">
                        <AlertTriangle className="size-3.5" />
                        This will recalculate SHA deductions for all pending records in {getMonthLabel(payrollMonth)}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" className="text-slate-400" onClick={() => setShowEditSHADialog(false)}>Cancel</Button>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={handleEditSHAForAll}>
                      Update SHA Rate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700" onClick={handleExportNSSFList}>
                <Download className="size-4 mr-2" />
                Export NSSF List
              </Button>
              <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-700" onClick={handleExportSHAList}>
                <Download className="size-4 mr-2" />
                Export SHA List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Payroll Table ─────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Kenya Payroll — {getMonthLabel(payrollMonth)}</CardTitle>
              <CardDescription className="text-slate-400 text-xs">{payrollRecords.length} records · SHA 2.75% · NSSF New Rates · PAYE 2024</CardDescription>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              <Receipt className="size-3 mr-1" /> KRA Compliant
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-6 text-amber-400 animate-spin" />
              <span className="ml-2 text-slate-400 text-sm">Loading payroll...</span>
            </div>
          ) : payrollRecords.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-12">
              <Banknote className="size-12 text-slate-600 mx-auto mb-3" />
              <div className="font-medium text-slate-400">No payroll records for {getMonthLabel(payrollMonth)}</div>
              <div className="text-xs text-slate-500 mt-1">Click &quot;Process Payroll&quot; to generate records for all active employees.</div>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs w-8">#</TableHead>
                    <TableHead className="text-slate-400 text-xs">Name</TableHead>
                    <TableHead className="text-slate-400 text-xs">Role</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Basic</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Allow.</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Gross</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">SHA</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">NSSF</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">PAYE</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Advance</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right font-bold">Net Pay</TableHead>
                    <TableHead className="text-slate-400 text-xs">Bank</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record, idx) => {
                    const StatusIcon = STATUS_ICONS[record.status] || Clock;
                    return (
                      <TableRow key={record.id} className="border-slate-700/50">
                        <TableCell className="text-slate-500 text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-white text-xs font-medium">{record.employeeName}</TableCell>
                        <TableCell className="text-slate-400 text-xs">{record.employeeRole}</TableCell>
                        <TableCell className="text-slate-300 text-xs text-right">{formatKsh(record.basicSalary)}</TableCell>
                        <TableCell className="text-slate-300 text-xs text-right">{formatKsh(record.allowances)}</TableCell>
                        <TableCell className="text-white text-xs text-right font-medium">{formatKsh(record.grossPay)}</TableCell>
                        <TableCell className="text-red-300 text-xs text-right">{formatKsh(record.shaDeduction)}</TableCell>
                        <TableCell className="text-red-300 text-xs text-right">{formatKsh(record.nssfDeduction)}</TableCell>
                        <TableCell className="text-red-300 text-xs text-right">{formatKsh(record.payeDeduction)}</TableCell>
                        <TableCell className="text-red-300 text-xs text-right">{formatKsh(record.advanceDeduction)}</TableCell>
                        <TableCell className="text-green-400 text-xs font-bold text-right">{formatKsh(record.netPay)}</TableCell>
                        <TableCell className="text-slate-400 text-xs">{record.bankName}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_STYLES[record.status] || STATUS_STYLES.pending} text-[10px] px-1.5 py-0 border`}>
                            <StatusIcon className="size-2.5 mr-0.5" />
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-slate-500 hover:text-amber-400"
                            onClick={() => setExpandedPayslip(expandedPayslip === record.id ? null : record.id)}
                          >
                            {expandedPayslip === record.id ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Bulk Actions */}
          {payrollRecords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700/50 pt-4">
              <Button
                size="sm"
                variant="outline"
                className="border-green-600 text-green-400 hover:bg-green-600/20"
                onClick={() => handleMarkPaid(payrollRecords.filter((r) => r.status === 'pending' || r.status === 'processed').map((r) => r.id))}
                disabled={!payrollRecords.some((r) => r.status === 'pending' || r.status === 'processed')}
              >
                <CheckCircle2 className="size-3.5 mr-1.5" />
                Mark All as Paid
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payslip Preview ────────────────────────────────────────────── */}
      {expandedPayslip && (() => {
        const record = payrollRecords.find((r) => r.id === expandedPayslip);
        if (!record) return null;

        return (
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Payslip Preview</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">{getMonthLabel(record.payPeriod)}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                  onClick={() => setExpandedPayslip(null)}
                >
                  <Printer className="size-4 mr-1" /> Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900/60 rounded-xl p-4 sm:p-6 border border-slate-700/30 max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="text-amber-400 font-bold text-lg">FUELPRO STATION</div>
                  <div className="text-slate-400 text-xs">PAY SLIP — {getMonthLabel(record.payPeriod)}</div>
                </div>
                <Separator className="bg-slate-700/50 mb-4" />
                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div>
                    <span className="text-slate-500">Name:</span>
                    <span className="text-white ml-1 font-medium">{record.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Role:</span>
                    <span className="text-white ml-1">{record.employeeRole}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Period:</span>
                    <span className="text-white ml-1">{getMonthLabel(record.payPeriod)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Bank:</span>
                    <span className="text-white ml-1">{record.bankName}</span>
                  </div>
                </div>
                <Separator className="bg-slate-700/50 mb-4" />
                {/* Earnings */}
                <div className="text-xs font-semibold text-green-400 mb-2">EARNINGS</div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Basic Salary</span>
                  <span className="text-white font-semibold">{formatKsh(record.basicSalary)}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Allowances</span>
                  <span className="text-white font-semibold">{formatKsh(record.allowances)}</span>
                </div>
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-slate-300 font-semibold">Gross Pay</span>
                  <span className="text-white font-bold">{formatKsh(record.grossPay)}</span>
                </div>
                <Separator className="bg-slate-700/50 mb-4" />
                {/* Deductions */}
                <div className="text-xs font-semibold text-red-400 mb-2">DEDUCTIONS</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-300">SHA (Social Health Authority 2.75%)</span>
                    <span className="text-red-300">-{formatKsh(record.shaDeduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">NSSF (Tier I + Tier II)</span>
                    <span className="text-red-300">-{formatKsh(record.nssfDeduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">PAYE (Income Tax)</span>
                    <span className="text-red-300">-{formatKsh(record.payeDeduction)}</span>
                  </div>
                  {record.advanceDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">Advance / Loan</span>
                      <span className="text-red-300">-{formatKsh(record.advanceDeduction)}</span>
                    </div>
                  )}
                </div>
                <Separator className="bg-slate-700/50 my-3" />
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">Total Deductions</span>
                  <span className="text-red-300 font-semibold">-{formatKsh(record.totalDeductions)}</span>
                </div>
                <Separator className="bg-slate-700/50 my-3" />
                {/* Net Pay */}
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-sm">NET PAY</span>
                  <span className="text-green-400 font-bold text-xl">{formatKsh(record.netPay)}</span>
                </div>
                <Separator className="bg-slate-700/50 my-3" />
                {/* Employer Contributions */}
                <div className="text-xs font-semibold text-cyan-400 mb-2">EMPLOYER CONTRIBUTIONS</div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">NSSF Employer (6%)</span>
                  <span className="text-cyan-300">{formatKsh(record.nssfDeduction)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-300 font-semibold">Total Cost to Employer</span>
                  <span className="text-amber-400 font-semibold">{formatKsh(record.grossPay + record.nssfDeduction)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Payroll History ────────────────────────────────────────────── */}
      {monthlyHistory.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base">Payroll History</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Monthly payroll records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {monthlyHistory.map(([month, records]) => (
                <div key={month} className="bg-slate-700/20 rounded-xl p-3 border border-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{getMonthLabel(month)}</span>
                    <Badge className="bg-slate-600/50 text-slate-300 text-xs">
                      <UserCheck className="size-3 mr-1" /> {records.length} employees
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Total Gross</span>
                      <div className="text-white font-semibold">{formatKsh(records.reduce((s, r) => s + r.grossPay, 0))}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Net</span>
                      <div className="text-green-400 font-semibold">{formatKsh(records.reduce((s, r) => s + r.netPay, 0))}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">PAYE</span>
                      <div className="text-red-300">{formatKsh(records.reduce((s, r) => s + r.payeDeduction, 0))}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">NSSF + SHA</span>
                      <div className="text-cyan-300">{formatKsh(records.reduce((s, r) => s + r.nssfDeduction + r.shaDeduction, 0))}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Kenya Tax Reference ──────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Kenya Tax Reference (2024)</CardTitle>
            <FileText className="size-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-700/30">
              <div className="text-amber-400 font-semibold mb-2">PAYE Bands</div>
              <div className="space-y-1 text-slate-300">
                <div>Up to 24,000 → 10%</div>
                <div>24,001 – 32,333 → 25%</div>
                <div>32,334 – 500,000 → 30%</div>
                <div>500,001 – 800,000 → 32.5%</div>
                <div>Above 800,000 → 35%</div>
                <div className="text-green-400 mt-1">Relief: Ksh 2,400/mo</div>
              </div>
            </div>
            <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-700/30">
              <div className="text-cyan-400 font-semibold mb-2">NSSF (New Rates)</div>
              <div className="space-y-1 text-slate-300">
                <div>Tier 1: Up to 7,000 × 6%</div>
                <div>Tier 2: 7,001 – 36,000 × 6%</div>
                <div className="text-slate-400 mt-1">Employee = Employer</div>
                <div className="text-green-400 mt-1">Max: Ksh 2,160/mo</div>
              </div>
            </div>
            <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-700/30">
              <div className="text-red-400 font-semibold mb-2">SHA (Social Health)</div>
              <div className="space-y-1 text-slate-300">
                <div>2.75% of gross pay</div>
                <div>Replaces NHIF from 2024</div>
                <div className="text-green-400 mt-1">Unified health cover</div>
              </div>
            </div>
            <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-700/30">
              <div className="text-purple-400 font-semibold mb-2">Housing Levy</div>
              <div className="space-y-1 text-slate-300">
                <div>1.5% of gross salary</div>
                <div>Employee contribution</div>
                <div className="text-green-400 mt-1">Affordable Housing</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
