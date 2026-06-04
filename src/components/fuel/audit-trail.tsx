'use client';

import { useState, useMemo } from 'react';
import {
  Shield,
  Download,
  Users,
  UserCheck,
  Activity,
  Filter,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'export';

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  entityType: string;
  details: string;
}

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-500/20 text-green-400 border-green-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  login: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  export: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const ENTITY_TYPES = ['Sale', 'Delivery', 'Client', 'Invoice', 'Employee', 'Expense', 'Shift', 'FuelType', 'Supplier', 'Maintenance'];
const ACTION_TYPES: AuditAction[] = ['create', 'update', 'delete', 'login', 'export'];
const MOCK_USERS = ['Admin', 'John M.', 'Sarah K.', 'Peter O.', 'Grace N.'];

function generateMockAuditData(
  salesCount: number,
  deliveryCount: number,
  clientCount: number,
  employeeCount: number,
  expenseCount: number
): AuditEntry[] {
  const entries: AuditEntry[] = [];
  let idCounter = 1;
  const now = Date.now();

  const addEntries = (entityType: string, count: number, actions: AuditAction[]) => {
    for (let i = 0; i < count; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const hoursAgo = Math.random() * 168; // up to 7 days
      const timestamp = new Date(now - hoursAgo * 3600000).toISOString();
      const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
      let details = '';
      switch (action) {
        case 'create': details = `Created new ${entityType.toLowerCase()} record`; break;
        case 'update': details = `Updated ${entityType.toLowerCase()} details`; break;
        case 'delete': details = `Deleted ${entityType.toLowerCase()} record`; break;
        case 'login': details = `User logged in`; break;
        case 'export': details = `Exported ${entityType.toLowerCase()} data`; break;
      }
      entries.push({ id: `audit-${idCounter++}`, timestamp, user, action, entityType, details });
    }
  };

  addEntries('Sale', Math.min(salesCount, 15), ['create', 'update']);
  addEntries('Delivery', Math.min(deliveryCount, 10), ['create', 'update']);
  addEntries('Client', Math.min(clientCount, 8), ['create', 'update', 'delete']);
  addEntries('Employee', Math.min(employeeCount, 6), ['create', 'update']);
  addEntries('Expense', Math.min(expenseCount, 10), ['create', 'delete']);
  addEntries('System', 5, ['login']);
  addEntries('Report', 3, ['export']);

  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function AuditTrail() {
  const sales = useFuelStore((s) => s.salesHistory);
  const deliveries = useFuelStore((s) => s.deliveryData);
  const clients = useFuelStore((s) => s.clients);
  const employees = useFuelStore((s) => s.employees);
  const expenses = useFuelStore((s) => s.expenses);
  const { toast } = useToast();

  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const auditData = useMemo(
    () => generateMockAuditData(
      Object.keys(sales).length,
      Object.keys(deliveries).length,
      Object.keys(clients).length,
      employees.length,
      expenses.length
    ),
    [sales, deliveries, clients, employees, expenses]
  );

  const filteredData = useMemo(() => {
    return auditData.filter((entry) => {
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
      if (entityFilter !== 'all' && entry.entityType !== entityFilter) return false;
      if (dateFrom && entry.timestamp < dateFrom) return false;
      if (dateTo && entry.timestamp > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [auditData, actionFilter, entityFilter, dateFrom, dateTo]);

  // Summary stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayActions = auditData.filter((e) => e.timestamp.startsWith(todayStr)).length;
  const uniqueUsers = new Set(auditData.filter((e) => e.timestamp.startsWith(todayStr)).map((e) => e.user)).size;
  const userCounts: Record<string, number> = {};
  auditData.filter((e) => e.timestamp.startsWith(todayStr)).forEach((e) => {
    userCounts[e.user] = (userCounts[e.user] || 0) + 1;
  });
  const mostActiveUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity', 'Details'].join(','),
      ...filteredData.map((e) =>
        [e.timestamp, e.user, e.action, e.entityType, `"${e.details}"`].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${filteredData.length} audit records exported` });
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Actions Today</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Activity className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayActions}</div>
            <div className="text-xs text-slate-400 mt-1">Total actions recorded</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Unique Users</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
            <div className="text-xs text-slate-400 mt-1">Active today</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Most Active</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <UserCheck className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostActiveUser}</div>
            <div className="text-xs text-slate-400 mt-1">Top contributor today</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="size-4 text-amber-400" />
            Filter Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="all">All Actions</SelectItem>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Entity Type</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="all">All Entities</SelectItem>
                  {ENTITY_TYPES.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">{filteredData.length} records found</span>
            <Button onClick={handleExport} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <Download className="size-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Audit Table ─────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-amber-400" />
            Audit Log
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Complete activity trail</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No audit records match the current filters</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Timestamp</TableHead>
                    <TableHead className="text-slate-400 text-xs">User</TableHead>
                    <TableHead className="text-slate-400 text-xs">Action</TableHead>
                    <TableHead className="text-slate-400 text-xs">Entity</TableHead>
                    <TableHead className="text-slate-400 text-xs">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((entry) => (
                    <TableRow key={entry.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString('en-KE', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-slate-300 text-xs">{entry.user}</TableCell>
                      <TableCell>
                        <Badge className={`${ACTION_COLORS[entry.action]} text-[10px] px-1.5 py-0 border`}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-xs">{entry.entityType}</TableCell>
                      <TableCell className="text-slate-400 text-xs max-w-[200px] truncate">{entry.details}</TableCell>
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
