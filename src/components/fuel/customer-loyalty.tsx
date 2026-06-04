'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Star,
  Award,
  Crown,
  Gem,
  Phone,
  Mail,
  CreditCard,
  TrendingUp,
  UserPlus,
  Wallet,
  Shield,
  Search,
  Trash2,
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
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';
import type { Client } from '@/types/fuel';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getLoyaltyTier(points: number): { name: string; icon: React.ReactNode; color: string; bgColor: string; minPoints: number } {
  if (points >= 5000) {
    return {
      name: 'Platinum',
      icon: <Gem className="size-3.5" />,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20 border-cyan-500/30',
      minPoints: 5000,
    };
  }
  if (points >= 2000) {
    return {
      name: 'Gold',
      icon: <Crown className="size-3.5" />,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20 border-amber-500/30',
      minPoints: 2000,
    };
  }
  if (points >= 500) {
    return {
      name: 'Silver',
      icon: <Award className="size-3.5" />,
      color: 'text-slate-300',
      bgColor: 'bg-slate-500/20 border-slate-500/30',
      minPoints: 500,
    };
  }
  return {
    name: 'Bronze',
    icon: <Star className="size-3.5" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20 border-orange-500/30',
    minPoints: 0,
  };
}

function calculatePoints(totalSpent: number): number {
  // 1 point per Ksh 100 spent
  return Math.floor(totalSpent / 100);
}

// ─── Extended client type with computed fields ──────────────────────────────

interface ClientWithLoyalty extends Client {
  loyaltyPoints: number;
  tier: ReturnType<typeof getLoyaltyTier>;
  totalPurchases: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CustomerLoyalty() {
  const clients = useFuelStore((s) => s.clients);
  const salesHistory = useFuelStore((s) => s.salesHistory);
  const addClient = useFuelStore((s) => s.addClient);
  const updateClient = useFuelStore((s) => s.updateClient);
  const deleteClient = useFuelStore((s) => s.deleteClient);
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');

  // ─── Clients with loyalty data ──────────────────────────────────────────

  const clientsArr = useMemo(() => Object.values(clients), [clients]);
  const salesArr = useMemo(() => Object.values(salesHistory), [salesHistory]);

  const clientsWithLoyalty: ClientWithLoyalty[] = useMemo(() => {
    // Compute total purchases per client based on invoices and balance
    return clientsArr.map((client) => {
      // Estimate total purchases: balanceDue + creditLimit as a proxy, or we can use
      // a simple heuristic. Since we don't have a direct link from sales to clients,
      // we'll estimate total purchases from balance due and credit limit
      const estimatedPurchases = client.balanceDue + client.creditLimit * 0.6;
      const loyaltyPoints = calculatePoints(estimatedPurchases);
      const tier = getLoyaltyTier(loyaltyPoints);

      return {
        ...client,
        loyaltyPoints,
        tier,
        totalPurchases: estimatedPurchases,
      };
    });
  }, [clientsArr]);

  // ─── Filtered clients ──────────────────────────────────────────────────

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientsWithLoyalty;
    const q = searchQuery.toLowerCase();
    return clientsWithLoyalty.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [clientsWithLoyalty, searchQuery]);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const totalCustomers = clientsArr.length;
  const avgSpend = useMemo(() => {
    if (clientsWithLoyalty.length === 0) return 0;
    const total = clientsWithLoyalty.reduce((sum, c) => sum + c.totalPurchases, 0);
    return total / clientsWithLoyalty.length;
  }, [clientsWithLoyalty]);

  const totalReceivables = useMemo(
    () => clientsArr.reduce((sum, c) => sum + c.balanceDue, 0),
    [clientsArr]
  );

  const loyaltyRedemptionRate = useMemo(() => {
    // Mock redemption rate based on tier distribution
    const goldAndAbove = clientsWithLoyalty.filter((c) => c.loyaltyPoints >= 2000).length;
    const total = clientsWithLoyalty.length;
    return total > 0 ? (goldAndAbove / total) * 100 : 0;
  }, [clientsWithLoyalty]);

  // ─── Top Customers ─────────────────────────────────────────────────────

