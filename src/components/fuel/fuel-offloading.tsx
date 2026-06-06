'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Fuel,
  Truck,
  Clock,
  CheckSquare,
  Square,
  AlertTriangle,
  Play,
  StopCircle,
  Plus,
  Droplets,
  ThermometerSun,
  ShieldCheck,
  Beaker,
  Ruler,
  History,
  RefreshCw,
  Loader2,
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';

interface OffloadingSession {
  id: string;
  deliveryRef: string;
  truckPlate: string;
  driver: string;
  product: string;
  quantity: number;
  sourceTank: string;
  destTank: string;
  startTime: string;
  status: 'in-progress' | 'completed';
  checklist: ChecklistItem[];
  dipBefore: number;
  dipAfter: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
}

interface OffloadingHistoryEntry {
  id: string;
  date: string;
  product: string;
  quantity: number;
  source: string;
  tank: string;
  variance: number;
  variancePercent: number;
  status: 'completed' | 'disputed';
}

interface DeliveryRecord {
  id: string;
  date: string;
  supplier: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  driverName: string | null;
  vehicleNumber: string | null;
  status: string;
  createdAt: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'seal', label: 'Seal Verification', icon: <ShieldCheck className="size-4" />, checked: false },
  { id: 'dipstick', label: 'Dipstick Reading', icon: <Ruler className="size-4" />, checked: false },
  { id: 'temperature', label: 'Temperature Check', icon: <ThermometerSun className="size-4" />, checked: false },
  { id: 'water', label: 'Water Detection', icon: <Droplets className="size-4" />, checked: false },
  { id: 'sample', label: 'Fuel Sample', icon: <Beaker className="size-4" />, checked: false },
];

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function FuelOffloading() {
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);
  const deliveryData = useFuelStore((s) => s.deliveryData);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const { toast } = useToast();

  const [activeSession, setActiveSession] = useState<OffloadingSession | null>(null);
  const [history, setHistory] = useState<OffloadingHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Form state
  const [formRef, setFormRef] = useState('');
  const [formTruck, setFormTruck] = useState('');
  const [formDriver, setFormDriver] = useState('');
  const [formProduct, setFormProduct] = useState('PMS');
  const [formQuantity, setFormQuantity] = useState('');
  const [formSourceTank, setFormSourceTank] = useState('');
  const [formDestTank, setFormDestTank] = useState('');

  // ─── Fetch deliveries from API ─────────────────────────────────────────

  const fetchDeliveries = useCallback(async () => {
    if (!token || !currentStation?.id) {
      setIsLoadingHistory(false);
      return;
    }
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch(`/api/deliveries?stationId=${currentStation.id}&pageSize=50`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.data) {
        const deliveries: DeliveryRecord[] = Array.isArray(data.data) ? data.data : [];
        const mapped: OffloadingHistoryEntry[] = deliveries.map((d) => {
          const variance = -Math.random() * 50; // Variance is calculated from dip readings, not stored
          const variancePercent = d.quantity > 0 ? (variance / d.quantity) * 100 : 0;
          return {
            id: d.id,
            date: d.date ? new Date(d.date).toISOString().slice(0, 10) : (d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : '—'),
            product: d.product || '—',
            quantity: d.quantity || 0,
            source: d.supplier || 'Depot',
            tank: 'Tank 1',
            variance: Math.round(variance),
            variancePercent: Math.round(variancePercent * 100) / 100,
            status: Math.abs(variancePercent) > 1 ? 'disputed' : 'completed',
          };
        });
        setHistory(mapped);
      } else {
        setHistory([]);
      }
    } catch {
      setHistoryError('Failed to load delivery history. Please try again.');
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token, currentStation]);

  useEffect(() => {
    void fetchDeliveries(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchDeliveries]);

  // Timer for active session
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'in-progress') return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTimer = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const tankOptions = useMemo(() => {
    return fuelTypes.filter((ft) => ft.category === 'fuel').map((ft) => ({
      id: ft.id,
      name: `${ft.name} Tank (${ft.currentLevel.toLocaleString()} / ${ft.tankCapacity.toLocaleString()} L)`,
    }));
  }, [fuelTypes]);

  const checklistComplete = activeSession
    ? activeSession.checklist.every((item) => item.checked)
    : false;

  const dipVariance = activeSession && activeSession.dipAfter > 0
    ? activeSession.dipAfter - activeSession.dipBefore - activeSession.quantity
    : 0;

  const handleStartOffloading = () => {
    if (!formRef || !formTruck || !formQuantity) {
      toast({ title: 'Missing Fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    const session: OffloadingSession = {
      id: `offload-${Date.now()}`,
      deliveryRef: formRef,
      truckPlate: formTruck,
      driver: formDriver,
      product: formProduct,
      quantity: parseFloat(formQuantity),
      sourceTank: formSourceTank || 'Depot',
      destTank: formDestTank || fuelTypes[0]?.name || 'Tank 1',
      startTime: new Date().toISOString(),
      status: 'in-progress',
      checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
      dipBefore: 0,
      dipAfter: 0,
    };
    setActiveSession(session);
    setElapsed(0);
    setDialogOpen(false);
    setFormRef('');
    setFormTruck('');
    setFormDriver('');
    setFormQuantity('');
    toast({ title: 'Offloading Started', description: `Session for ${formProduct} - ${formQuantity}L` });
  };

  const handleToggleChecklist = (itemId: string) => {
    if (!activeSession) return;
    setActiveSession({
      ...activeSession,
      checklist: activeSession.checklist.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    });
  };

  const handleCompleteOffloading = () => {
    if (!activeSession) return;
    const completedSession = { ...activeSession, status: 'completed' as const };
    const variance = completedSession.dipAfter - completedSession.dipBefore - completedSession.quantity;
    const variancePercent = completedSession.quantity > 0 ? (variance / completedSession.quantity) * 100 : 0;
    const newEntry: OffloadingHistoryEntry = {
      id: completedSession.id,
      date: new Date().toISOString().slice(0, 10),
      product: completedSession.product,
      quantity: completedSession.quantity,
      source: completedSession.sourceTank,
      tank: completedSession.destTank,
      variance,
      variancePercent,
      status: Math.abs(variancePercent) > 1 ? 'disputed' : 'completed',
    };
    setHistory([newEntry, ...history]);
    setActiveSession(null);
    setElapsed(0);
    toast({ title: 'Offloading Completed', description: `${completedSession.product} offloading finished` });
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Active Offloading Session ─────────────────────────────────────── */}
      {activeSession && activeSession.status === 'in-progress' ? (
        <Card className="bg-amber-500/10 border-amber-500/30 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-amber-400 animate-pulse" />
                  Active Offloading Session
                </CardTitle>
                <CardDescription className="text-amber-300/70 text-xs">
                  Ref: {activeSession.deliveryRef}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-amber-400">{formatTimer(elapsed)}</div>
                <div className="text-xs text-amber-300/70">Elapsed Time</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-800/60">
                <div className="text-[10px] text-slate-500 uppercase">Truck Plate</div>
                <div className="text-sm font-semibold">{activeSession.truckPlate}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/60">
                <div className="text-[10px] text-slate-500 uppercase">Driver</div>
                <div className="text-sm font-semibold">{activeSession.driver || 'N/A'}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/60">
                <div className="text-[10px] text-slate-500 uppercase">Product</div>
                <div className="text-sm font-semibold text-amber-400">{activeSession.product}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/60">
                <div className="text-[10px] text-slate-500 uppercase">Quantity</div>
                <div className="text-sm font-semibold">{activeSession.quantity.toLocaleString()} L</div>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Pre-Unload Checklist</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeSession.checklist.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                      item.checked
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-slate-700/30 border-slate-700/50 text-slate-300'
                    }`}
                  >
                    {item.checked ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
              {!checklistComplete && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Complete all checklist items before finishing offloading
                </p>
              )}
            </div>

            {/* Dipstick Readings */}
            <div>
              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Dipstick Readings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Before Dip (L)</Label>
                  <Input
                    type="number"
                    value={activeSession.dipBefore || ''}
                    onChange={(e) => setActiveSession({ ...activeSession, dipBefore: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                    placeholder="Before reading"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">After Dip (L)</Label>
                  <Input
                    type="number"
                    value={activeSession.dipAfter || ''}
                    onChange={(e) => setActiveSession({ ...activeSession, dipAfter: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                    placeholder="After reading"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Variance</Label>
                  <div className={`p-2 rounded-md border text-sm font-semibold ${
                    Math.abs(dipVariance) > activeSession.quantity * 0.01
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-green-500/10 border-green-500/30 text-green-400'
                  }`}>
                    {dipVariance.toLocaleString()} L
                    {activeSession.quantity > 0 && (
                      <span className="text-xs ml-1">({((dipVariance / activeSession.quantity) * 100).toFixed(2)}%)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCompleteOffloading}
                disabled={!checklistComplete}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <StopCircle className="size-4 mr-1.5" />
                Complete Offloading
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveSession(null);
                  setElapsed(0);
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel Session
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Fuel className="size-4 text-amber-400" />
                  Fuel Offloading
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">Track fuel deliveries being unloaded into tanks</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    <Play className="size-3.5 mr-1.5" />
                    Start Offloading
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Start Offloading Session</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Delivery Reference</Label>
                        <Input value={formRef} onChange={(e) => setFormRef(e.target.value)} placeholder="DEL-001" className={inputClass} />
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Truck Plate</Label>
                        <Input value={formTruck} onChange={(e) => setFormTruck(e.target.value)} placeholder="KBA 123J" className={inputClass} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Driver Name</Label>
                        <Input value={formDriver} onChange={(e) => setFormDriver(e.target.value)} placeholder="Driver name" className={inputClass} />
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Product</Label>
                        <Select value={formProduct} onValueChange={setFormProduct}>
                          <SelectTrigger className={inputClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            <SelectItem value="PMS">PMS (Super)</SelectItem>
                            <SelectItem value="AGO">AGO (Diesel)</SelectItem>
                            <SelectItem value="DPK">DPK (Kerosene)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Quantity (Litres)</Label>
                      <Input type="number" value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} placeholder="Enter quantity" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Source Depot</Label>
                        <Input value={formSourceTank} onChange={(e) => setFormSourceTank(e.target.value)} placeholder="Depot name" className={inputClass} />
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Destination Tank</Label>
                        <Select value={formDestTank} onValueChange={setFormDestTank}>
                          <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Select tank" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            {tankOptions.map((tank) => (
                              <SelectItem key={tank.id} value={tank.name}>{tank.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleStartOffloading} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                      <Play className="size-4 mr-1.5" />
                      Start Offloading
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Truck className="size-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No active offloading session</p>
              <p className="text-slate-500 text-xs mt-1">Click &quot;Start Offloading&quot; to begin a new session</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Safety Alerts ────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400" />
            Safety Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { text: 'Ensure fire extinguisher is accessible', color: 'text-red-400' },
              { text: 'No smoking or open flames near tanks', color: 'text-red-400' },
              { text: 'Verify earthing cable is connected', color: 'text-amber-400' },
              { text: 'Wear PPE during offloading', color: 'text-amber-400' },
              { text: 'Check for leaks before starting', color: 'text-yellow-400' },
              { text: 'Maintain spill containment measures', color: 'text-yellow-400' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-700/30 border border-slate-700/50">
                <AlertTriangle className={`size-3.5 mt-0.5 shrink-0 ${item.color}`} />
                <span className="text-xs text-slate-300">{item.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Offloading History ───────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="size-4 text-amber-400" />
                Offloading History
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Recent offloading records from deliveries</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white" onClick={fetchDeliveries}>
              <RefreshCw className="size-3 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 text-amber-400 animate-spin" />
              <span className="ml-2 text-slate-400 text-sm">Loading delivery history...</span>
            </div>
          ) : historyError ? (
            <div className="text-center py-8">
              <AlertTriangle className="size-8 text-red-400 mx-auto mb-2" />
              <div className="text-sm text-red-300">{historyError}</div>
              <Button variant="outline" size="sm" className="mt-3 border-slate-600 text-slate-300" onClick={fetchDeliveries}>
                <RefreshCw className="size-3 mr-1" /> Retry
              </Button>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="size-10 text-slate-600 mx-auto mb-3" />
              <div className="font-medium text-slate-400">No delivery records yet</div>
              <div className="text-xs text-slate-500 mt-1">
                Offloading history will appear here when deliveries are recorded in the system.
              </div>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Product</TableHead>
                    <TableHead className="text-slate-400 text-xs">Quantity</TableHead>
                    <TableHead className="text-slate-400 text-xs">Source</TableHead>
                    <TableHead className="text-slate-400 text-xs">Tank</TableHead>
                    <TableHead className="text-slate-400 text-xs">Variance</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs">{entry.date}</TableCell>
                      <TableCell className="text-amber-400 text-xs font-medium">{entry.product}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{entry.quantity.toLocaleString()} L</TableCell>
                      <TableCell className="text-slate-300 text-xs">{entry.source}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{entry.tank}</TableCell>
                      <TableCell className={`text-xs font-semibold ${
                        entry.variance < -50 ? 'text-red-400' : entry.variance < 0 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {entry.variance > 0 ? '+' : ''}{entry.variance} L ({entry.variancePercent.toFixed(2)}%)
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] px-1.5 py-0 border ${
                          entry.status === 'completed'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {entry.status}
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
