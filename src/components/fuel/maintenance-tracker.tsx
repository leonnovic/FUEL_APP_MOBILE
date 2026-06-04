'use client';

import { useState, useMemo } from 'react';
import {
  Wrench,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  User,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';
import type { MaintenancePriority, MaintenanceStatus } from '@/types/fuel';

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const priorityConfig: Record<MaintenancePriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500' },
  medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500' },
};

const statusConfig: Record<MaintenanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-500', icon: <Calendar className="size-3" /> },
  'in-progress': { label: 'In Progress', color: 'bg-amber-500', icon: <Clock className="size-3" /> },
  completed: { label: 'Completed', color: 'bg-green-500', icon: <CheckCircle className="size-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500', icon: <AlertCircle className="size-3" /> },
};

const nextStatusMap: Record<string, MaintenanceStatus> = {
  scheduled: 'in-progress',
  'in-progress': 'completed',
};

export function MaintenanceTracker() {
  const maintenance = useFuelStore((s) => s.maintenance);
  const addMaintenance = useFuelStore((s) => s.addMaintenance);
  const updateMaintenance = useFuelStore((s) => s.updateMaintenance);
  const deleteMaintenance = useFuelStore((s) => s.deleteMaintenance);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // Form state
  const [equipment, setEquipment] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [status, setStatus] = useState<MaintenanceStatus>('scheduled');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignedTo, setAssignedTo] = useState('');
  const [cost, setCost] = useState(0);

  const sorted = useMemo(
    () => [...maintenance].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [maintenance]
  );

  // Summary cards
  const scheduled = useMemo(() => maintenance.filter((m) => m.status === 'scheduled').length, [maintenance]);
  const inProgress = useMemo(() => maintenance.filter((m) => m.status === 'in-progress').length, [maintenance]);
  const completed = useMemo(() => maintenance.filter((m) => m.status === 'completed').length, [maintenance]);
  const totalCost = useMemo(() => maintenance.reduce((sum, m) => sum + m.cost, 0), [maintenance]);

  const handleAdd = () => {
    if (!equipment.trim()) return;
    addMaintenance({
      equipment: equipment.trim(),
      description: description || undefined,
      priority,
      status,
      scheduledDate,
      assignedTo: assignedTo || undefined,
      cost,
    });
    setEquipment('');
    setDescription('');
    setPriority('medium');
    setStatus('scheduled');
    setScheduledDate(new Date().toISOString().slice(0, 10));
    setAssignedTo('');
    setCost(0);
  };

  const handleAdvanceStatus = (id: string, currentStatus: MaintenanceStatus) => {
    const next = nextStatusMap[currentStatus];
    if (next) {
      const updates: Partial<{ status: MaintenanceStatus; completedDate?: string }> = { status: next };
      if (next === 'completed') {
        updates.completedDate = new Date().toISOString().slice(0, 10);
      }
      updateMaintenance(id, updates);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Scheduled</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduled}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">In Progress</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Completed</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Cost</CardDescription>
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <DollarSign className="size-4 text-red-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Add Maintenance Form ─────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base">Add Maintenance</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Schedule or record maintenance work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">Equipment *</Label>
              <Input
                placeholder="e.g. Pump #1, Generator"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Description</Label>
              <Input
                placeholder="What needs fixing?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as MaintenancePriority)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MaintenanceStatus)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Scheduled Date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Assigned To</Label>
              <Input
                placeholder="Technician name"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Cost (Ksh)</Label>
              <Input
                type="number"
                placeholder="0"
                value={cost || ''}
                onChange={(e) => setCost(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            <Plus className="size-4 mr-2" /> Add Maintenance
          </Button>
        </CardContent>
      </Card>

      {/* ── Maintenance List ─────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base">Maintenance Records</CardTitle>
          <CardDescription className="text-slate-400 text-xs">All scheduled and completed maintenance</CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No maintenance records yet</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Equipment</TableHead>
                    <TableHead className="text-slate-400 text-xs">Priority</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs">Assigned</TableHead>
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Cost</TableHead>
                    <TableHead className="text-slate-400 text-xs w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((m) => (
                    <TableRow key={m.id} className="border-slate-700/50">
                      <TableCell>
                        <div className="text-white text-xs font-medium">{m.equipment}</div>
                        {m.description && <div className="text-[10px] text-slate-500">{m.description}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${priorityConfig[m.priority].bgColor} text-white text-[10px] px-1.5 py-0`}>
                          {priorityConfig[m.priority].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig[m.status].color} text-white text-[10px] px-1.5 py-0`}>
                          {statusConfig[m.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-xs">
                        {m.assignedTo ? (
                          <span className="flex items-center gap-1"><User className="size-3 text-slate-500" />{m.assignedTo}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-xs">{m.scheduledDate || '—'}</TableCell>
                      <TableCell className="text-red-300 text-xs font-semibold text-right">{formatKsh(m.cost)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {nextStatusMap[m.status] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700/50"
                              onClick={() => handleAdvanceStatus(m.id, m.status)}
                            >
                              <ArrowRight className="size-3 mr-1" />
                              {statusConfig[nextStatusMap[m.status]].label}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-slate-500 hover:text-red-400"
                            onClick={() => deleteMaintenance(m.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
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