  const topCustomers = useMemo(
    () => [...clientsWithLoyalty].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 5),
    [clientsWithLoyalty]
  );

  // ─── Tier distribution ─────────────────────────────────────────────────

  const tierCounts = useMemo(() => {
    const counts = { Platinum: 0, Gold: 0, Silver: 0, Bronze: 0 };
    clientsWithLoyalty.forEach((c) => {
      counts[c.tier.name as keyof typeof counts]++;
    });
    return counts;
  }, [clientsWithLoyalty]);

  // ─── Add Customer ──────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!newName.trim()) {
      toast({ title: 'Validation Error', description: 'Name is required.', variant: 'destructive' });
      return;
    }

    addClient({
      name: newName.trim(),
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      creditLimit: parseFloat(newCreditLimit) || 0,
      balanceDue: 0,
    });

    toast({ title: 'Customer Added', description: `${newName} has been added.` });
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewCreditLimit('');
    setAddOpen(false);
  };

  // ─── Delete Customer ───────────────────────────────────────────────────

  const handleDelete = (id: string, name: string) => {
    deleteClient(id);
    toast({ title: 'Customer Deleted', description: `${name} has been removed.` });
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="size-4 text-green-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Customers</span>
            </div>
            <div className="text-xl font-bold">{totalCustomers}</div>
            <div className="text-[10px] text-slate-500 mt-1">Total registered</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <TrendingUp className="size-4 text-amber-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Spend</span>
            </div>
            <div className="text-xl font-bold">{formatKsh(avgSpend)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Per customer</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Wallet className="size-4 text-red-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Receivables</span>
            </div>
            <div className="text-xl font-bold text-red-400">{formatKsh(totalReceivables)}</div>
            <div className="text-[10px] text-slate-500 mt-1">Outstanding balances</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Star className="size-4 text-purple-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Active Tier</span>
            </div>
            <div className="text-xl font-bold">{loyaltyRedemptionRate.toFixed(0)}%</div>
            <div className="text-[10px] text-slate-500 mt-1">Gold+ engagement</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top Customers + Tier Distribution Row ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Customers */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Top Customers</CardTitle>
                <CardDescription className="text-slate-400 text-xs">By total spending</CardDescription>
              </div>
              <Crown className="size-5 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-8">No customers yet</div>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((client, idx) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-3"
                  >
                    {/* Rank */}
                    <div className={`size-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                      idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-600/30 text-slate-400'
                    }`}>
                      {idx + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">{client.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          {client.loyaltyPoints.toLocaleString()} pts
                        </span>
                        <Badge className={`text-[9px] px-1.5 py-0 border ${client.tier.bgColor} ${client.tier.color}`}>
                          {client.tier.icon}
                          <span className="ml-1">{client.tier.name}</span>
                        </Badge>
                      </div>
                    </div>

                    {/* Spend */}
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-300">{formatKsh(client.totalPurchases)}</div>
                      <div className="text-[10px] text-slate-500">total spent</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Distribution */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Loyalty Tiers</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Customer distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platinum */}
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Gem className="size-4 text-cyan-400" />
                  <span className="text-xs font-medium text-cyan-400">Platinum</span>
                </div>
                <span className="text-xs text-slate-400">{tierCounts.Platinum}</span>
              </div>
              <div className="text-[10px] text-slate-500">5,000+ points</div>
              <div className="h-1.5 bg-slate-600/50 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${totalCustomers > 0 ? (tierCounts.Platinum / totalCustomers) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Gold */}
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">Gold</span>
                </div>
                <span className="text-xs text-slate-400">{tierCounts.Gold}</span>
              </div>
              <div className="text-[10px] text-slate-500">2,000-4,999 points</div>
              <div className="h-1.5 bg-slate-600/50 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${totalCustomers > 0 ? (tierCounts.Gold / totalCustomers) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Silver */}
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-slate-300" />
                  <span className="text-xs font-medium text-slate-300">Silver</span>
                </div>
                <span className="text-xs text-slate-400">{tierCounts.Silver}</span>
              </div>
              <div className="text-[10px] text-slate-500">500-1,999 points</div>
              <div className="h-1.5 bg-slate-600/50 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: `${totalCustomers > 0 ? (tierCounts.Silver / totalCustomers) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Bronze */}
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star className="size-4 text-orange-400" />
                  <span className="text-xs font-medium text-orange-400">Bronze</span>
                </div>
                <span className="text-xs text-slate-400">{tierCounts.Bronze}</span>
              </div>
              <div className="text-[10px] text-slate-500">0-499 points</div>
              <div className="h-1.5 bg-slate-600/50 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${totalCustomers > 0 ? (tierCounts.Bronze / totalCustomers) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Points info */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-2">
              <div className="text-[10px] text-amber-300 font-medium uppercase tracking-wider mb-1">Points System</div>
              <div className="text-[10px] text-slate-400">1 point per Ksh 100 spent</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search + Add Row ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, phone, or email..."
            className="bg-slate-700/50 border-slate-600/50 text-white pl-9"
          />
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium text-xs">
              <UserPlus className="size-4 mr-1" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700/50 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Add Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-slate-300 text-xs">Name *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  className="bg-slate-700/50 border-slate-600/50 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Phone</Label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +254 712 345 678"
                  className="bg-slate-700/50 border-slate-600/50 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Email</Label>
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="bg-slate-700/50 border-slate-600/50 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Credit Limit (Ksh)</Label>
                <Input
                  type="number"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  placeholder="e.g. 50000"
                  className="bg-slate-700/50 border-slate-600/50 text-white mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="text-slate-400 text-xs">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAdd} className="bg-amber-500 hover:bg-amber-600 text-black font-medium text-xs">
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Customer Directory ──────────────────────────────────────────── */}
      {filteredClients.length === 0 ? (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="size-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-medium text-slate-300">
              {searchQuery ? 'No customers match your search' : 'No customers yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'Add your first customer to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const creditUtil = client.creditLimit > 0
              ? Math.round((client.balanceDue / client.creditLimit) * 100)
              : 0;
            const isOverLimit = creditUtil > 100;

            return (
              <Card
                key={client.id}
                className={`bg-slate-800/60 border-slate-700/50 text-white ${isOverLimit ? 'border-red-500/40' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        client.tier.name === 'Platinum' ? 'bg-cyan-500/20 text-cyan-400' :
                        client.tier.name === 'Gold' ? 'bg-amber-500/20 text-amber-400' :
                        client.tier.name === 'Silver' ? 'bg-slate-500/20 text-slate-300' :
                        'bg-orange-500/20 text-orange-400'
                      }`}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{client.name}</CardTitle>
                        <Badge className={`text-[9px] px-1.5 py-0 border mt-0.5 ${client.tier.bgColor} ${client.tier.color}`}>
                          {client.tier.icon}
                          <span className="ml-1">{client.tier.name}</span>
                        </Badge>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-red-400">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-700/50">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete {client.name}?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            This will permanently remove this customer and all their data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="text-slate-400">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(client.id, client.name)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Contact Info */}
                  <div className="space-y-1.5">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-3 text-slate-500" />
                        <span className="text-xs text-slate-300">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="size-3 text-slate-500" />
                        <span className="text-xs text-slate-300 truncate">{client.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Loyalty Points */}
                  <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <Star className="size-3.5 text-amber-400" />
                      <span className="text-xs text-slate-300">Loyalty Points</span>
                    </div>
                    <span className="text-sm font-bold text-amber-300">{client.loyaltyPoints.toLocaleString()}</span>
                  </div>

                  {/* Total Purchases */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Total Purchases</span>
                    <span className="text-sm font-semibold text-green-300">{formatKsh(client.totalPurchases)}</span>
                  </div>

                  {/* Credit Management */}
                  {client.creditLimit > 0 && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="size-3 text-slate-500" />
                          <span className="text-xs text-slate-400">Credit Utilization</span>
                        </div>
                        <span className={`text-[10px] font-medium ${isOverLimit ? 'text-red-400' : creditUtil > 75 ? 'text-amber-400' : 'text-green-400'}`}>
                          {creditUtil}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverLimit ? 'bg-red-500' : creditUtil > 75 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, creditUtil)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-500">Due: {formatKsh(client.balanceDue)}</span>
                        <span className="text-[10px] text-slate-500">Limit: {formatKsh(client.creditLimit)}</span>
                      </div>
                      {isOverLimit && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Shield className="size-3 text-red-400" />
                          <span className="text-[10px] text-red-400 font-medium">Credit limit exceeded</span>
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
    </div>
  );
}
