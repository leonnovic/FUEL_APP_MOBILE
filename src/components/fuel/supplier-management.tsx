'use client';

import { useState, useMemo } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Fuel,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';
import type { Supplier, SupplierFormData } from '@/types/fuel';

export function SupplierManagement() {
  const suppliers = useFuelStore((s) => s.suppliers);
  const addSupplier = useFuelStore((s) => s.addSupplier);
  const updateSupplier = useFuelStore((s) => s.updateSupplier);
  const deleteSupplier = useFuelStore((s) => s.deleteSupplier);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormData>({
    name: '',
    phone: '',
    email: '',
    product: '',
    address: '',
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', product: '', address: '' });
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      product: supplier.product || '',
      address: supplier.address || '',
    });
    setEditingId(supplier.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateSupplier(editingId, form);
    } else {
      addSupplier(form);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteSupplier(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Header with Add Button ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="size-5 text-amber-400" />
            Suppliers
          </h2>
          <p className="text-xs text-slate-400">{suppliers.length} registered suppliers</p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          <Plus className="size-4 mr-2" /> Add Supplier
        </Button>
      </div>

      {/* ── Supplier Cards ──────────────────────────────────────────────── */}
      {suppliers.length === 0 ? (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="py-12 text-center">
            <Building2 className="size-12 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-400 text-sm">No suppliers registered yet</div>
            <Button
              onClick={handleOpenAdd}
              variant="outline"
              className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Plus className="size-4 mr-2" /> Add Your First Supplier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{supplier.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-slate-400 hover:text-amber-400"
                      onClick={() => handleOpenEdit(supplier)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-slate-400 hover:text-red-400"
                      onClick={() => setDeleteConfirmId(supplier.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {supplier.product && (
                  <Badge className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0 w-fit">
                    <Fuel className="size-3 mr-1" /> {supplier.product}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Phone className="size-3 text-slate-500" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Mail className="size-3 text-slate-500" />
                    {supplier.email}
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <MapPin className="size-3 text-slate-500" />
                    {supplier.address}
                  </div>
                )}
                <div className="text-[10px] text-slate-500 pt-1">
                  Added {new Date(supplier.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Supplier List Table ─────────────────────────────────────────── */}
      {suppliers.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base">Supplier Directory</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Complete supplier listing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Name</TableHead>
                    <TableHead className="text-slate-400 text-xs">Product</TableHead>
                    <TableHead className="text-slate-400 text-xs">Phone</TableHead>
                    <TableHead className="text-slate-400 text-xs">Email</TableHead>
                    <TableHead className="text-slate-400 text-xs w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id} className="border-slate-700/50">
                      <TableCell className="text-white text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{s.product || '—'}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{s.phone || '—'}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{s.email || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-slate-400 hover:text-amber-400"
                            onClick={() => handleOpenEdit(s)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-slate-400 hover:text-red-400"
                            onClick={() => setDeleteConfirmId(s.id)}
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
          </CardContent>
        </Card>
      )}

      {/* ── Add/Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingId ? 'Update supplier details' : 'Enter supplier information'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-400 text-xs">Name *</Label>
              <Input
                placeholder="Supplier name"
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
                <Label className="text-slate-400 text-xs">Email</Label>
                <Input
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Product</Label>
              <Input
                placeholder="e.g. PMS, AGO, Lubricants"
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Address</Label>
              <Input
                placeholder="Physical address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
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
              {editingId ? 'Update' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this supplier? This action cannot be undone.
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
