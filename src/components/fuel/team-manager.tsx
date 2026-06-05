'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Shield,
  Pencil,
  Trash2,
  Phone,
  CreditCard,
  IdCard,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';
import type { Employee, EmployeeRole, EmployeeFormData } from '@/types/fuel';

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const roleConfig: Record<EmployeeRole, { label: string; color: string }> = {
  manager: { label: 'Manager', color: 'bg-purple-500' },
  attendant: { label: 'Attendant', color: 'bg-blue-500' },
  accountant: { label: 'Accountant', color: 'bg-green-500' },
  supervisor: { label: 'Supervisor', color: 'bg-amber-500' },
  other: { label: 'Other', color: 'bg-slate-500' },
};

export function TeamManager() {
  const employees = useFuelStore((s) => s.employees);
  const addEmployee = useFuelStore((s) => s.addEmployee);
  const updateEmployee = useFuelStore((s) => s.updateEmployee);
  const deleteEmployee = useFuelStore((s) => s.deleteEmployee);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormData>({
    name: '',
    phone: '',
    role: 'attendant',
    salary: 0,
    hireDate: new Date().toISOString().slice(0, 10),
    status: 'active',
    nationalId: '',
  });

  const resetForm = () => {
    setForm({ name: '', phone: '', role: 'attendant', salary: 0, hireDate: new Date().toISOString().slice(0, 10), status: 'active', nationalId: '' });
    setEditingId(null);
  };

  // Summary
  const totalStaff = employees.length;
  const activeStaff = useMemo(() => employees.filter((e) => e.status === 'active').length, [employees]);
  const managers = useMemo(() => employees.filter((e) => e.role === 'manager').length, [employees]);
  const attendants = useMemo(() => employees.filter((e) => e.role === 'attendant').length, [employees]);

  const handleOpenAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setForm({
      name: emp.name,
      phone: emp.phone || '',
      role: emp.role,
      salary: emp.salary,
      hireDate: emp.hireDate || '',
      status: emp.status,
      nationalId: emp.nationalId || '',
    });
    setEditingId(emp.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateEmployee(editingId, form);
    } else {
      addEmployee(form);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteEmployee(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Staff</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Active</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <UserCheck className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStaff}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Managers</CardDescription>
              <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Shield className="size-4 text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Attendants</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <UserPlus className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendants}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Add Button ──────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          onClick={handleOpenAdd}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          <UserPlus className="size-4 mr-2" /> Add Employee
        </Button>
      </div>

      {/* ── Employee Cards ──────────────────────────────────────────────── */}
      {employees.length === 0 ? (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="py-12 text-center">
            <Users className="size-12 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-400 text-sm">No employees registered yet</div>
            <Button
              onClick={handleOpenAdd}
              variant="outline"
              className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <UserPlus className="size-4 mr-2" /> Add First Employee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card key={emp.id} className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${roleConfig[emp.role].color}`}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{emp.name}</CardTitle>
                      <Badge className={`${roleConfig[emp.role].color} text-white text-[10px] px-1.5 py-0`}>
                        {roleConfig[emp.role].label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-slate-400 hover:text-amber-400"
                      onClick={() => handleOpenEdit(emp)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-slate-400 hover:text-red-400"
                      onClick={() => setDeleteConfirmId(emp.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {emp.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Phone className="size-3 text-slate-500" />
                    {emp.phone}
                  </div>
                )}
                {emp.salary > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CreditCard className="size-3 text-slate-500" />
                    {formatKsh(emp.salary)}/mo
                  </div>
                )}
                {emp.nationalId && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <IdCard className="size-3 text-slate-500" />
                    {emp.nationalId}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <span className={`size-2 rounded-full ${emp.status === 'active' ? 'bg-green-500' : emp.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-[10px] text-slate-400 capitalize">{emp.status}</span>
                  {emp.hireDate && (
                    <span className="text-[10px] text-slate-500 ml-auto">
                      Hired {emp.hireDate}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add/Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingId ? 'Update employee information' : 'Enter new employee details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-400 text-xs">Name *</Label>
              <Input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as EmployeeRole })}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="attendant">Attendant</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Salary (Ksh)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.salary || ''}
                  onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">National ID</Label>
                <Input
                  placeholder="ID number"
                  value={form.nationalId}
                  onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Hire Date</Label>
              <Input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {editingId ? 'Update' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Remove Employee</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to remove this employee? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
