'use client';

import { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Navigation,
  RotateCcw,
  Filter,
  CalendarDays,
  MapPin,
  FileText,
  ChevronRight,
  Fuel,
  Timer,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'confirmed' | 'in-transit' | 'delivered' | 'cancelled';

interface FuelOrder {
  id: string;
  orderId: string;
  supplier: string;
  fuelType: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  deliveryDate: string;
  deliveryTime: string;
  location: string;
  specialInstructions: string;
  status: OrderStatus;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SUPPLIERS = ['KenolKobil', 'Total Energies', 'Vivo Energy', 'OLA Energy'];
const FUEL_TYPES = ['PMS', 'AGO', 'DPK'];

const FUEL_PRICES: Record<string, number> = {
  PMS: 195.53,
  AGO: 179.38,
  DPK: 168.47,
};

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'in-transit', 'delivered'];

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string; stepIndex: number }> = {
  pending: { label: 'Pending', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', stepIndex: 0 },
  confirmed: { label: 'Confirmed', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', stepIndex: 1 },
  'in-transit': { label: 'In Transit', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', stepIndex: 2 },
  delivered: { label: 'Delivered', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', stepIndex: 3 },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', stepIndex: -1 },
};

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_ORDERS: FuelOrder[] = [
  {
    id: '1',
    orderId: 'FOR-2025-001',
    supplier: 'KenolKobil',
    fuelType: 'PMS',
    quantity: 12000,
    unitPrice: 192.50,
    totalCost: 2310000,
    deliveryDate: '2025-03-02',
    deliveryTime: '08:00',
    location: 'Main Station - Mombasa Road',
    specialInstructions: 'Use Gate B entrance. Ask for Mr. Ochieng.',
    status: 'delivered',
    createdAt: '2025-02-28T10:30:00',
  },
  {
    id: '2',
    orderId: 'FOR-2025-002',
    supplier: 'Total Energies',
    fuelType: 'AGO',
    quantity: 8000,
    unitPrice: 176.20,
    totalCost: 1409600,
    deliveryDate: '2025-03-03',
    deliveryTime: '10:30',
    location: 'Branch Depot - Thika Road',
    specialInstructions: 'Prioritize Tank 3 filling first.',
    status: 'delivered',
    createdAt: '2025-03-01T14:15:00',
  },
  {
    id: '3',
    orderId: 'FOR-2025-003',
    supplier: 'Vivo Energy',
    fuelType: 'DPK',
    quantity: 5000,
    unitPrice: 165.00,
    totalCost: 825000,
    deliveryDate: '2025-03-04',
    deliveryTime: '14:00',
    location: 'Aviation Wing - Wilson Airport',
    specialInstructions: 'KEBS certification required before offloading.',
    status: 'in-transit',
    createdAt: '2025-03-03T09:00:00',
  },
  {
    id: '4',
    orderId: 'FOR-2025-004',
    supplier: 'OLA Energy',
    fuelType: 'PMS',
    quantity: 15000,
    unitPrice: 193.80,
    totalCost: 2907000,
    deliveryDate: '2025-03-05',
    deliveryTime: '06:00',
    location: 'Main Station - Mombasa Road',
    specialInstructions: '',
    status: 'confirmed',
    createdAt: '2025-03-04T11:45:00',
  },
  {
    id: '5',
    orderId: 'FOR-2025-005',
    supplier: 'KenolKobil',
    fuelType: 'AGO',
    quantity: 10000,
    unitPrice: 178.90,
    totalCost: 1789000,
    deliveryDate: '2025-03-06',
    deliveryTime: '09:00',
    location: 'Branch Depot - Thika Road',
    specialInstructions: 'Contact supervisor on arrival. Phone: 0722-XXX-XXX',
    status: 'pending',
    createdAt: '2025-03-05T16:30:00',
  },
  {
    id: '6',
    orderId: 'FOR-2025-006',
    supplier: 'Total Energies',
    fuelType: 'PMS',
    quantity: 6000,
    unitPrice: 194.30,
    totalCost: 1165800,
    deliveryDate: '2025-03-01',
    deliveryTime: '11:00',
    location: 'Main Station - Mombasa Road',
    specialInstructions: '',
    status: 'cancelled',
    createdAt: '2025-02-27T08:20:00',
  },
  {
    id: '7',
    orderId: 'FOR-2025-007',
    supplier: 'Vivo Energy',
    fuelType: 'AGO',
    quantity: 9000,
    unitPrice: 177.50,
    totalCost: 1597500,
    deliveryDate: '2025-03-07',
    deliveryTime: '07:30',
    location: 'Industrial Area - Lunga Lunga',
    specialInstructions: 'Deliver before 9 AM — peak hours restriction.',
    status: 'pending',
    createdAt: '2025-03-06T10:00:00',
  },
  {
    id: '8',
    orderId: 'FOR-2025-008',
    supplier: 'OLA Energy',
    fuelType: 'DPK',
    quantity: 4000,
    unitPrice: 166.80,
    totalCost: 667200,
    deliveryDate: '2025-03-08',
    deliveryTime: '15:00',
    location: 'Aviation Wing - Wilson Airport',
    specialInstructions: 'Quality certificate must accompany delivery.',
    status: 'confirmed',
    createdAt: '2025-03-07T13:10:00',
  },
];

// ─── Status Stepper Component ───────────────────────────────────────────────

function StatusStepper({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
            <XCircle className="size-3.5 text-red-400" />
          </div>
          <span className="text-xs text-red-400 font-medium">Cancelled</span>
        </div>
      </div>
    );
  }

  const currentStep = statusConfig[status].stepIndex;

  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, idx) => {
        const isCompleted = idx <= currentStep;
        const isCurrent = idx === currentStep;
        const stepCfg = statusConfig[step];

        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted
                    ? isCurrent
                      ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                      : 'border-green-500 bg-green-500/20'
                    : 'border-slate-600 bg-slate-700/50'
                }`}
              >
                {isCompleted && !isCurrent && <CheckCircle2 className="size-3.5 text-green-400" />}
                {isCurrent && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                {!isCompleted && <div className="w-2 h-2 rounded-full bg-slate-600" />}
              </div>
              <span
                className={`text-[9px] mt-1 whitespace-nowrap ${
                  isCurrent ? stepCfg.color + ' font-semibold' : isCompleted ? 'text-green-400' : 'text-slate-500'
                }`}
              >
                {stepCfg.label}
              </span>
            </div>
            {/* Connecting line */}
            {idx < STATUS_STEPS.length - 1 && (
              <div
                className={`w-6 sm:w-10 h-0.5 mx-0.5 mb-4 transition-all ${
                  idx < currentStep ? 'bg-green-500' : 'bg-slate-600'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function FuelOrderRequest() {
  // Orders state
  const [orders, setOrders] = useState<FuelOrder[]>(MOCK_ORDERS);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<FuelOrder | null>(null);
  const [reorderDialog, setReorderDialog] = useState(false);
  const [reorderData, setReorderData] = useState<FuelOrder | null>(null);

  // Form state
  const [formSupplier, setFormSupplier] = useState('');
  const [formFuelType, setFormFuelType] = useState('PMS');
  const [formQuantity, setFormQuantity] = useState<number>(0);
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formDeliveryTime, setFormDeliveryTime] = useState('08:00');
  const [formLocation, setFormLocation] = useState('');
  const [formInstructions, setFormInstructions] = useState('');

  // Filter state
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterFuelType, setFilterFuelType] = useState<string>('all');

  // Estimated cost
  const estimatedCost = useMemo(() => {
    const price = FUEL_PRICES[formFuelType] ?? 0;
    return formQuantity * price;
  }, [formFuelType, formQuantity]);

  // ─── Computed values ─────────────────────────────────────────────────────

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'cancelled' && o.status !== 'delivered').length,
    [orders]
  );

  const pendingDeliveries = useMemo(
    () => orders.filter((o) => o.status === 'in-transit' || o.status === 'confirmed').length,
    [orders]
  );

  const totalVolume = useMemo(
    () => orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.quantity, 0),
    [orders]
  );

  const ordersThisMonth = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getFullYear() * 100 + (now.getMonth() + 1);
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getFullYear() * 100 + (d.getMonth() + 1) === thisMonth;
    }).length;
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== 'all' && o.status !== filterStatus) return false;
      if (filterSupplier !== 'all' && o.supplier !== filterSupplier) return false;
      if (filterFuelType !== 'all' && o.fuelType !== filterFuelType) return false;
      return true;
    });
  }, [orders, filterStatus, filterSupplier, filterFuelType]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormSupplier('');
    setFormFuelType('PMS');
    setFormQuantity(0);
    setFormDeliveryDate('');
    setFormDeliveryTime('08:00');
    setFormLocation('');
    setFormInstructions('');
  };

  const handlePlaceOrder = () => {
    if (!formSupplier || !formFuelType || formQuantity <= 0 || !formDeliveryDate || !formLocation) return;

    const newId = String(orders.length + 1);
    const orderId = `FOR-2025-${String(orders.length + 1).padStart(3, '0')}`;
    const unitPrice = FUEL_PRICES[formFuelType] ?? 0;

    const newOrder: FuelOrder = {
      id: newId,
      orderId,
      supplier: formSupplier,
      fuelType: formFuelType,
      quantity: formQuantity,
      unitPrice,
      totalCost: formQuantity * unitPrice,
      deliveryDate: formDeliveryDate,
      deliveryTime: formDeliveryTime,
      location: formLocation,
      specialInstructions: formInstructions,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    resetForm();
    setDialogOpen(false);
  };

  const handleAdvanceStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const stepIdx = STATUS_STEPS.indexOf(o.status);
        if (stepIdx < STATUS_STEPS.length - 1) {
          return { ...o, status: STATUS_STEPS[stepIdx + 1] };
        }
        return o;
      })
    );
  };

  const handleCancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o))
    );
  };

  const handleQuickReorder = (order: FuelOrder) => {
    setReorderData(order);
    setFormSupplier(order.supplier);
    setFormFuelType(order.fuelType);
    setFormQuantity(order.quantity);
    setFormDeliveryDate('');
    setFormDeliveryTime('08:00');
    setFormLocation(order.location);
    setFormInstructions(order.specialInstructions);
    setReorderDialog(true);
  };

  const handleReorderSubmit = () => {
    if (!formSupplier || formQuantity <= 0 || !formDeliveryDate || !formLocation) return;

    const newId = String(orders.length + 1);
    const orderId = `FOR-2025-${String(orders.length + 1).padStart(3, '0')}`;
    const unitPrice = FUEL_PRICES[formFuelType] ?? 0;

    const newOrder: FuelOrder = {
      id: newId,
      orderId,
      supplier: formSupplier,
      fuelType: formFuelType,
      quantity: formQuantity,
      unitPrice,
      totalCost: formQuantity * unitPrice,
      deliveryDate: formDeliveryDate,
      deliveryTime: formDeliveryTime,
      location: formLocation,
      specialInstructions: formInstructions,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    resetForm();
    setReorderDialog(false);
    setReorderData(null);
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // ─── Summary Cards ───────────────────────────────────────────────────────

  const summaryCards = [
    {
      title: 'Active Orders',
      value: String(activeOrders),
      icon: ShoppingCart,
      accent: 'text-amber-400',
      bgAccent: 'bg-amber-500/10',
      borderAccent: 'border-amber-500/20',
    },
    {
      title: 'Pending Deliveries',
      value: String(pendingDeliveries),
      icon: Timer,
      accent: 'text-blue-400',
      bgAccent: 'bg-blue-500/10',
      borderAccent: 'border-blue-500/20',
    },
    {
      title: 'Total Volume Ordered',
      value: `${totalVolume.toLocaleString()} L`,
      icon: Fuel,
      accent: 'text-green-400',
      bgAccent: 'bg-green-500/10',
      borderAccent: 'border-green-500/20',
    },
    {
      title: 'Orders This Month',
      value: String(ordersThisMonth),
      icon: TrendingUp,
      accent: 'text-purple-400',
      bgAccent: 'bg-purple-500/10',
      borderAccent: 'border-purple-500/20',
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="size-5 text-amber-400" />
            Fuel Order & Delivery Request
          </h2>
          <p className="text-xs text-slate-400">Place fuel orders, track deliveries, and manage supplier requests</p>
        </div>
        <Button
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card
            key={card.title}
            className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm hover:border-amber-500/30 transition-colors"
          >
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">{card.title}</div>
                  <div className={`text-xl font-bold mt-1 ${card.accent}`}>{card.value}</div>
                </div>
                <div className={`p-2.5 rounded-xl ${card.bgAccent} border ${card.borderAccent}`}>
                  <card.icon className={`size-5 ${card.accent}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Active Orders with Status Stepper ────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm hover:border-amber-500/30 transition-colors">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Navigation className="size-4 text-amber-400" />
            Active Orders
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Track the status of your current fuel orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.filter((o) => o.status !== 'cancelled' && o.status !== 'delivered').length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No active orders</div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {orders
                .filter((o) => o.status !== 'cancelled' && o.status !== 'delivered')
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4 hover:border-amber-500/20 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <Fuel className="size-4 text-amber-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {order.orderId}
                            <Badge className={`ml-2 ${statusConfig[order.status].bgColor} ${statusConfig[order.status].color} text-[10px] px-1.5 py-0 border`}>
                              {statusConfig[order.status].label}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {order.supplier} · {order.fuelType} · {order.quantity.toLocaleString()} L · {formatKsh(order.totalCost)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.status !== 'delivered' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10 h-7"
                            onClick={() => handleAdvanceStatus(order.id)}
                          >
                            Advance <ChevronRight className="size-3 ml-1" />
                          </Button>
                        )}
                        {order.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-slate-400 hover:text-white hover:bg-slate-600/50 h-7"
                          onClick={() => setDetailOrder(order)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                    {/* Status Stepper */}
                    <div className="pl-1 overflow-x-auto">
                      <StatusStepper status={order.status} />
                    </div>
                    {/* Delivery info row */}
                    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-600/30">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays className="size-3" />
                        {order.deliveryDate} at {order.deliveryTime}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="size-3" />
                        {order.location}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white backdrop-blur-sm hover:border-amber-500/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="size-4 text-amber-400" />
              Order History
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as OrderStatus | 'all')}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-200">All Status</SelectItem>
                  <SelectItem value="pending" className="text-slate-200">Pending</SelectItem>
                  <SelectItem value="confirmed" className="text-slate-200">Confirmed</SelectItem>
                  <SelectItem value="in-transit" className="text-slate-200">In Transit</SelectItem>
                  <SelectItem value="delivered" className="text-slate-200">Delivered</SelectItem>
                  <SelectItem value="cancelled" className="text-slate-200">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-200">All Suppliers</SelectItem>
                  {SUPPLIERS.map((s) => (
                    <SelectItem key={s} value={s} className="text-slate-200">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterFuelType} onValueChange={setFilterFuelType}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-200">All Types</SelectItem>
                  {FUEL_TYPES.map((ft) => (
                    <SelectItem key={ft} value={ft} className="text-slate-200">{ft}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No orders match the selected filters</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Order ID</TableHead>
                    <TableHead className="text-slate-400 text-xs">Supplier</TableHead>
                    <TableHead className="text-slate-400 text-xs">Fuel Type</TableHead>
                    <TableHead className="text-slate-400 text-xs">Quantity</TableHead>
                    <TableHead className="text-slate-400 text-xs">Total Cost</TableHead>
                    <TableHead className="text-slate-400 text-xs">Delivery</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const sc = statusConfig[order.status];
                    return (
                      <TableRow key={order.id} className="border-slate-700/50">
                        <TableCell className="text-slate-300 text-xs font-mono">{order.orderId}</TableCell>
                        <TableCell className="text-slate-300 text-xs">{order.supplier}</TableCell>
                        <TableCell className="text-xs">
                          <Badge
                            className={`${
                              order.fuelType === 'PMS'
                                ? 'bg-green-500/10 text-green-400'
                                : order.fuelType === 'AGO'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-blue-500/10 text-blue-400'
                            } text-[10px] px-1.5 py-0 border-0`}
                          >
                            {order.fuelType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-xs">{order.quantity.toLocaleString()} L</TableCell>
                        <TableCell className="text-white text-xs font-semibold">{formatKsh(order.totalCost)}</TableCell>
                        <TableCell className="text-slate-400 text-xs">
                          <div>{order.deliveryDate}</div>
                          <div className="text-[10px] text-slate-500">{order.deliveryTime}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${sc.bgColor} ${sc.color} text-[10px] px-1.5 py-0 border`}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                              onClick={() => setDetailOrder(order)}
                              title="View Details"
                            >
                              <FileText className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                              onClick={() => handleQuickReorder(order)}
                              title="Quick Reorder"
                            >
                              <RotateCcw className="size-3.5" />
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

      {/* ── New Order Dialog ────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="size-5 text-amber-400" />
              Place New Fuel Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Supplier *</Label>
                <Select value={formSupplier} onValueChange={setFormSupplier}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {SUPPLIERS.map((s) => (
                      <SelectItem key={s} value={s} className="text-slate-200">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Fuel Type *</Label>
                <Select value={formFuelType} onValueChange={setFormFuelType}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {FUEL_TYPES.map((ft) => (
                      <SelectItem key={ft} value={ft} className="text-slate-200">{ft}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Quantity (Litres) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formQuantity || ''}
                  onChange={(e) => setFormQuantity(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">
                  Unit Price (Ksh/L)
                  <span className="text-amber-400 ml-1">auto</span>
                </Label>
                <Input
                  type="text"
                  value={FUEL_PRICES[formFuelType]?.toFixed(2) ?? '0.00'}
                  readOnly
                  className="bg-slate-700/30 border-slate-600 text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Delivery Date *</Label>
                <Input
                  type="date"
                  value={formDeliveryDate}
                  onChange={(e) => setFormDeliveryDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Delivery Time</Label>
                <Input
                  type="time"
                  value={formDeliveryTime}
                  onChange={(e) => setFormDeliveryTime(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Delivery Location *</Label>
              <Input
                placeholder="e.g. Main Station - Mombasa Road"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Special Instructions</Label>
              <Textarea
                placeholder="Any special delivery instructions..."
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                className={`${inputClass} min-h-[70px] resize-none`}
                rows={2}
              />
            </div>
            {/* Estimated cost preview */}
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Estimated Cost</div>
                  <div className="text-2xl font-bold text-amber-400">{formatKsh(estimatedCost)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">
                    {formQuantity.toLocaleString()} L × Ksh {FUEL_PRICES[formFuelType]?.toFixed(2) ?? '0.00'}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1">Based on current EPRA prices</div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePlaceOrder}
                disabled={!formSupplier || formQuantity <= 0 || !formDeliveryDate || !formLocation}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Truck className="size-4 mr-2" />
                Place Order
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quick Reorder Dialog ────────────────────────────────────────────── */}
      <Dialog open={reorderDialog} onOpenChange={setReorderDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RotateCcw className="size-5 text-green-400" />
              Quick Reorder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Previous order reference */}
            {reorderData && (
              <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                <div className="text-xs text-slate-400 mb-1">Based on order</div>
                <div className="text-sm font-semibold text-white">
                  {reorderData.orderId} — {reorderData.supplier}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {reorderData.fuelType} · {reorderData.quantity.toLocaleString()} L · {formatKsh(reorderData.totalCost)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Supplier</Label>
                <Select value={formSupplier} onValueChange={setFormSupplier}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {SUPPLIERS.map((s) => (
                      <SelectItem key={s} value={s} className="text-slate-200">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Fuel Type</Label>
                <Select value={formFuelType} onValueChange={setFormFuelType}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {FUEL_TYPES.map((ft) => (
                      <SelectItem key={ft} value={ft} className="text-slate-200">{ft}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Quantity (Litres)</Label>
                <Input
                  type="number"
                  value={formQuantity || ''}
                  onChange={(e) => setFormQuantity(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">New Delivery Date *</Label>
                <Input
                  type="date"
                  value={formDeliveryDate}
                  onChange={(e) => setFormDeliveryDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Delivery Location</Label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className={inputClass}
              />
            </div>
            {/* Estimated cost */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <div className="text-xs text-green-400">Estimated Cost</div>
              <div className="text-xl font-bold text-green-300">{formatKsh(estimatedCost)}</div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={() => {
                  setReorderDialog(false);
                  setReorderData(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReorderSubmit}
                disabled={!formDeliveryDate || formQuantity <= 0}
                className="bg-green-500 hover:bg-green-600 text-black font-semibold"
              >
                <RotateCcw className="size-4 mr-2" />
                Confirm Reorder
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Order Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="size-5 text-amber-400" />
              Order Details — {detailOrder?.orderId}
            </DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4 mt-2">
              {/* Status stepper */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider">Order Status</div>
                <StatusStepper status={detailOrder.status} />
              </div>

              {/* Order info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Supplier</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{detailOrder.supplier}</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Fuel Type</div>
                  <div className="mt-0.5">
                    <Badge
                      className={`${
                        detailOrder.fuelType === 'PMS'
                          ? 'bg-green-500/10 text-green-400'
                          : detailOrder.fuelType === 'AGO'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-blue-500/10 text-blue-400'
                      } text-xs px-2 py-0.5 border-0`}
                    >
                      {detailOrder.fuelType}
                    </Badge>
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Quantity</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{detailOrder.quantity.toLocaleString()} L</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Unit Price</div>
                  <div className="text-sm font-semibold text-white mt-0.5">Ksh {detailOrder.unitPrice.toFixed(2)}</div>
                </div>
              </div>

              {/* Total cost */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-amber-400 uppercase tracking-wider">Total Cost</div>
                  <div className="text-xl font-bold text-amber-300">{formatKsh(detailOrder.totalCost)}</div>
                </div>
              </div>

              {/* Delivery details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CalendarDays className="size-3.5 text-slate-500" />
                  Delivery: {detailOrder.deliveryDate} at {detailOrder.deliveryTime}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <MapPin className="size-3.5 text-slate-500" />
                  {detailOrder.location}
                </div>
                {detailOrder.specialInstructions && (
                  <div className="flex items-start gap-2 text-xs text-slate-300">
                    <AlertTriangle className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
                    {detailOrder.specialInstructions}
                  </div>
                )}
              </div>

              {/* Created at */}
              <div className="text-[10px] text-slate-600 text-right">
                Created: {new Date(detailOrder.createdAt).toLocaleString()}
              </div>

              <DialogFooter className="gap-2">
                {detailOrder.status !== 'delivered' && detailOrder.status !== 'cancelled' && (
                  <Button
                    onClick={() => {
                      handleAdvanceStatus(detailOrder.id);
                      setDetailOrder(null);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  >
                    <ChevronRight className="size-4 mr-2" />
                    Advance Status
                  </Button>
                )}
                {detailOrder.status === 'pending' && (
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => {
                      handleCancelOrder(detailOrder.id);
                      setDetailOrder(null);
                    }}
                  >
                    <XCircle className="size-4 mr-2" />
                    Cancel Order
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
