'use client';

import { useMemo, useState } from 'react';
import {
  Truck,
  Car,
  Bike,
  Bus,
  Fuel,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  Calendar,
  Gauge,
  DollarSign,
  Award,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useFuelStore } from '@/store/fuel-store';

// ─── Types ────────────────────────────────────────────────────────────────

type VehicleType = 'Saloon' | 'SUV' | 'Truck' | 'Motorcycle' | 'Bus';
type FuelKind = 'PMS' | 'AGO';

interface Vehicle {
  id: string;
  registration: string;
  makeModel: string;
  type: VehicleType;
  fuelType: FuelKind;
  tankCapacity: number; // litres
  mileage: number; // km
  fuelEfficiency: number; // km/L
  efficiencyTrend: 'up' | 'down' | 'stable';
  nextServiceDate: string;
  nextServiceKm: number;
  monthlyFuelCost: number; // Ksh
  status: 'active' | 'maintenance';
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getTypeIcon(type: VehicleType) {
  switch (type) {
    case 'Saloon': return Car;
    case 'SUV': return Car;
    case 'Truck': return Truck;
    case 'Motorcycle': return Bike;
    case 'Bus': return Bus;
  }
}

function getTypeColor(type: VehicleType) {
  switch (type) {
    case 'Saloon': return { bg: 'bg-blue-500/20', text: 'text-blue-400' };
    case 'SUV': return { bg: 'bg-amber-500/20', text: 'text-amber-400' };
    case 'Truck': return { bg: 'bg-red-500/20', text: 'text-red-400' };
    case 'Motorcycle': return { bg: 'bg-green-500/20', text: 'text-green-400' };
    case 'Bus': return { bg: 'bg-purple-500/20', text: 'text-purple-400' };
  }
}

// ─── Mock Data ────────────────────────────────────────────────────────────

const initialVehicles: Vehicle[] = [
  {
    id: '1',
    registration: 'KBA 234J',
    makeModel: 'Toyota Corolla',
    type: 'Saloon',
    fuelType: 'PMS',
    tankCapacity: 50,
    mileage: 45230,
    fuelEfficiency: 14.2,
    efficiencyTrend: 'up',
    nextServiceDate: '2026-03-20',
    nextServiceKm: 50000,
    monthlyFuelCost: 28500,
    status: 'active',
  },
  {
    id: '2',
    registration: 'KBB 567K',
    makeModel: 'Nissan X-Trail',
    type: 'SUV',
    fuelType: 'PMS',
    tankCapacity: 65,
    mileage: 38100,
    fuelEfficiency: 10.5,
    efficiencyTrend: 'stable',
    nextServiceDate: '2026-04-05',
    nextServiceKm: 40000,
    monthlyFuelCost: 35200,
    status: 'active',
  },
  {
    id: '3',
    registration: 'KBC 890L',
    makeModel: 'Isuzu NQR',
    type: 'Truck',
    fuelType: 'AGO',
    tankCapacity: 100,
    mileage: 78500,
    fuelEfficiency: 6.8,
    efficiencyTrend: 'down',
    nextServiceDate: '2026-03-10',
    nextServiceKm: 80000,
    monthlyFuelCost: 62300,
    status: 'active',
  },
  {
    id: '4',
    registration: 'KBA 123M',
    makeModel: 'Honda CB125',
    type: 'Motorcycle',
    fuelType: 'PMS',
    tankCapacity: 12,
    mileage: 12300,
    fuelEfficiency: 45.0,
    efficiencyTrend: 'up',
    nextServiceDate: '2026-05-15',
    nextServiceKm: 15000,
    monthlyFuelCost: 8400,
    status: 'active',
  },
  {
    id: '5',
    registration: 'KBB 456N',
    makeModel: 'Toyota Hiace',
    type: 'Bus',
    fuelType: 'AGO',
    tankCapacity: 80,
    mileage: 92000,
    fuelEfficiency: 8.5,
    efficiencyTrend: 'stable',
    nextServiceDate: '2026-03-25',
    nextServiceKm: 95000,
    monthlyFuelCost: 48700,
    status: 'active',
  },
  {
    id: '6',
    registration: 'KBC 789P',
    makeModel: 'Mazda Demio',
    type: 'Saloon',
    fuelType: 'PMS',
    tankCapacity: 42,
    mileage: 29800,
    fuelEfficiency: 16.8,
    efficiencyTrend: 'up',
    nextServiceDate: '2026-06-01',
    nextServiceKm: 30000,
    monthlyFuelCost: 19800,
    status: 'active',
  },
  {
    id: '7',
    registration: 'KBA 345Q',
    makeModel: 'Mitsubishi Canter',
    type: 'Truck',
    fuelType: 'AGO',
    tankCapacity: 120,
    mileage: 105000,
    fuelEfficiency: 5.2,
    efficiencyTrend: 'down',
    nextServiceDate: '2026-03-12',
    nextServiceKm: 110000,
    monthlyFuelCost: 78500,
    status: 'maintenance',
  },
  {
    id: '8',
    registration: 'KBB 678R',
    makeModel: 'Suzuki Alto',
    type: 'Saloon',
    fuelType: 'PMS',
    tankCapacity: 35,
    mileage: 18200,
    fuelEfficiency: 20.1,
    efficiencyTrend: 'stable',
    nextServiceDate: '2026-04-20',
    nextServiceKm: 20000,
    monthlyFuelCost: 14200,
    status: 'active',
  },
];

// ─── Chart configs ────────────────────────────────────────────────────────

const consumptionConfig: ChartConfig = {
  consumption: { label: 'Fuel (L)', color: '#f59e0b' },
};

const distributionColors = ['#3b82f6', '#f59e0b', '#ef4444', '#22c55e', '#a855f7'];

// ─── Component ────────────────────────────────────────────────────────────

export function FleetManager() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);

  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Add vehicle form
  const [formReg, setFormReg] = useState('');
  const [formMakeModel, setFormMakeModel] = useState('');
  const [formType, setFormType] = useState<VehicleType>('Saloon');
  const [formFuelType, setFormFuelType] = useState<FuelKind>('PMS');
  const [formTankCapacity, setFormTankCapacity] = useState('');
  const [formMileage, setFormMileage] = useState('');

  // ─── Summary stats ──────────────────────────────────────────────────

  const summaryStats = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.status === 'active').length;
    const inMaintenance = vehicles.filter((v) => v.status === 'maintenance').length;
    const avgEfficiency = vehicles.reduce((s, v) => s + v.fuelEfficiency, 0) / (total || 1);
    return { total, active, inMaintenance, avgEfficiency };
  }, [vehicles]);

  // ─── Fuel consumption chart data (7 days mock) ─────────────────────

  const consumptionData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day) => {
      const entry: Record<string, string | number> = { day };
      vehicles.forEach((v) => {
        entry[v.registration] = Math.round(Math.random() * (v.tankCapacity * 0.3) + v.tankCapacity * 0.05);
      });
      return entry;
    });
  }, [vehicles]);

  const consumptionChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    vehicles.forEach((v, i) => {
      config[v.registration] = {
        label: `${v.registration} (${v.makeModel})`,
        color: distributionColors[i % distributionColors.length],
      };
    });
    return config;
  }, [vehicles]);

  // ─── Type distribution ──────────────────────────────────────────────

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicles.forEach((v) => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vehicles]);

  const typeDistributionConfig = useMemo(() => {
    const config: ChartConfig = {};
    typeDistribution.forEach((d, i) => {
      config[d.name] = {
        label: d.name,
        color: distributionColors[i % distributionColors.length],
      };
    });
    return config;
  }, [typeDistribution]);

  // ─── Efficiency leaderboard ─────────────────────────────────────────

  const efficiencyLeaderboard = useMemo(
    () => [...vehicles].sort((a, b) => b.fuelEfficiency - a.fuelEfficiency),
    [vehicles]
  );

  // ─── Upcoming services ──────────────────────────────────────────────

  const upcomingServices = useMemo(
    () =>
      [...vehicles]
        .sort((a, b) => new Date(a.nextServiceDate).getTime() - new Date(b.nextServiceDate).getTime())
        .slice(0, 5),
    [vehicles]
  );

  // ─── Form handlers ──────────────────────────────────────────────────

  const resetForm = () => {
    setFormReg('');
    setFormMakeModel('');
    setFormType('Saloon');
    setFormFuelType('PMS');
    setFormTankCapacity('');
    setFormMileage('');
  };

  const handleAddVehicle = () => {
    if (!formReg || !formMakeModel || !formTankCapacity || !formMileage) return;

    const newVehicle: Vehicle = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      registration: formReg,
      makeModel: formMakeModel,
      type: formType,
      fuelType: formFuelType,
      tankCapacity: parseInt(formTankCapacity) || 50,
      mileage: parseInt(formMileage) || 0,
      fuelEfficiency: formType === 'Motorcycle' ? 40 : formType === 'Saloon' ? 15 : formType === 'SUV' ? 10 : formType === 'Bus' ? 8 : 6,
      efficiencyTrend: 'stable',
      nextServiceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      nextServiceKm: (parseInt(formMileage) || 0) + 5000,
      monthlyFuelCost: formType === 'Motorcycle' ? 8000 : formType === 'Saloon' ? 20000 : formType === 'SUV' ? 35000 : formType === 'Bus' ? 48000 : 65000,
      status: 'active',
    };

    setVehicles((prev) => [...prev, newVehicle]);
    resetForm();
    setShowAddDialog(false);
  };

  const handleEditVehicle = () => {
    if (!editingVehicle || !formReg || !formMakeModel) return;

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === editingVehicle.id
          ? {
              ...v,
              registration: formReg,
              makeModel: formMakeModel,
              type: formType,
              fuelType: formFuelType,
              tankCapacity: parseInt(formTankCapacity) || v.tankCapacity,
              mileage: parseInt(formMileage) || v.mileage,
            }
          : v
      )
    );
    resetForm();
    setEditingVehicle(null);
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setFormReg(vehicle.registration);
    setFormMakeModel(vehicle.makeModel);
    setFormType(vehicle.type);
    setFormFuelType(vehicle.fuelType);
    setFormTankCapacity(vehicle.tankCapacity.toString());
    setFormMileage(vehicle.mileage.toString());
    setEditingVehicle(vehicle);
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Fleet Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Truck className="size-4 text-amber-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Total Vehicles</span>
            </div>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Car className="size-4 text-green-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Active</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{summaryStats.active}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Wrench className="size-4 text-red-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">In Maintenance</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{summaryStats.inMaintenance}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Gauge className="size-4 text-blue-400" />
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Efficiency</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{summaryStats.avgEfficiency.toFixed(1)} <span className="text-sm font-normal text-slate-400">km/L</span></div>
          </CardContent>
        </Card>
      </div>

      {/* ── Add Vehicle Button ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Vehicle Fleet</h2>
        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black text-xs">
              <Plus className="size-3.5 mr-1.5" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="size-4 text-amber-400" />
                Add New Vehicle
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Registration Number</Label>
                <Input
                  placeholder="e.g. KBA 123J"
                  value={formReg}
                  onChange={(e) => setFormReg(e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Make / Model</Label>
                <Input
                  placeholder="e.g. Toyota Corolla"
                  value={formMakeModel}
                  onChange={(e) => setFormMakeModel(e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Vehicle Type</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as VehicleType)}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="Saloon">Saloon</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="Truck">Truck</SelectItem>
                      <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                      <SelectItem value="Bus">Bus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Fuel Type</Label>
                  <Select value={formFuelType} onValueChange={(v) => setFormFuelType(v as FuelKind)}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="PMS">PMS / Super</SelectItem>
                      <SelectItem value="AGO">AGO / Diesel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Tank Capacity (L)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    value={formTankCapacity}
                    onChange={(e) => setFormTankCapacity(e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Current Mileage (km)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 25000"
                    value={formMileage}
                    onChange={(e) => setFormMileage(e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddVehicle}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
                disabled={!formReg || !formMakeModel || !formTankCapacity || !formMileage}
              >
                <Plus className="size-3.5 mr-1.5" />
                Add Vehicle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Vehicle Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vehicles.map((vehicle) => {
          const IconComp = getTypeIcon(vehicle.type);
          const colors = getTypeColor(vehicle.type);
          const serviceKmLeft = vehicle.nextServiceKm - vehicle.mileage;
          const serviceDaysLeft = Math.max(0, Math.ceil(
            (new Date(vehicle.nextServiceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ));

          return (
            <Card key={vehicle.id} className="bg-slate-800/60 border-slate-700/50 text-white hover:border-amber-500/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Vehicle icon placeholder */}
                  <div className={`size-12 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                    <IconComp className={`size-6 ${colors.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name + badges */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate">{vehicle.registration}</h3>
                      <Badge className={`text-[10px] ${colors.bg} ${colors.text}`}>
                        {vehicle.type}
                      </Badge>
                      <Badge className={`text-[10px] ${vehicle.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {vehicle.status === 'active' ? 'Active' : 'Maintenance'}
                      </Badge>
                    </div>

                    {/* Make/model */}
                    <p className="text-xs text-slate-400 mb-2">{vehicle.makeModel}</p>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Mileage</div>
                        <div className="text-xs font-semibold">{vehicle.mileage.toLocaleString()} km</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Fuel Type</div>
                        <div className="text-xs font-semibold flex items-center gap-1">
                          <Fuel className={`size-3 ${vehicle.fuelType === 'PMS' ? 'text-green-400' : 'text-amber-400'}`} />
                          {vehicle.fuelType}
                        </div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Tank Capacity</div>
                        <div className="text-xs font-semibold">{vehicle.tankCapacity} L</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="text-[10px] text-slate-500 uppercase">Efficiency</div>
                        <div className="text-xs font-semibold flex items-center gap-1">
                          {vehicle.fuelEfficiency} km/L
                          {vehicle.efficiencyTrend === 'up' && <TrendingUp className="size-3 text-green-400" />}
                          {vehicle.efficiencyTrend === 'down' && <TrendingDown className="size-3 text-red-400" />}
                          {vehicle.efficiencyTrend === 'stable' && <Minus className="size-3 text-slate-400" />}
                        </div>
                      </div>
                    </div>

                    {/* Next service indicator */}
                    <div className={`flex items-center gap-1.5 text-xs mb-2 ${serviceDaysLeft <= 7 || serviceKmLeft <= 1000 ? 'text-red-400' : 'text-slate-400'}`}>
                      <Wrench className="size-3" />
                      <span>Service in {serviceDaysLeft} days / {serviceKmLeft.toLocaleString()} km</span>
                      {(serviceDaysLeft <= 7 || serviceKmLeft <= 1000) && (
                        <Badge className="text-[9px] bg-red-500/20 text-red-400 ml-1">Due Soon</Badge>
                      )}
                    </div>

                    {/* Monthly fuel cost */}
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-3">
                      <DollarSign className="size-3" />
                      <span className="font-semibold">{formatKsh(vehicle.monthlyFuelCost)}</span>
                      <span className="text-slate-500">this month</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(vehicle)}
                        className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-xs h-7"
                      >
                        <Pencil className="size-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="border-red-600/30 text-red-400 hover:bg-red-500/10 text-xs h-7"
                      >
                        <Trash2 className="size-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Edit Vehicle Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!editingVehicle} onOpenChange={(open) => { if (!open) { setEditingVehicle(null); resetForm(); } }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-amber-400" />
              Edit Vehicle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Registration Number</Label>
              <Input
                value={formReg}
                onChange={(e) => setFormReg(e.target.value)}
                className="bg-slate-700/50 border-slate-600/50 text-white text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Make / Model</Label>
              <Input
                value={formMakeModel}
                onChange={(e) => setFormMakeModel(e.target.value)}
                className="bg-slate-700/50 border-slate-600/50 text-white text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Vehicle Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as VehicleType)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Saloon">Saloon</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="Bus">Bus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Fuel Type</Label>
                <Select value={formFuelType} onValueChange={(v) => setFormFuelType(v as FuelKind)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="PMS">PMS / Super</SelectItem>
                    <SelectItem value="AGO">AGO / Diesel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Tank Capacity (L)</Label>
                <Input
                  type="number"
                  value={formTankCapacity}
                  onChange={(e) => setFormTankCapacity(e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Current Mileage (km)</Label>
                <Input
                  type="number"
                  value={formMileage}
                  onChange={(e) => setFormMileage(e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-white text-xs"
                />
              </div>
            </div>
            <Button
              onClick={handleEditVehicle}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
              disabled={!formReg || !formMakeModel}
            >
              <Pencil className="size-3.5 mr-1.5" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fuel Consumption BarChart */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Fuel className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Fuel Consumption (7 Days)</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Litres consumed per vehicle</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={consumptionChartConfig} className="h-[260px] w-full">
              <BarChart data={consumptionData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v: number) => `${v}L`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {vehicles.slice(0, 4).map((v, i) => (
                  <Bar
                    key={v.id}
                    dataKey={v.registration}
                    fill={distributionColors[i % distributionColors.length]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Type Distribution PieChart */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Vehicle Type Distribution</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Breakdown of fleet by vehicle type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={typeDistributionConfig} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {typeDistribution.map((_entry, i) => (
                    <Cell key={`cell-${i}`} fill={distributionColors[i % distributionColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row: Maintenance + Leaderboard ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Maintenance Schedule */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wrench className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Upcoming Service Schedule</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Next maintenance reminders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {upcomingServices.map((vehicle, i) => {
                const serviceDaysLeft = Math.max(0, Math.ceil(
                  (new Date(vehicle.nextServiceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                ));
                const isUrgent = serviceDaysLeft <= 7;

                return (
                  <div key={vehicle.id} className={`bg-slate-700/30 rounded-xl p-3 ${isUrgent ? 'border border-red-500/30' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isUrgent ? 'bg-red-500/20 text-red-400' : 'bg-slate-600/50 text-slate-400'
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{vehicle.registration}</div>
                          <div className="text-[10px] text-slate-500">{vehicle.makeModel}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="size-3 text-slate-400" />
                          <span className={isUrgent ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                            {vehicle.nextServiceDate}
                          </span>
                        </div>
                        <div className={`text-[10px] ${isUrgent ? 'text-red-400' : 'text-slate-500'}`}>
                          {serviceDaysLeft === 0 ? 'Due today!' : `${serviceDaysLeft} days left`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Fuel Efficiency Leaderboard */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Fuel Efficiency Leaderboard</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Vehicles ranked by km/L</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {efficiencyLeaderboard.map((vehicle, i) => {
                const colors = getTypeColor(vehicle.type);
                const IconComp = getTypeIcon(vehicle.type);

                return (
                  <div key={vehicle.id} className="bg-slate-700/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          i === 0 ? 'bg-amber-500/20 text-amber-400' :
                          i === 1 ? 'bg-slate-400/20 text-slate-300' :
                          i === 2 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-slate-600/50 text-slate-400'
                        }`}>
                          {i + 1}
                        </div>
                        <div className={`size-7 rounded-lg ${colors.bg} flex items-center justify-center`}>
                          <IconComp className={`size-3.5 ${colors.text}`} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{vehicle.registration}</div>
                          <div className="text-[10px] text-slate-500">{vehicle.makeModel}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold flex items-center gap-1">
                          {vehicle.fuelEfficiency} km/L
                          {vehicle.efficiencyTrend === 'up' && <TrendingUp className="size-3 text-green-400" />}
                          {vehicle.efficiencyTrend === 'down' && <TrendingDown className="size-3 text-red-400" />}
                          {vehicle.efficiencyTrend === 'stable' && <Minus className="size-3 text-slate-400" />}
                        </div>
                        <div className="text-[10px] text-slate-500">{vehicle.fuelType} · {vehicle.type}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
