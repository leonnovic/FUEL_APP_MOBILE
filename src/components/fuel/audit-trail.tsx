'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Download,
  Users,
  UserCheck,
  Activity,
  Filter,
  CheckCircle2,
  XCircle,
  Search,
  FileCheck,
  RefreshCw,
  AlertTriangle,
  Lock,
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
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useToast } from '@/hooks/use-toast';
import type { AuditLogSoc2 } from '@/types/fuel';

// ─── Types ────────────────────────────────────────────────────────────────
type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'approve' | 'read' | 'read_denied';
type Severity = 'all' | 'critical' | 'warning' | 'info';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400 border-green-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  login: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  logout: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  export: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  approve: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  read: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  read_denied: 'bg-red-600/20 text-red-500 border-red-600/30',
};

const RESOURCE_TYPES = ['sale', 'delivery', 'invoice', 'client', 'employee', 'expense', 'shift', 'fuelType', 'supplier', 'maintenance', 'station', 'user', 'document', 'settings'];
const ACTION_TYPES: AuditAction[] = ['create', 'update', 'delete', 'login', 'logout', 'export', 'approve', 'read', 'read_denied'];

interface IntegrityResult {
  totalLogs: number;
  validSignatures: number;
  invalidChains: number;
  missingHashes: number;
  integrityRate: number;
  invalidLogIds: string[];
  isFullyValid: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────
export function AuditTrail() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);

  // State
  const [logs, setLogs] = useState<AuditLogSoc2[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [invalidLogIds, setInvalidLogIds] = useState<Set<string>>(new Set());

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // ─── Fetch SOC-2 Logs ──────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (resourceTypeFilter !== 'all') params.set('resourceType', resourceTypeFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo + 'T23:59:59');
      if (userFilter) params.set('userId', userFilter);
      if (currentStation?.id) params.set('stationId', currentStation.id);
      params.set('limit', '200');
      params.set('offset', '0');

      const res = await fetch(`/api/audit-logs/soc2?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setTotalLogs(data.total || 0);
      } else {
        setLogs([]);
        setTotalLogs(0);
      }
    } catch {
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, resourceTypeFilter, severityFilter, dateFrom, dateTo, userFilter, token, currentStation]);

  useEffect(() => {
    void fetchLogs(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchLogs]);

  // ─── Verify Integrity ──────────────────────────────────────────────────
  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/audit-logs/soc2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stationId: currentStation?.id }),
      });

      const data = await res.json();
      if (data.success) {
        setIntegrityResult(data.data);
        setInvalidLogIds(new Set(data.data.invalidLogIds || []));
        toast({
          title: data.data.isFullyValid ? 'Integrity Verified' : 'Integrity Issues Found',
          description: data.data.isFullyValid
            ? `All ${data.data.totalLogs} log entries have valid signatures and hash chains.`
            : `${data.data.invalidChains} broken chain(s), ${data.data.missingHashes} missing signature(s) detected.`,
          variant: data.data.isFullyValid ? 'default' : 'destructive',
        });
      } else {
        toast({ title: 'Verification Failed', description: data.error || 'Unable to verify integrity', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to verify audit log integrity', variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── Export SOC-2 Report ────────────────────────────────────────────────
  const handleExportSOC2 = () => {
    const headers = ['Timestamp', 'User Email', 'User Role', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Station ID', 'Hash Signature'];
    const rows = logs.map((log) => [
      log.timestamp,
      log.userEmail,
      log.userRole,
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.ipAddress,
      log.stationId || '',
      log.logSignature ? log.logSignature.substring(0, 16) + '...' : 'NONE',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soc2-audit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'SOC-2 Report Exported', description: `${logs.length} audit records exported` });
  };

  // ─── Summary Stats ─────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((l) => l.timestamp?.startsWith(todayStr));
  const todayActions = todayLogs.length;
  const uniqueUsersToday = new Set(todayLogs.map((l) => l.userEmail)).size;
  const userCounts: Record<string, number> = {};
  todayLogs.forEach((l) => { userCounts[l.userEmail] = (userCounts[l.userEmail] || 0) + 1; });
  const mostActiveUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const isLogValid = (log: AuditLogSoc2): boolean => {
    return !!log.logSignature && !invalidLogIds.has(log.id);
  };

  const truncateHash = (hash: string | null | undefined): string => {
    if (!hash) return '—';
    return hash.length > 12 ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 4)}` : hash;
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="text-xs text-slate-400 mt-1">Total actions recorded today</div>
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
            <div className="text-2xl font-bold">{uniqueUsersToday}</div>
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
            <div className="text-lg font-bold truncate">{mostActiveUser}</div>
            <div className="text-xs text-slate-400 mt-1">Top contributor today</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Log Integrity</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Lock className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrityResult ? `${integrityResult.integrityRate}%` : '—'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {integrityResult
                ? integrityResult.isFullyValid ? 'All signatures valid' : `${integrityResult.invalidChains} issue(s) found`
                : 'Run verify to check'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Integrity Verification Result ──────────────────────────────── */}
      {integrityResult && !integrityResult.isFullyValid && (
        <Card className="bg-red-900/20 border-red-500/30 text-white">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-300 text-sm">Integrity Verification Failed</div>
                <div className="text-xs text-red-200/70 mt-1">
                  {integrityResult.invalidChains} broken hash chain(s) and {integrityResult.missingHashes} missing signature(s) detected.
                  Total logs: {integrityResult.totalLogs}, Valid: {integrityResult.validSignatures}, Integrity rate: {integrityResult.integrityRate}%.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {integrityResult && integrityResult.isFullyValid && (
        <Card className="bg-green-900/20 border-green-500/30 text-white">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-green-300 text-sm">Integrity Verified</div>
                <div className="text-xs text-green-200/70 mt-1">
                  All {integrityResult.totalLogs} log entries have valid HMAC signatures and unbroken hash chains. SOC-2 compliance confirmed.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="size-4 text-amber-400" />
            Filter SOC-2 Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="all">All Actions</SelectItem>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem key={a} value={a}>{a.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Resource Type</Label>
              <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="all">All Resources</SelectItem>
                  {RESOURCE_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Severity</Label>
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as Severity)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical (Delete, Denied)</SelectItem>
                  <SelectItem value="warning">Warning (Update, Approve)</SelectItem>
                  <SelectItem value="info">Info (Create, Login, Export)</SelectItem>
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
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">User ID / Email</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-500" />
                <Input
                  placeholder="Search by user..."
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{totalLogs} total records · {logs.length} displayed</span>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleVerifyIntegrity}
                size="sm"
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
                disabled={isVerifying}
              >
                {isVerifying ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <FileCheck className="size-3.5 mr-1.5" />}
                Verify Integrity
              </Button>
              <Button onClick={handleExportSOC2} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                <Download className="size-3.5 mr-1.5" />
                Export SOC-2 Report
              </Button>
              <Button onClick={fetchLogs} size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                <RefreshCw className="size-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Audit Table ─────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4 text-amber-400" />
                SOC-2 Compliant Audit Log
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Immutable, hash-chained, HMAC-signed activity trail</CardDescription>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <Lock className="size-3 mr-1" /> SOC-2
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-6 text-amber-400 animate-spin" />
              <span className="ml-2 text-slate-400 text-sm">Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-12">
              <Shield className="size-12 text-slate-600 mx-auto mb-3" />
              <div className="font-medium text-slate-400">No SOC-2 audit records found</div>
              <div className="text-xs text-slate-500 mt-1">Audit entries are created automatically when users perform actions in the system.</div>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs whitespace-nowrap">Timestamp</TableHead>
                    <TableHead className="text-slate-400 text-xs whitespace-nowrap">User</TableHead>
                    <TableHead className="text-slate-400 text-xs whitespace-nowrap">Action</TableHead>
                    <TableHead className="text-slate-400 text-xs whitespace-nowrap">Resource Type</TableHead>
                    <TableHead className="text-slate-400 text-xs whitespace-nowrap">Resource ID</TableHead>
                    <TableHead className="text-slate-400 text-xs whitespace-nowrap">IP Address</TableHead>
                    <TableHead className="text-slate-400 text-xs whitespace-nowrap">Station</TableHead>
                    <TableHead className="text-slate-400 text-xs whitespace-nowrap">Hash Signature</TableHead>
                    <TableHead className="text-slate-400 text-xs w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const valid = isLogValid(log);
                    return (
                      <TableRow key={log.id} className={`border-slate-700/50 ${!valid ? 'bg-red-900/10' : ''}`}>
                        <TableCell className="text-slate-300 text-xs whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('en-KE', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                          }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="text-white font-medium">{log.userEmail || '—'}</div>
                          <div className="text-slate-500 text-[10px]">{log.userRole || ''}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${ACTION_COLORS[log.action] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'} text-[10px] px-1.5 py-0 border`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-xs">{log.resourceType || '—'}</TableCell>
                        <TableCell className="text-slate-400 text-xs font-mono max-w-[100px] truncate">{log.resourceId ? truncateHash(log.resourceId) : '—'}</TableCell>
                        <TableCell className="text-slate-400 text-xs font-mono">{log.ipAddress || '—'}</TableCell>
                        <TableCell className="text-slate-400 text-xs font-mono">{log.stationId ? truncateHash(log.stationId) : '—'}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.logSignature ? (
                            <span className="text-slate-300">{truncateHash(log.logSignature)}</span>
                          ) : (
                            <span className="text-slate-600">NONE</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {valid ? (
                            <CheckCircle2 className="size-4 text-green-400" />
                          ) : (
                            <XCircle className="size-4 text-red-400" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
