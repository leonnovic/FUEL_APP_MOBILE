'use client';

import { useState, useMemo } from 'react';
import {
  Clock,
  User,
  Play,
  Square,
  CheckCircle,
  AlertTriangle,
  Droplets,
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
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';
import type { ShiftStatus } from '@/types/fuel';

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const statusConfig: Record<ShiftStatus, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-green-500', icon: <Play className="size-3" /> },
  closed: { label: 'Closed', color: 'bg-amber-500', icon: <Square className="size-3" /> },
  verified: { label: 'Verified', color: 'bg-blue-500', icon: <CheckCircle className="size-3" /> },
};

export function ShiftManagement() {
  const shifts = useFuelStore((s) => s.shifts);
  const addShift = useFuelStore((s) => s.addShift);
  const updateShift = useFuelStore((s) => s.updateShift);
  const deleteShift = useFuelStore((s) => s.deleteShift);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // Open shift form
  const [attendantName, setAttendantName] = useState('');
  const [pmsOpening, setPmsOpening] = useState(0);
  const [agoOpening, setAgoOpening] = useState(0);
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(11, 16));

  // Close shift form
  const [closeShiftId, setCloseShiftId] = useState<string | null>(null);
  const [pmsClosing, setPmsClosing] = useState(0);
  const [agoClosing, setAgoClosing] = useState(0);
  const [cashDeclared, setCashDeclared] = useState(0);

  const activeShift = useMemo(() => shifts.find((s) => s.status === 'open'), [shifts]);
  const sortedShifts = useMemo(
    () => [...shifts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [shifts]
  );

  // Close shift calculations
  const closeVariance = useMemo(() => {
    if (!closeShiftId) return 0;
    const shift = shifts.find((s) => s.id === closeShiftId);
    if (!shift) return 0;
    const pmsSales = (pmsClosing - shift.pmsOpening) * pmsPrice;
    const agoSales = (agoClosing - shift.agoOpening) * agoPrice;
    return cashDeclared - (pmsSales + agoSales);
  }, [closeShiftId, pmsClosing, agoClosing, cashDeclared, shifts, pmsPrice, agoPrice]);

  const handleOpenShift = () => {
    if (!attendantName.trim()) return;
    addShift({
      date: new Date().toISOString().slice(0, 10),
      attendantName: attendantName.trim(),
      startTime,
      pmsOpening,
      agoOpening,
      status: 'open',
    });
    setAttendantName('');
    setPmsOpening(0);
    setAgoOpening(0);
    setStartTime(new Date().toISOString().slice(11, 16));
  };

  const handleCloseShift = () => {
    if (!closeShiftId) return;
    const shift = shifts.find((s) => s.id === closeShiftId);
    if (!shift) return;
    const pmsSales = (pmsClosing - shift.pmsOpening) * pmsPrice;
    const agoSales = (agoClosing - shift.agoOpening) * agoPrice;
    updateShift(closeShiftId, {
      pmsClosing,
      agoClosing,
      cashDeclared,
      endTime: new Date().toISOString().slice(11, 16),
      status: 'closed' as ShiftStatus,
      totalSales: pmsSales + agoSales,
      variance: cashDeclared - (pmsSales + agoSales),
    });
    setCloseShiftId(null);
    setPmsClosing(0);
    setAgoClosing(0);
    setCashDeclared(0);
  };

  const handleVerifyShift = (id: string) => {
    updateShift(id, { status: 'verified' as ShiftStatus });
  };

  return (
    <div className="space-y-6">
      {/* ── Active Shift Display ────────────────────────────────────────── */}
      {activeShift && !closeShiftId && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500 text-white text-xs"><Play className="size-3 mr-1" />Active Shift</Badge>
                <CardTitle className="text-sm">{activeShift.attendantName}</CardTitle>
              </div>
              <Button
                onClick={() => {
                  setCloseShiftId(activeShift.id);
                  setPmsClosing(activeShift.pmsOpening);
                  setAgoClosing(activeShift.agoOpening);
                }}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                size="sm"
              >
                <Square className="size-3.5 mr-1" /> Close Shift
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-700/30 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">Start Time</div>
                <div className="text-sm text-slate-200">{activeShift.startTime || '—'}</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">PMS Opening</div>
                <div className="text-sm text-green-300">{activeShift.pmsOpening.toLocaleString()}</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">AGO Opening</div>
                <div className="text-sm text-amber-300">{activeShift.agoOpening.toLocaleString()}</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">Date</div>
                <div className="text-sm text-slate-200">{activeShift.date}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Close Shift Form ─────────────────────────────────────────────── */}
      {closeShiftId && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-base">Close Shift</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Enter closing readings and cash declared</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs flex items-center gap-1">
                  <Droplets className="size-3 text-green-400" /> PMS Closing Reading
                </Label>
                <Input
                  type="number"
                  value={pmsClosing || ''}
                  onChange={(e) => setPmsClosing(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs flex items-center gap-1">
                  <Droplets className="size-3 text-amber-400" /> AGO Closing Reading
                </Label>
                <Input
                  type="number"
                  value={agoClosing || ''}
                  onChange={(e) => setAgoClosing(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Cash Declared (Ksh)</Label>
                <Input
                  type="number"
                  value={cashDeclared || ''}
                  onChange={(e) => setCashDeclared(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div className="flex items-end">
                <div className="bg-slate-700/30 rounded-lg p-3 w-full">
                  <div className="text-[10px] text-slate-400 uppercase">Variance</div>
                  <div className={`text-lg font-bold ${closeVariance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {formatKsh(closeVariance)}
                  </div>
                  {closeVariance < 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-red-400 mt-1">
                      <AlertTriangle className="size-3" /> Cash shortage detected
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCloseShift}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Square className="size-4 mr-2" /> Confirm Close
              </Button>
              <Button
                variant="outline"
                onClick={() => setCloseShiftId(null)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Open New Shift Form ──────────────────────────────────────────── */}
      {!activeShift && !closeShiftId && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base">Open New Shift</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Start a new shift with opening readings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-slate-400 text-xs flex items-center gap-1">
                  <User className="size-3" /> Attendant Name
                </Label>
                <Input
                  placeholder="Enter name"
                  value={attendantName}
                  onChange={(e) => setAttendantName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs flex items-center gap-1">
                  <Droplets className="size-3 text-green-400" /> PMS Opening
                </Label>
                <Input
                  type="number"
                  value={pmsOpening || ''}
                  onChange={(e) => setPmsOpening(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs flex items-center gap-1">
                  <Droplets className="size-3 text-amber-400" /> AGO Opening
                </Label>
                <Input
                  type="number"
                  value={agoOpening || ''}
                  onChange={(e) => setAgoOpening(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
            <Button
              onClick={handleOpenShift}
              className="bg-green-500 hover:bg-green-600 text-black font-semibold"
            >
              <Play className="size-4 mr-2" /> Open Shift
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Shift History Table ─────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base">Shift History</CardTitle>
          <CardDescription className="text-slate-400 text-xs">All shift records</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedShifts.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No shifts recorded yet</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Attendant</TableHead>
                    <TableHead className="text-slate-400 text-xs">PMS Open/Close</TableHead>
                    <TableHead className="text-slate-400 text-xs">AGO Open/Close</TableHead>
                    <TableHead className="text-slate-400 text-xs">Sales</TableHead>
                    <TableHead className="text-slate-400 text-xs">Variance</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedShifts.map((shift) => (
                    <TableRow key={shift.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs">{shift.date}</TableCell>
                      <TableCell className="text-slate-200 text-xs font-medium">{shift.attendantName}</TableCell>
                      <TableCell className="text-xs">
                        <span className="text-green-300">{shift.pmsOpening.toLocaleString()}</span>
                        {' / '}
                        <span className="text-green-400">{shift.pmsClosing.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="text-amber-300">{shift.agoOpening.toLocaleString()}</span>
                        {' / '}
                        <span className="text-amber-400">{shift.agoClosing.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-white text-xs font-semibold">{formatKsh(shift.totalSales)}</TableCell>
                      <TableCell className={`text-xs font-semibold ${shift.variance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {formatKsh(shift.variance)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig[shift.status].color} text-white text-[10px] px-1.5 py-0`}>
                          {statusConfig[shift.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {shift.status === 'closed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700/50"
                            onClick={() => handleVerifyShift(shift.id)}
                          >
                            <CheckCircle className="size-3 mr-1" /> Verify
                          </Button>
                        )}
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
