'use client';

import { useState, useMemo } from 'react';
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
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────
interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g. "2025-01"
  grossSalary: number;
  paye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  nhif: number;
  housingLevy: number;
  personalRelief: number;
  netPay: number;
  createdAt: string;
}

// ─── KRA Tax Calculation Helpers ──────────────────────────────────────────

/** PAYE calculation – Kenya 2024 rates with personal relief */
function calculatePAYE(grossSalary: number): { taxBeforeRelief: number; relief: number; paye: number } {
  const PERSONAL_RELIEF = 2400;

  // Taxable income after NSSF employee deduction (for PAYE purposes)
  // Actually PAYE is computed on gross, but NSSF is a deductible allowance
  // We'll compute PAYE on gross minus NSSF employee contribution
  const nssfEmp = calculateNSSF(grossSalary).employee;
  const taxableIncome = Math.max(0, grossSalary - nssfEmp);

  let tax = 0;
  if (taxableIncome <= 24000) {
    tax = taxableIncome * 0.10;
  } else if (taxableIncome <= 32333) {
    tax = 24000 * 0.10 + (taxableIncome - 24000) * 0.25;
  } else if (taxableIncome <= 500000) {
    tax = 24000 * 0.10 + (32333 - 24000) * 0.25 + (taxableIncome - 32333) * 0.30;
  } else if (taxableIncome <= 800000) {
    tax = 24000 * 0.10 + (32333 - 24000) * 0.25 + (500000 - 32333) * 0.30 + (taxableIncome - 500000) * 0.325;
  } else {
    tax = 24000 * 0.10 + (32333 - 24000) * 0.25 + (500000 - 32333) * 0.30 + (800000 - 500000) * 0.325 + (taxableIncome - 800000) * 0.35;
  }

  const paye = Math.max(0, tax - PERSONAL_RELIEF);
  return { taxBeforeRelief: Math.round(tax), relief: PERSONAL_RELIEF, paye: Math.round(paye) };
}

/** NSSF – New rates (2024): Tier 1 up to 7,000 at 6%, Tier 2 up to 36,000 at 6% */
function calculateNSSF(grossSalary: number): { employee: number; employer: number } {
  const TIER1_LIMIT = 7000;
  const TIER2_LIMIT = 36000;
  const RATE = 0.06;

  const tier1 = Math.min(grossSalary, TIER1_LIMIT) * RATE;
  const tier2 = grossSalary > TIER1_LIMIT ? (Math.min(grossSalary, TIER2_LIMIT) - TIER1_LIMIT) * RATE : 0;
  const employee = Math.round(tier1 + tier2);
  const employer = employee; // same rate for employer
  return { employee, employer };
}

/** NHIF/SHIF – Based on salary bands (2024 rates) */
function calculateNHIF(grossSalary: number): number {
  if (grossSalary <= 5999) return 150;
  if (grossSalary <= 7999) return 300;
  if (grossSalary <= 11999) return 400;
  if (grossSalary <= 14999) return 500;
  if (grossSalary <= 19999) return 600;
  if (grossSalary <= 24999) return 750;
  if (grossSalary <= 29999) return 850;
  if (grossSalary <= 34999) return 900;
  if (grossSalary <= 39999) return 950;
  if (grossSalary <= 44999) return 1000;
  if (grossSalary <= 49999) return 1100;
  if (grossSalary <= 59999) return 1200;
  if (grossSalary <= 69999) return 1300;
  if (grossSalary <= 79999) return 1400;
  if (grossSalary <= 89999) return 1500;
  if (grossSalary <= 99999) return 1600;
  return 1700;
}

/** Housing Levy – 1.5% employee */
function calculateHousingLevy(grossSalary: number): number {
  return Math.round(grossSalary * 0.015);
}

