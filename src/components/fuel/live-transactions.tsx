'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Activity,
  Fuel,
  AlertTriangle,
  Zap,
  Clock,
  TrendingUp,
  Droplets,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';

interface LiveTransaction {
  id: string;
  timestamp: Date;
  pumpNumber: number;
  fuelType: string;
  amount: number;
  litres: number;
}

interface PumpStatus {
  pumpNumber: number;
  status: 'Active' | 'Idle';
  currentAmount: number;
  litresDispensed: number;
  fuelType: string;
}

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LiveTransactions() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const fuelNames = useMemo(() => {
    if (fuelTypes.length > 0) return fuelTypes.map((ft) => ft.name);
    return ['PMS', 'AGO', 'DPK'];
  }, [fuelTypes]);

  const pumps: PumpStatus[] = useMemo(() => {
    const recent = transactions.slice(0, 20);
    const pumpMap: Record<number, LiveTransaction[]> = {};
    for (let i = 1; i <= 4; i++) pumpMap[i] = [];
    recent.forEach((t) => {
      if (pumpMap[t.pumpNumber]) pumpMap[t.pumpNumber].push(t);
    });
    return [1, 2, 3, 4].map((num) => {
      const pumpTxns = pumpMap[num];
      const last = pumpTxns[0];
      const isActive = last && Date.now() - last.timestamp.getTime() < 30000;
      const totalLitres = pumpTxns.reduce((s, t) => s + t.litres, 0);
      return {
        pumpNumber: num,
        status: isActive ? 'Active' as const : 'Idle' as const,
        currentAmount: last?.amount ?? 0,
        litresDispensed: totalLitres,
        fuelType: last?.fuelType ?? fuelNames[(num - 1) % fuelNames.length],
      };
    });
  }, [transactions, fuelNames]);

  // Simulate live transaction generation
  const generateTransaction = useCallback((): LiveTransaction => {
    const pumpNumber = Math.floor(Math.random() * 4) + 1;
    const fuelType = fuelNames[Math.floor(Math.random() * fuelNames.length)];
    const litres = Math.round((Math.random() * 50 + 5) * 10) / 10;
    const pricePerLitre = fuelTypes.find((ft) => ft.name === fuelType)?.price ?? (fuelType === 'PMS' ? 195 : 180);
    const amount = Math.round(litres * pricePerLitre);
    return {
      id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date(),
      pumpNumber,
      fuelType,
      amount,
      litres,
    };
  }, [fuelNames, fuelTypes]);

  // Generate initial transactions
  useEffect(() => {
    const initial: LiveTransaction[] = [];
    const now = Date.now();
    for (let i = 0; i < 15; i++) {
      const txn = generateTransaction();
      txn.timestamp = new Date(now - (i + 1) * (Math.random() * 120000 + 30000));
      initial.push(txn);
    }
    setTransactions(initial); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newTxn = generateTransaction();
      setTransactions((prev) => [newTxn, ...prev].slice(0, 50));

      // Random anomaly detection
      if (newTxn.litres > 45) {
        setAlerts((prev) => [
          `Unusual volume on Pump ${newTxn.pumpNumber}: ${newTxn.litres}L of ${newTxn.fuelType}`,
          ...prev,
        ].slice(0, 10));
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [generateTransaction]);

  // Auto-scroll to top on new transaction
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [transactions.length]);

  // Stats
  const oneHourAgo = useMemo(() => Date.now() - 3600000, []);
  const txnsLastHour = useMemo(
    () => transactions.filter((t) => t.timestamp.getTime() > oneHourAgo),
    [transactions, oneHourAgo]
  );
  const txnsPerHour = txnsLastHour.length;
  const avgTransactionValue = txnsLastHour.length > 0
    ? Math.round(txnsLastHour.reduce((s, t) => s + t.amount, 0) / txnsLastHour.length)
    : 0;
  const totalVolumeToday = useMemo(
    () => Math.round(transactions.reduce((s, t) => s + t.litres, 0) * 10) / 10,
    [transactions]
  );

  return (
    <div className="space-y-6">
      {/* ── Live Indicator & Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="flex size-3 rounded-full bg-green-500 animate-pulse" />
                <span className="absolute inset-0 size-3 rounded-full bg-green-500 animate-ping opacity-75" />
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">Live Feed</div>
                <div className="text-lg font-bold text-green-400">LIVE</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Txns / Hour</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Zap className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{txnsPerHour}</div>
            <div className="text-xs text-slate-400 mt-1">Last 60 minutes</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Avg Value</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(avgTransactionValue)}</div>
            <div className="text-xs text-slate-400 mt-1">Per transaction</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Volume Today</CardDescription>
              <div className="size-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Droplets className="size-4 text-cyan-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolumeToday}L</div>
            <div className="text-xs text-slate-400 mt-1">Total dispensed</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Live Transaction Feed ─────────────────────────────────────── */}
        <Card className="lg:col-span-2 bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-4 text-green-400" />
                  Transaction Feed
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">Real-time pump activity</CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-xs font-medium">LIVE</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={feedRef} className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Fuel className="size-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        Pump {txn.pumpNumber} · {txn.fuelType}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTime(txn.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-400">{formatKsh(txn.amount)}</div>
                    <div className="text-xs text-slate-400">{txn.litres}L</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Right Column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Pump Activity Grid */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base">Pump Activity</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Current pump status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {pumps.map((pump) => (
                  <div
                    key={pump.pumpNumber}
                    className={`rounded-xl p-3 border ${
                      pump.status === 'Active'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-slate-700/30 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-300">Pump {pump.pumpNumber}</span>
                      <Badge
                        className={`text-[10px] px-1.5 py-0 ${
                          pump.status === 'Active'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-slate-600/30 text-slate-400 border-slate-600/50'
                        }`}
                      >
                        {pump.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-400">{pump.fuelType}</div>
                    <div className="text-sm font-semibold mt-1">
                      {pump.status === 'Active' ? formatKsh(pump.currentAmount) : '—'}
                    </div>
                    <div className="text-xs text-slate-400">{pump.litresDispensed}L dispensed</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alert Feed */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4 text-yellow-400" />
                Alerts
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Anomaly detection</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-4">
                  <div className="size-8 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Zap className="size-4 text-green-400" />
                  </div>
                  No anomalies detected
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <AlertTriangle className="size-3.5 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-red-300">{alert}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
