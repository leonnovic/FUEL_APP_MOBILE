'use client';

import { useState, useMemo } from 'react';
import {
  CreditCard,
  AlertCircle,
  Send,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';
import type { Client } from '@/types/fuel';

export function DebtReminder() {
  const clients = useFuelStore((s) => s.clients);
  const updateClient = useFuelStore((s) => s.updateClient);

  const clientsArr = useMemo(() => Object.values(clients), [clients]);

  // Clients with balance due
  const debtors = useMemo(
    () => clientsArr.filter((c) => c.balanceDue > 0).sort((a, b) => b.balanceDue - a.balanceDue),
    [clientsArr]
  );

  // Total outstanding
  const totalOutstanding = useMemo(
    () => debtors.reduce((sum, c) => sum + c.balanceDue, 0),
    [debtors]
  );

  // Expanded client
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentClient, setPaymentClient] = useState<Client | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Reminder sent toast state (visual only)
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  // Toggle client expansion
  const toggleExpand = (clientId: string) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
  };

  // Send reminder (visual only)
  const handleSendReminder = (client: Client) => {
    setReminderSent(client.id);
    setTimeout(() => setReminderSent(null), 3000);
  };

  // Open payment dialog
  const openPaymentDialog = (client: Client) => {
    setPaymentClient(client);
    setPaymentAmount(0);
    setPaymentDialogOpen(true);
  };

  // Record payment
  const handleRecordPayment = () => {
    if (!paymentClient || paymentAmount <= 0) return;

    const newBalance = Math.max(0, paymentClient.balanceDue - paymentAmount);
    updateClient(paymentClient.id, { balanceDue: newBalance });

    setPaymentDialogOpen(false);
    setPaymentClient(null);
    setPaymentAmount(0);
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CreditCard className="size-5 text-red-400" />
          Debt &amp; Reminders
        </h2>
        <p className="text-xs text-slate-400">Track outstanding balances and send reminders</p>
      </div>

      {/* ── Summary ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-red-400 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="size-3" /> Total Outstanding
            </div>
            <div className="text-2xl font-bold mt-1 text-red-300">Ksh {totalOutstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-amber-400 uppercase tracking-wider">Clients with Debt</div>
            <div className="text-2xl font-bold mt-1 text-amber-300">{debtors.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="pt-5">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Total Clients</div>
            <div className="text-2xl font-bold mt-1">{clientsArr.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Debtors List ──────────────────────────────────────────────── */}
      {debtors.length === 0 ? (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="size-12 text-green-400 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 text-sm">All clients are paid up!</p>
            <p className="text-slate-500 text-xs mt-1">No outstanding debts to display</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {debtors.map((client) => {
            const isExpanded = expandedClient === client.id;
            const isReminderSent = reminderSent === client.id;
            const utilization = client.creditLimit > 0
              ? Math.min(100, Math.round((client.balanceDue / client.creditLimit) * 100))
              : 100;

            return (
              <Card key={client.id} className="bg-slate-800/60 border-slate-700/50 text-white">
                <CardContent className="p-4">
                  {/* Summary row */}
                  <button
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => toggleExpand(client.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                        <span className="text-red-400 font-bold text-sm">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{client.name}</div>
                        <div className="text-xs text-slate-400">
                          {client.phone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-bold text-red-300">Ksh {client.balanceDue.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500">
                          Limit: Ksh {client.creditLimit.toLocaleString()} ({utilization}%)
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="size-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      {/* Credit utilization bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">Credit Utilization</span>
                          <span className="text-xs text-slate-300">{utilization}%</span>
                        </div>
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${utilization}%`,
                              background: utilization > 80 ? '#ef4444' : utilization > 50 ? '#f59e0b' : '#22c55e',
                            }}
                          />
                        </div>
                      </div>

                      {/* Contact info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Phone className="size-3.5" />
                          <span>{client.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail className="size-3.5" />
                          <span>{client.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <MapPin className="size-3.5" />
                          <span>{client.address || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs"
                          onClick={() => handleSendReminder(client)}
                        >
                          <Send className="size-3.5 mr-1" />
                          {isReminderSent ? 'Sent!' : 'Send Reminder'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs"
                          onClick={() => openPaymentDialog(client)}
                        >
                          <DollarSign className="size-3.5 mr-1" />
                          Record Payment
                        </Button>
                      </div>

                      {isReminderSent && (
                        <div className="mt-3 text-xs text-blue-400 bg-blue-500/10 rounded-lg px-3 py-2 border border-blue-500/20">
                          <Send className="size-3 inline mr-1" />
                          Payment reminder sent to {client.name}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── All Clients (with no debt) ────────────────────────────────── */}
      {clientsArr.filter((c) => c.balanceDue === 0).length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-400" />
              Paid-Up Clients
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Clients with no outstanding balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientsArr.filter((c) => c.balanceDue === 0).map((client) => (
                <div key={client.id} className="flex items-center justify-between bg-slate-700/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 font-bold text-xs">{client.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-slate-300">{client.name}</span>
                  </div>
                  <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] px-1.5 py-0 border">
                    Clear
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Payment Dialog ────────────────────────────────────────────── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Record Payment</DialogTitle>
          </DialogHeader>
          {paymentClient && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="text-sm font-semibold text-white">{paymentClient.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Outstanding: <span className="text-red-300 font-semibold">Ksh {paymentClient.balanceDue.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Payment Amount (Ksh)</Label>
                <Input
                  type="number"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="0"
                  className={`${inputClass} text-lg font-semibold`}
                />
              </div>
              <div className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">Remaining Balance</span>
                <span className="text-sm font-semibold text-white">
                  Ksh {Math.max(0, paymentClient.balanceDue - paymentAmount).toLocaleString()}
                </span>
              </div>
              <Button
                onClick={handleRecordPayment}
                disabled={paymentAmount <= 0}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold disabled:opacity-50"
              >
                <CheckCircle2 className="size-4 mr-2" />
                Record Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