/** Full payroll calculation */
function calculatePayroll(grossSalary: number) {
  const payeResult = calculatePAYE(grossSalary);
  const nssf = calculateNSSF(grossSalary);
  const nhif = calculateNHIF(grossSalary);
  const housingLevy = calculateHousingLevy(grossSalary);
  const totalDeductions = payeResult.paye + nssf.employee + nhif + housingLevy;
  const netPay = grossSalary - totalDeductions;

  return {
    grossSalary,
    paye: payeResult.paye,
    payeBeforeRelief: payeResult.taxBeforeRelief,
    personalRelief: payeResult.relief,
    nssfEmployee: nssf.employee,
    nssfEmployer: nssf.employer,
    nhif,
    housingLevy,
    totalDeductions,
    netPay: Math.round(netPay),
  };
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

// ─── Component ────────────────────────────────────────────────────────────
export function PayrollSystem() {
  const { toast } = useToast();
  const employees = useFuelStore((s) => s.employees);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customGross, setCustomGross] = useState(0);
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expandedPayslip, setExpandedPayslip] = useState<string | null>(null);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // ─── Compute Payroll for Selected Employee ──────────────────────────
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const payrollPreview = useMemo(() => {
    const gross = customGross || selectedEmployee?.salary || 0;
    if (!gross) return null;
    return calculatePayroll(gross);
  }, [customGross, selectedEmployee]);

  // ─── Summary Calculations ─────────────────────────────────────────────
  const currentMonthRecords = useMemo(() => {
    return payrollRecords.filter((r) => r.month === payrollMonth);
  }, [payrollRecords, payrollMonth]);

  const totalPayroll = useMemo(() => currentMonthRecords.reduce((sum, r) => sum + r.grossSalary, 0), [currentMonthRecords]);
  const totalNetPay = useMemo(() => currentMonthRecords.reduce((sum, r) => sum + r.netPay, 0), [currentMonthRecords]);
  const totalPAYE = useMemo(() => currentMonthRecords.reduce((sum, r) => sum + r.paye, 0), [currentMonthRecords]);
  const totalNSSF = useMemo(() => currentMonthRecords.reduce((sum, r) => sum + r.nssfEmployee + r.nssfEmployer, 0), [currentMonthRecords]);

  // ─── Auto-generate payroll for all active employees ──────────────────
  const autoGeneratePayroll = () => {
    const activeEmployees = employees.filter((e) => e.status === 'active' && e.salary > 0);
    if (activeEmployees.length === 0) {
      toast({ title: 'No Employees', description: 'No active employees with salary found', variant: 'destructive' });
      return;
    }

    // Check for existing records this month
    const existingIds = new Set(currentMonthRecords.map((r) => r.employeeId));
    const newRecords: PayrollRecord[] = [];

    for (const emp of activeEmployees) {
      if (existingIds.has(emp.id)) continue;
      const calc = calculatePayroll(emp.salary);
      newRecords.push({
        id: `PR${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        employeeId: emp.id,
        employeeName: emp.name,
        month: payrollMonth,
        grossSalary: calc.grossSalary,
        paye: calc.paye,
        nssfEmployee: calc.nssfEmployee,
        nssfEmployer: calc.nssfEmployer,
        nhif: calc.nhif,
        housingLevy: calc.housingLevy,
        personalRelief: calc.personalRelief,
        netPay: calc.netPay,
        createdAt: new Date().toISOString(),
      });
    }

    if (newRecords.length === 0) {
      toast({ title: 'Already Generated', description: 'Payroll for all active employees already exists this month' });
      return;
    }

    setPayrollRecords((prev) => [...prev, ...newRecords]);
    toast({ title: 'Payroll Generated', description: `${newRecords.length} employee payroll records created for ${getMonthLabel(payrollMonth)}` });
  };

  // ─── Add Single Payroll Record ───────────────────────────────────────
  const handleAddRecord = () => {
    if (!selectedEmployeeId || !payrollPreview) {
      toast({ title: 'Error', description: 'Select an employee first', variant: 'destructive' });
      return;
    }
    // Check if record exists
    const exists = currentMonthRecords.find((r) => r.employeeId === selectedEmployeeId);
    if (exists) {
      toast({ title: 'Duplicate', description: 'Payroll record already exists for this employee this month', variant: 'destructive' });
      return;
    }

    const record: PayrollRecord = {
      id: `PR${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      employeeId: selectedEmployeeId,
      employeeName: selectedEmployee?.name || 'Unknown',
      month: payrollMonth,
      grossSalary: payrollPreview.grossSalary,
      paye: payrollPreview.paye,
      nssfEmployee: payrollPreview.nssfEmployee,
      nssfEmployer: payrollPreview.nssfEmployer,
      nhif: payrollPreview.nhif,
      housingLevy: payrollPreview.housingLevy,
      personalRelief: payrollPreview.personalRelief,
      netPay: payrollPreview.netPay,
      createdAt: new Date().toISOString(),
    };

    setPayrollRecords((prev) => [...prev, record]);
    toast({ title: 'Payroll Added', description: `${record.employeeName}: ${formatKsh(record.netPay)} net pay` });
    setShowAddDialog(false);
    setSelectedEmployeeId('');
    setCustomGross(0);
  };

  // ─── Delete Record ───────────────────────────────────────────────────
  const handleDeleteRecord = (id: string) => {
    setPayrollRecords((prev) => prev.filter((r) => r.id !== id));
    toast({ title: 'Record Deleted', description: 'Payroll record has been removed' });
  };

  // ─── Group records by month for history ──────────────────────────────
  const monthlyHistory = useMemo(() => {
    const grouped: Record<string, PayrollRecord[]> = {};
    for (const r of payrollRecords) {
      if (!grouped[r.month]) grouped[r.month] = [];
      grouped[r.month].push(r);
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
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Payroll</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Banknote className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalPayroll)}</div>
            <div className="text-xs text-slate-400 mt-1">{currentMonthRecords.length} employees</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Net Pay</CardDescription>
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

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">PAYE Deducted</CardDescription>
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingDown className="size-4 text-red-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-300">{formatKsh(totalPAYE)}</div>
            <div className="text-xs text-slate-400 mt-1">Kenya Revenue Authority</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">NSSF Contributed</CardDescription>
              <div className="size-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Users className="size-4 text-cyan-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-300">{formatKsh(totalNSSF)}</div>
            <div className="text-xs text-slate-400 mt-1">Employee + Employer</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Actions Bar ────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Calculator className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Payroll Period</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
              <div>
                <Label className="text-slate-400 text-xs">Month</Label>
                <Input type="month" value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={autoGeneratePayroll}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <Users className="size-4 mr-2" />
                Auto-Generate
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    <Plus className="size-4 mr-2" />
                    Add Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Payroll Record</DialogTitle>
                    <DialogDescription className="text-slate-400">Select employee and auto-calculate deductions</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-400 text-xs">Employee</Label>
                      <Select value={selectedEmployeeId} onValueChange={(v) => { setSelectedEmployeeId(v); setCustomGross(0); }}>
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
                    <div>
                      <Label className="text-slate-400 text-xs">Gross Salary (Ksh) — leave 0 to use employee default</Label>
                      <Input
                        type="number"
                        placeholder="0 = use employee salary"
                        value={customGross || ''}
                        onChange={(e) => setCustomGross(Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>

                    {/* Live Calculation Preview */}
                    {payrollPreview && (
                      <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-700/30 space-y-2">
                        <div className="text-xs text-amber-400 font-semibold mb-2">KRA Deduction Preview</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <span className="text-slate-400">Gross Salary</span>
                          <span className="text-white font-semibold text-right">{formatKsh(payrollPreview.grossSalary)}</span>

                          <span className="text-slate-400">Taxable Income (Gross - NSSF)</span>
                          <span className="text-white font-semibold text-right">{formatKsh(payrollPreview.grossSalary - payrollPreview.nssfEmployee)}</span>

                          <span className="text-slate-400">Tax Before Relief</span>
                          <span className="text-red-300 text-right">{formatKsh(payrollPreview.payeBeforeRelief)}</span>

                          <span className="text-slate-400">Personal Relief</span>
                          <span className="text-green-300 text-right">-{formatKsh(payrollPreview.personalRelief)}</span>

                          <span className="text-slate-400">PAYE</span>
                          <span className="text-red-300 font-semibold text-right">-{formatKsh(payrollPreview.paye)}</span>

                          <span className="text-slate-400">NSSF (Employee 6%)</span>
                          <span className="text-red-300 text-right">-{formatKsh(payrollPreview.nssfEmployee)}</span>

                          <span className="text-slate-400">NSSF (Employer 6%)</span>
                          <span className="text-cyan-300 text-right">{formatKsh(payrollPreview.nssfEmployer)}</span>

                          <span className="text-slate-400">NHIF/SHIF</span>
                          <span className="text-red-300 text-right">-{formatKsh(payrollPreview.nhif)}</span>

                          <span className="text-slate-400">Housing Levy (1.5%)</span>
                          <span className="text-red-300 text-right">-{formatKsh(payrollPreview.housingLevy)}</span>

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
                      Add Payroll Record
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Employee Payroll Table ─────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Employee Payroll — {getMonthLabel(payrollMonth)}</CardTitle>
              <CardDescription className="text-slate-400 text-xs">{currentMonthRecords.length} records</CardDescription>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              <Receipt className="size-3 mr-1" /> KRA Compliant
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {currentMonthRecords.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">
              No payroll records for {getMonthLabel(payrollMonth)}. Click &quot;Auto-Generate&quot; to create records.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Employee</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Gross</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">PAYE</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">NSSF (Emp)</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">NSSF (Er)</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">NHIF</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Housing</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right font-bold">Net Pay</TableHead>
                    <TableHead className="text-slate-400 text-xs w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMonthRecords.map((record) => (
                    <TableRow key={record.id} className="border-slate-700/50">
                      <TableCell className="text-white text-xs font-medium">{record.employeeName}</TableCell>
                      <TableCell className="text-slate-300 text-xs text-right">{formatKsh(record.grossSalary)}</TableCell>
                      <TableCell className="text-red-300 text-xs text-right">{formatKsh(record.paye)}</TableCell>
                      <TableCell className="text-red-300 text-xs text-right">{formatKsh(record.nssfEmployee)}</TableCell>
                      <TableCell className="text-cyan-300 text-xs text-right">{formatKsh(record.nssfEmployer)}</TableCell>
                      <TableCell className="text-red-300 text-xs text-right">{formatKsh(record.nhif)}</TableCell>
                      <TableCell className="text-red-300 text-xs text-right">{formatKsh(record.housingLevy)}</TableCell>
                      <TableCell className="text-green-400 text-xs font-bold text-right">{formatKsh(record.netPay)}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payslip Preview ────────────────────────────────────────────── */}
      {expandedPayslip && (() => {
        const record = currentMonthRecords.find((r) => r.id === expandedPayslip);
        if (!record) return null;
        const emp = employees.find((e) => e.id === record.employeeId);

        return (
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Payslip Preview</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">{getMonthLabel(record.month)}</CardDescription>
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
                  <div className="text-slate-400 text-xs">PAY SLIP — {getMonthLabel(record.month)}</div>
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
                    <span className="text-white ml-1">{emp?.role || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ID:</span>
                    <span className="text-white ml-1">{emp?.nationalId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Period:</span>
                    <span className="text-white ml-1">{getMonthLabel(record.month)}</span>
                  </div>
                </div>
                <Separator className="bg-slate-700/50 mb-4" />
                {/* Earnings */}
                <div className="text-xs font-semibold text-green-400 mb-2">EARNINGS</div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Basic Salary</span>
                  <span className="text-white font-semibold">{formatKsh(record.grossSalary)}</span>
                </div>
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-slate-300 font-semibold">Total Earnings</span>
                  <span className="text-white font-bold">{formatKsh(record.grossSalary)}</span>
                </div>
                <Separator className="bg-slate-700/50 mb-4" />
                {/* Deductions */}
                <div className="text-xs font-semibold text-red-400 mb-2">DEDUCTIONS</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-300">PAYE (Income Tax)</span>
                    <span className="text-red-300">-{formatKsh(record.paye)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">NSSF Employee (6%)</span>
                    <span className="text-red-300">-{formatKsh(record.nssfEmployee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">NHIF/SHIF</span>
                    <span className="text-red-300">-{formatKsh(record.nhif)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Housing Levy (1.5%)</span>
                    <span className="text-red-300">-{formatKsh(record.housingLevy)}</span>
                  </div>
                </div>
                <Separator className="bg-slate-700/50 my-3" />
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Personal Relief Applied</span>
                  <span className="text-green-300">{formatKsh(record.personalRelief)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-300 font-semibold">Total Deductions</span>
                  <span className="text-red-300 font-semibold">-{formatKsh(record.paye + record.nssfEmployee + record.nhif + record.housingLevy)}</span>
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
                  <span className="text-cyan-300">{formatKsh(record.nssfEmployer)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-300 font-semibold">Total Cost to Employer</span>
                  <span className="text-amber-400 font-semibold">{formatKsh(record.grossSalary + record.nssfEmployer)}</span>
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
                      <div className="text-white font-semibold">{formatKsh(records.reduce((s, r) => s + r.grossSalary, 0))}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Net</span>
                      <div className="text-green-400 font-semibold">{formatKsh(records.reduce((s, r) => s + r.netPay, 0))}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">PAYE</span>
                      <div className="text-red-300">{formatKsh(records.reduce((s, r) => s + r.paye, 0))}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">NSSF Total</span>
                      <div className="text-cyan-300">{formatKsh(records.reduce((s, r) => s + r.nssfEmployee + r.nssfEmployer, 0))}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KRA Tax Reference ──────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">KRA Tax Reference (2024)</CardTitle>
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
              <div className="text-red-400 font-semibold mb-2">NHIF/SHIF</div>
              <div className="space-y-1 text-slate-300">
                <div>Ksh 150 (≤ 5,999)</div>
                <div>Ksh 300 (6k – 8k)</div>
                <div>Ksh 600 (15k – 20k)</div>
                <div>Ksh 1,000 (35k – 45k)</div>
                <div className="text-green-400 mt-1">Max: Ksh 1,700/mo</div>
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
