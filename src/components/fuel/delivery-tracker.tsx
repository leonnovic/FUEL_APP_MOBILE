'use client';

import { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  AlertCircle,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useFuelStore } from '@/store/fuel-store';
import type { DeliveryStatus, DeliveryFormData } from '@/types/fuel';

const statusConfig: Record<DeliveryStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Clock className="size-3" /> },
  delivered: { label: 'Delivered', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: <CheckCircle2 className="size-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <XCircle className="size-3" /> },
};

export function DeliveryTracker() {
  const addDelivery = useFuelStore((s) => s.addDelivery);
  const updateDelivery = useFuelStore((s) => s.updateDelivery);
  const deliveryData = useFuelStore((s) => s.deliveryData);
  const suppliers = useFuelStore((s) => s.suppliers);

  const deliveriesArr = useMemo(
    () => Object.values(deliveryData).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [deliveryData]
  );

  // Filter state
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');

  const filteredDeliveries = useMemo(
    () => statusFilter === 'all' ? deliveriesArr : deliveriesArr.filter((d) => d.status === statusFilter),
    [deliveriesArr, statusFilter]
  );

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSupplier, setFormSupplier] = useState('');
  const [formProduct, setFormProduct] = useState('PMS');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formUnitPrice, setFormUnitPrice] = useState(0);
  const [formInvoice, setFormInvoice] = useState('');
  const [formDriver, setFormDriver] = useState('');
  const [formVehicle, setFormVehicle] = useState('');

  // Totals
  const totalBalanceDue = useMemo(
    () => deliveriesArr.reduce((sum, d) => sum + d.balanceDue, 0),
    [deliveriesArr]
  );

  const pendingCount = useMemo(
    () => deliveriesArr.filter((d) => d.status === 'pending').length,
    [deliveriesArr]
  );

  // Add delivery
  const handleAddDelivery = () => {
    if (!formDate || !formSupplier || formQuantity <= 0) return;

    addDelivery({
      date: formDate,
      supplier: formSupplier,
      product: formProduct,
      quantity: formQuantity,
      unitPrice: formUnitPrice,
      invoiceNumber: formInvoice || undefined,
      driverName: formDriver || undefined,
      vehicleNumber: formVehicle || undefined,
      status: 'pending',
    });

    // Reset
    setFormSupplier('');
    setFormProduct('PMS');
    setFormQuantity(0);
    setFormUnitPrice(0);
    setFormInvoice('');
    setFormDriver('');
    setFormVehicle('');
    setDialogOpen(false);
  };

  // Mark as delivered
  const handleMarkDelivered = (id: string) => {
    updateDelivery(id, { status: 'delivered', balanceDue: 0 });
  };

  // Mark as cancelled
  const handleCancel = (id: string) => {
    updateDelivery(id, { status: 'cancelled' });
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Header + Summary ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Truck className="size-5 text-amber-400" />
            Delivery Tracker
          </h2>
          <p className="text-xs text-slate-400">Manage fuel deliveries and supplier invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <Plus className="size-4 mr-2" />
              Add Delivery
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">New Delivery</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Date</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Supplier</Label>
                  <Input placeholder="Supplier name" value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Product</Label>
                  <Select value={formProduct} onValueChange={setFormProduct}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="PMS" className="text-slate-200">PMS (Super Petrol)</SelectItem>
                      <SelectItem value="AGO" className="text-slate-200">AGO (Diesel)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Quantity (L)</Label>
                  <Input type="number" value={formQuantity || ''} onChange={(e) => setFormQuantity(Number(e.target.value))} placeholder="0" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Unit Price (Ksh)</Label>
                  <Input type="number" step="0.01" value={formUnitPrice || ''} onChange={(e) => setFormUnitPrice(Number(e.target.value))} placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Invoice #</Label>
                  <Input placeholder="INV-001" value={formInvoice} onChange={(e) => setFormInvoice(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Driver Name</Label>
                  <Input placeholder="Driver name" value={formDriver} onChange={(e) => setFormDriver(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Vehicle #</Label>
                  <Input placeholder="KAB 123X" value={formVehicle} onChange={(e) => setFormVehicle(e.target.value)} className={inputClass} />
                </div>
              </div>
              {/* Total preview */}
              <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400">Total Amount</div>
                <div className="text-xl font-bold text-white">Ksh {(formQuantity * formUnitPrice).toLocaleString()}</div>
              </div>
              <Button onClick={handleAddDelivery} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                Add Delivery
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Total Deliveries</div>
            <div className="text-xl font-bold mt-1">{deliveriesArr.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-amber-400 uppercase tracking-wider">Pending</div>
            <div className="text-xl font-bold mt-1 text-amber-300">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-red-400 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="size-3" /> Balance Due
            </div>
            <div className="text-xl font-bold mt-1 text-red-300">Ksh {totalBalanceDue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter + Table ─────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Deliveries</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-slate-400" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DeliveryStatus | 'all')}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-200">All</SelectItem>
                  <SelectItem value="pending" className="text-slate-200">Pending</SelectItem>
                  <SelectItem value="delivered" className="text-slate-200">Delivered</SelectItem>
                  <SelectItem value="cancelled" className="text-slate-200">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDeliveries.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No deliveries found</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Supplier</TableHead>
                    <TableHead className="text-slate-400 text-xs">Product</TableHead>
                    <TableHead className="text-slate-400 text-xs">Qty (L)</TableHead>
                    <TableHead className="text-slate-400 text-xs">Total</TableHead>
                    <TableHead className="text-slate-400 text-xs">Balance</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((d) => {
                    const sc = statusConfig[d.status];
                    return (
                      <TableRow key={d.id} className="border-slate-700/50">
                        <TableCell className="text-slate-300 text-xs">{d.date}</TableCell>
                        <TableCell className="text-slate-300 text-xs">{d.supplier}</TableCell>
                        <TableCell className="text-xs">
                          <Badge className={`${d.product === 'PMS' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'} text-[10px] px-1.5 py-0 border-0`}>
                            {d.product}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-xs">{d.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-white text-xs font-semibold">Ksh {d.totalAmount.toLocaleString()}</TableCell>
                        <TableCell className={`text-xs font-semibold ${d.balanceDue > 0 ? 'text-red-300' : 'text-green-300'}`}>
                          Ksh {d.balanceDue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${sc.color} text-[10px] px-1.5 py-0 border`}>
                            {sc.icon}
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {d.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                onClick={() => handleMarkDelivered(d.id)}
                                title="Mark Delivered"
                              >
                                <CheckCircle2 className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => handleCancel(d.id)}
                                title="Cancel"
                              >
                                <XCircle className="size-3.5" />
                              </Button>
                            </div>
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
