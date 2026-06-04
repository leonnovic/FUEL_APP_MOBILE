'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  AlertCircle,
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
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';
import type { InvoiceStatus, InvoiceItem } from '@/types/fuel';

const statusConfig: Record<InvoiceStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  paid: { label: 'Paid', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  overdue: { label: 'Overdue', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

export function InvoiceSystem() {
  const addInvoice = useFuelStore((s) => s.addInvoice);
  const updateInvoice = useFuelStore((s) => s.updateInvoice);
  const deleteInvoice = useFuelStore((s) => s.deleteInvoice);
  const invoices = useFuelStore((s) => s.invoices);
  const clients = useFuelStore((s) => s.clients);

  const clientsArr = useMemo(() => Object.values(clients), [clients]);
  const invoicesArr = useMemo(
    () => Object.values(invoices).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [invoices]
  );

  // Summary stats
  const totalInvoiced = useMemo(
    () => invoicesArr.reduce((sum, i) => sum + i.totalAmount, 0),
    [invoicesArr]
  );
  const totalPaid = useMemo(
    () => invoicesArr.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0),
    [invoicesArr]
  );
  const totalOutstanding = useMemo(
    () => invoicesArr.filter((i) => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + i.totalAmount, 0),
    [invoicesArr]
  );

  // Dialog form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { name: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);

  // Add item row
  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  // Remove item row
  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  // Update item
  const handleItemChange = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = items.map((item, i) => {
      if (i !== idx) return item;
      const newItem = { ...item, [field]: value };
      newItem.total = newItem.quantity * newItem.unitPrice;
      return newItem;
    });
    setItems(updated);
  };

  // Invoice total
  const invoiceTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  // Create invoice
  const handleCreateInvoice = () => {
    if (!clientName || items.every((i) => i.name.trim() === '')) return;

    addInvoice({
      clientName,
      clientPhone: clientPhone || undefined,
      items: items.map((i) => ({ ...i, total: i.quantity * i.unitPrice })),
      dueDate: dueDate || undefined,
      status: 'pending',
    });

    // Reset
    setClientName('');
    setClientPhone('');
    setDueDate('');
    setItems([{ name: '', quantity: 1, unitPrice: 0, total: 0 }]);
    setDialogOpen(false);
  };

  // Mark as paid
  const handleMarkPaid = (id: string) => {
    updateInvoice(id, { status: 'paid' });
  };

  // Delete invoice
  const handleDelete = (id: string) => {
    deleteInvoice(id);
  };

  // Select client from existing
  const handleSelectClient = (clientId: string) => {
    const client = clientsArr.find((c) => c.id === clientId);
    if (client) {
      setClientName(client.name);
      setClientPhone(client.phone || '');
    }
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="size-5 text-purple-400" />
            Invoice Management
          </h2>
          <p className="text-xs text-slate-400">Create and track invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-500 hover:bg-purple-600 text-white font-semibold">
              <Plus className="size-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">New Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Client selector */}
              {clientsArr.length > 0 && (
                <div>
                  <Label className="text-slate-400 text-xs">Select Existing Client</Label>
                  <Select onValueChange={handleSelectClient}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white mt-1">
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {clientsArr.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-slate-200 focus:bg-slate-700">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Client Name</Label>
                  <Input placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Phone</Label>
                  <Input placeholder="Phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <Label className="text-slate-400 text-xs">Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-slate-400 text-xs">Invoice Items</Label>
                  <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white h-6" onClick={handleAddItem}>
                    <Plus className="size-3 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        {idx === 0 && <Label className="text-slate-500 text-[10px]">Description</Label>}
                        <Input
                          placeholder="Item"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className={`${inputClass} text-xs h-8`}
                        />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <Label className="text-slate-500 text-[10px]">Qty</Label>}
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className={`${inputClass} text-xs h-8`}
                        />
                      </div>
                      <div className="col-span-3">
                        {idx === 0 && <Label className="text-slate-500 text-[10px]">Unit Price</Label>}
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className={`${inputClass} text-xs h-8`}
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        {idx === 0 && <Label className="text-slate-500 text-[10px]">Total</Label>}
                        <span className="text-xs text-slate-300 block py-1.5">{(item.quantity * item.unitPrice).toLocaleString()}</span>
                      </div>
                      <div className="col-span-1">
                        {items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-slate-500 hover:text-red-400"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                <span className="text-slate-400 text-sm">Invoice Total</span>
                <span className="text-xl font-bold text-white">Ksh {invoiceTotal.toLocaleString()}</span>
              </div>

              <Button onClick={handleCreateInvoice} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold">
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="size-3" /> Total Invoiced
            </div>
            <div className="text-xl font-bold mt-1">Ksh {totalInvoiced.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-green-400 uppercase tracking-wider">Paid</div>
            <div className="text-xl font-bold mt-1 text-green-300">Ksh {totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-red-400 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="size-3" /> Outstanding
            </div>
            <div className="text-xl font-bold mt-1 text-red-300">Ksh {totalOutstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Invoice Table ─────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesArr.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No invoices created yet</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Invoice #</TableHead>
                    <TableHead className="text-slate-400 text-xs">Client</TableHead>
                    <TableHead className="text-slate-400 text-xs">Items</TableHead>
                    <TableHead className="text-slate-400 text-xs">Amount</TableHead>
                    <TableHead className="text-slate-400 text-xs">Due Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesArr.map((inv) => {
                    const sc = statusConfig[inv.status];
                    return (
                      <TableRow key={inv.id} className="border-slate-700/50">
                        <TableCell className="text-slate-300 text-xs font-mono">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-slate-300 text-xs">{inv.clientName}</TableCell>
                        <TableCell className="text-slate-400 text-xs">{inv.items.length} item{inv.items.length !== 1 ? 's' : ''}</TableCell>
                        <TableCell className="text-white text-xs font-semibold">Ksh {inv.totalAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-slate-400 text-xs">{inv.dueDate || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`${sc.color} text-[10px] px-1.5 py-0 border`}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                onClick={() => handleMarkPaid(inv.id)}
                                title="Mark as Paid"
                              >
                                <CheckCircle2 className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleDelete(inv.id)}
                              title="Delete Invoice"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
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
