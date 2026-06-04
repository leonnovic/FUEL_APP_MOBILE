'use client';

import { useState, useMemo } from 'react';
import {
  Database,
  Download,
  Upload,
  HardDrive,
  Trash2,
  RotateCcw,
  Archive,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  Save,
  Clock,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';

interface EntityCount {
  name: string;
  count: number;
  key: string;
  icon: typeof Database;
  color: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DataManager() {
  const store = useFuelStore();
  const resetStore = useFuelStore((s) => s.resetStore);
  const { toast } = useToast();

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Entity counts
  const entities: EntityCount[] = useMemo(() => [
    { name: 'Sales', count: Object.keys(store.salesHistory).length, key: 'sales', icon: Database, color: 'text-green-400' },
    { name: 'Deliveries', count: Object.keys(store.deliveryData).length, key: 'deliveries', icon: Database, color: 'text-blue-400' },
    { name: 'Clients', count: Object.keys(store.clients).length, key: 'clients', icon: Database, color: 'text-amber-400' },
    { name: 'Invoices', count: Object.keys(store.invoices).length, key: 'invoices', icon: Database, color: 'text-purple-400' },
    { name: 'Employees', count: store.employees.length, key: 'employees', icon: Database, color: 'text-cyan-400' },
    { name: 'Expenses', count: store.expenses.length, key: 'expenses', icon: Database, color: 'text-red-400' },
    { name: 'Shifts', count: store.shifts.length, key: 'shifts', icon: Database, color: 'text-orange-400' },
    { name: 'Fuel Types', count: store.fuelTypes.length, key: 'fuelTypes', icon: Database, color: 'text-yellow-400' },
    { name: 'Suppliers', count: store.suppliers.length, key: 'suppliers', icon: Database, color: 'text-pink-400' },
    { name: 'Maintenance', count: store.maintenance.length, key: 'maintenance', icon: Database, color: 'text-teal-400' },
  ], [store.salesHistory, store.deliveryData, store.clients, store.invoices, store.employees, store.expenses, store.shifts, store.fuelTypes, store.suppliers, store.maintenance]);

  const totalRecords = entities.reduce((s, e) => s + e.count, 0);

  // Estimate localStorage usage
  const storageEstimate = useMemo(() => {
    try {
      const data = localStorage.getItem('fuelpro-data');
      return data ? formatBytes(new Blob([data]).size) : '0 Bytes';
    } catch {
      return 'Unknown';
    }
  }, []);

  const lastBackupDate = useMemo(() => {
    try {
      const date = localStorage.getItem('fuelpro-last-backup');
      return date ? new Date(date).toLocaleString('en-KE') : 'Never';
    } catch {
      return 'Unknown';
    }
  }, []);

  // Export functions
  const exportEntityCSV = (entityKey: string) => {
    let data: Record<string, unknown>[] = [];
    let filename = `${entityKey}-export.csv`;

    switch (entityKey) {
      case 'sales':
        data = Object.values(store.salesHistory);
        break;
      case 'deliveries':
        data = Object.values(store.deliveryData);
        break;
      case 'clients':
        data = Object.values(store.clients);
        break;
      case 'invoices':
        data = Object.values(store.invoices);
        break;
      case 'employees':
        data = store.employees as unknown as Record<string, unknown>[];
        break;
      case 'expenses':
        data = store.expenses as unknown as Record<string, unknown>[];
        break;
      case 'shifts':
        data = store.shifts as unknown as Record<string, unknown>[];
        break;
      case 'fuelTypes':
        data = store.fuelTypes as unknown as Record<string, unknown>[];
        break;
      case 'suppliers':
        data = store.suppliers as unknown as Record<string, unknown>[];
        break;
      case 'maintenance':
        data = store.maintenance as unknown as Record<string, unknown>[];
        break;
    }

    if (data.length === 0) {
      toast({ title: 'No Data', description: `No ${entityKey} records to export` });
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const val = row[h];
          if (typeof val === 'object' && val !== null) return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return String(val ?? '');
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${data.length} ${entityKey} records exported as CSV` });
  };

  const exportEntityJSON = (entityKey: string) => {
    let data: unknown = {};
    let filename = `${entityKey}-export.json`;

    switch (entityKey) {
      case 'sales':
        data = store.salesHistory;
        break;
      case 'deliveries':
        data = store.deliveryData;
        break;
      case 'clients':
        data = store.clients;
        break;
      case 'invoices':
        data = store.invoices;
        break;
      case 'employees':
        data = store.employees;
        break;
      case 'expenses':
        data = store.expenses;
        break;
      case 'shifts':
        data = store.shifts;
        break;
      case 'fuelTypes':
        data = store.fuelTypes;
        break;
      case 'suppliers':
        data = store.suppliers;
        break;
      case 'maintenance':
        data = store.maintenance;
        break;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `${entityKey} data exported as JSON` });
  };

  // Full backup
  const createBackup = () => {
    const allData = {
      exportDate: new Date().toISOString(),
      stationId: store.stationId,
      salesHistory: store.salesHistory,
      deliveryData: store.deliveryData,
      clients: store.clients,
      invoices: store.invoices,
      employees: store.employees,
      expenses: store.expenses,
      shifts: store.shifts,
      fuelTypes: store.fuelTypes,
      suppliers: store.suppliers,
      maintenance: store.maintenance,
      pmsPrice: store.pmsPrice,
      agoPrice: store.agoPrice,
      companyData: store.companyData,
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuelpro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    try {
      localStorage.setItem('fuelpro-last-backup', new Date().toISOString());
    } catch { /* ignore */ }

    toast({ title: 'Backup Created', description: 'Full backup downloaded successfully' });
  };

  // Restore from backup
  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          // Restore to localStorage directly - store will pick it up on next load
          localStorage.setItem('fuelpro-data', JSON.stringify({
            state: {
              stationId: data.stationId ?? '',
              salesHistory: data.salesHistory ?? {},
              deliveryData: data.deliveryData ?? {},
              clients: data.clients ?? {},
              invoices: data.invoices ?? {},
              employees: data.employees ?? [],
              expenses: data.expenses ?? [],
              shifts: data.shifts ?? [],
              fuelTypes: data.fuelTypes ?? [],
              suppliers: data.suppliers ?? [],
              maintenance: data.maintenance ?? [],
              pmsPrice: data.pmsPrice ?? 0,
              agoPrice: data.agoPrice ?? 0,
              companyData: data.companyData ?? {},
              theme: 'dark',
            },
            version: 0,
          }));
          toast({ title: 'Backup Restored', description: 'Please refresh the page to load restored data' });
        } catch {
          toast({ title: 'Restore Failed', description: 'Invalid backup file format', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Import CSV (simulated)
  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = () => {
      toast({ title: 'Import Started', description: 'Processing CSV file... (simulated)' });
    };
    input.click();
  };

  // Clear test data
  const handleClearTestData = () => {
    setConfirmClear(false);
    resetStore();
    toast({ title: 'Data Cleared', description: 'All data has been removed from the system' });
  };

  // Reset to defaults
  const handleReset = () => {
    setConfirmReset(false);
    resetStore();
    try {
      localStorage.removeItem('fuelpro-data');
    } catch { /* ignore */ }
    toast({ title: 'System Reset', description: 'All data and settings have been reset to defaults' });
  };

  return (
    <div className="space-y-6">
      {/* ── Data Overview ──────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="size-4 text-amber-400" />
                Data Overview
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">{totalRecords} total records across {entities.length} entities</CardDescription>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              {storageEstimate} used
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {entities.map((entity) => (
              <div
                key={entity.key}
                className="p-3 rounded-lg bg-slate-700/30 border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
              >
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{entity.name}</div>
                <div className={`text-xl font-bold ${entity.color}`}>{entity.count}</div>
                <div className="text-[10px] text-slate-500">records</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Export Options ──────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4 text-amber-400" />
            Export Data
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Download data as CSV or JSON</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Entity</TableHead>
                  <TableHead className="text-slate-400 text-xs">Records</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((entity) => (
                  <TableRow key={entity.key} className="border-slate-700/50">
                    <TableCell className="text-sm font-medium">{entity.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-slate-700/50 text-slate-300 text-[10px] px-1.5 py-0">
                        {entity.count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={() => exportEntityCSV(entity.key)}
                          disabled={entity.count === 0}
                        >
                          <FileSpreadsheet className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          onClick={() => exportEntityJSON(entity.key)}
                          disabled={entity.count === 0}
                        >
                          <FileJson className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Import & Backup ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Import Section */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="size-4 text-amber-400" />
                Import Data
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Upload CSV files to import</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors"
                onClick={handleImportCSV}
              >
                <Upload className="size-8 text-slate-500 mx-auto mb-3" />
                <div className="text-sm text-slate-300 mb-1">Click to upload CSV</div>
                <div className="text-xs text-slate-500">Supports CSV file format</div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Info */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="size-4 text-amber-400" />
                Storage Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">localStorage Usage</span>
                <span className="text-sm font-medium">{storageEstimate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400 flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Last Backup
                </span>
                <span className="text-sm font-medium">{lastBackupDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Records</span>
                <span className="text-sm font-medium">{totalRecords}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Backup & Restore ────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Save className="size-4 text-amber-400" />
                Backup & Restore
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Full system backup and recovery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={createBackup}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Download className="size-4 mr-2" />
                Create Full Backup
              </Button>
              <Button
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                onClick={handleRestore}
              >
                <Upload className="size-4 mr-2" />
                Restore from Backup
              </Button>
            </CardContent>
          </Card>

          {/* Data Cleanup */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-400">
                <AlertTriangle className="size-4" />
                Data Cleanup
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Destructive operations — proceed with caution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/30"
                onClick={() => handleImportCSV()} // Simulated archive
              >
                <Archive className="size-4 mr-2" />
                Archive Old Records
              </Button>

              <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-500/30"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Clear All Data
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="size-5" />
                      Confirm Data Clear
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-300">
                    This will permanently delete all data from the system. This action cannot be undone.
                    Consider creating a backup first.
                  </p>
                  <DialogFooter className="gap-2 mt-4">
                    <DialogClose asChild>
                      <Button variant="ghost" className="text-slate-400">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleClearTestData}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Clear All Data
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                  >
                    <RotateCcw className="size-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="size-5" />
                      Confirm Factory Reset
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-300">
                    This will reset all data, settings, and configurations to their factory defaults.
                    This is irreversible. Make sure you have a backup.
                  </p>
                  <DialogFooter className="gap-2 mt-4">
                    <DialogClose asChild>
                      <Button variant="ghost" className="text-slate-400">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={handleReset}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Factory Reset
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
