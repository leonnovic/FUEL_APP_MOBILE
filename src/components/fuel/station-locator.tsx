'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Navigation,
  Fuel,
  Search,
  Filter,
  Heart,
  X,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useFuelStore } from '@/store/fuel-store';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────

interface FuelStation {
  id: string;
  name: string;
  distance: number;
  address: string;
  fuelTypes: { type: string; price: number; available: boolean }[];
  isOpen: boolean;
  operatingHours: string;
  rating: number;
  amenities: string[];
  phone: string;
  coordinates: { x: number; y: number };
  driveTime: string;
  isFavorite: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────

const amenityOptions = ['ATM', 'Car Wash', 'Restroom', 'Shop', 'Air'];
const fuelFilterOptions = ['PMS', 'AGO', 'DPK'];

// ─── Component ────────────────────────────────────────────────────────────

export function StationLocator() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);
  const addStation = useStationStore((s) => s.addStation);
  const setStations = useStationStore((s) => s.setStations);

  const [stations, setLocalStations] = useState<FuelStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFuelType, setFilterFuelType] = useState<string>('all');
  const [filterAmenity, setFilterAmenity] = useState<string>('all');
  const [filterDistance, setFilterDistance] = useState<string>('all');
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Add station form
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCountry, setFormCountry] = useState('Kenya');

  // ─── Fetch stations from API ────────────────────────────────────────────

  const fetchStations = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (data.data && Array.isArray(data.data)) {
        // Convert API stations to FuelStation format
        const mapped: FuelStation[] = data.data.map((s: Record<string, unknown>, idx: number) => {
          const stationFuelTypes: { type: string; price: number; available: boolean }[] = [];
          // Try to use real fuel type data from store
          if (pmsPrice > 0) {
            stationFuelTypes.push({ type: 'PMS', price: pmsPrice, available: true });
          }
          if (agoPrice > 0) {
            stationFuelTypes.push({ type: 'AGO', price: agoPrice, available: true });
          }
          // Default if no prices set
          if (stationFuelTypes.length === 0) {
            stationFuelTypes.push({ type: 'PMS', price: 195.5, available: true });
            stationFuelTypes.push({ type: 'AGO', price: 180.2, available: true });
          }

          // Generate random-ish coordinates around Nairobi center
          const x = 30 + (idx * 7) % 60;
          const y = 15 + (idx * 11) % 70;

          return {
            id: s.id as string || String(idx),
            name: (s.name as string) || 'Unnamed Station',
            distance: ((idx + 1) * 1.3) % 10,
            address: (s.location as string) || 'Nairobi, Kenya',
            fuelTypes: stationFuelTypes,
            isOpen: true,
            operatingHours: '06:00 - 22:00',
            rating: 4.0,
            amenities: ['ATM', 'Shop'],
            phone: '+254 700 000 000',
            coordinates: { x, y },
            driveTime: `${Math.ceil(((idx + 1) * 1.3) % 10)} min`,
            isFavorite: false,
          };
        });

        setLocalStations(mapped);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stations');
    } finally {
      setIsLoading(false);
    }
  }, [token, pmsPrice, agoPrice]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Toggle favorite
  const toggleFavorite = (stationId: string) => {
    setLocalStations((prev) =>
      prev.map((s) =>
        s.id === stationId ? { ...s, isFavorite: !s.isFavorite } : s
      )
    );
  };

  // ─── Add station via API ─────────────────────────────────────────────

  const handleAddStation = async () => {
    if (!formName || !formLocation || !token) return;

    try {
      const res = await fetch('/api/stations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName,
          location: formLocation,
          country: formCountry,
          currency: 'KSH',
        }),
      });

      const data = await res.json();

      if (data.data) {
        toast({ title: 'Station Created', description: `${formName} has been added` });
        setFormName('');
        setFormLocation('');
        setShowAddDialog(false);
        // Refresh stations
        fetchStations();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create station', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create station', variant: 'destructive' });
    }
  };

  // Filtered stations
  const filteredStations = useMemo(() => {
    let result = [...stations];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.fuelTypes.some((f) => f.type.toLowerCase().includes(q))
      );
    }

    if (filterFuelType !== 'all') {
      result = result.filter((s) =>
        s.fuelTypes.some((f) => f.type === filterFuelType && f.available)
      );
    }

    if (filterAmenity !== 'all') {
      result = result.filter((s) => s.amenities.includes(filterAmenity));
    }

    if (filterDistance !== 'all') {
      const maxDist = parseInt(filterDistance);
      result = result.filter((s) => s.distance <= maxDist);
    }

    if (filterOpenNow) {
      result = result.filter((s) => s.isOpen);
    }

    return result;
  }, [stations, searchQuery, filterFuelType, filterAmenity, filterDistance, filterOpenNow]);

  const nearbyStations = useMemo(
    () => [...stations].sort((a, b) => a.distance - b.distance).slice(0, 5),
    [stations]
  );

  const activeFilterCount = [
    filterFuelType !== 'all' ? 1 : 0,
    filterAmenity !== 'all' ? 1 : 0,
    filterDistance !== 'all' ? 1 : 0,
    filterOpenNow ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // ─── Loading state ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="size-8 text-amber-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading stations...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-8 text-center">
            <AlertCircle className="size-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-slate-300 mb-1">Failed to load stations</p>
            <p className="text-xs text-slate-500 mb-4">{error}</p>
            <Button onClick={fetchStations} className="bg-amber-500 hover:bg-amber-600 text-black text-xs">
              <RefreshCw className="size-3.5 mr-1.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header + Search ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search by name, location, or fuel type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 relative"
        >
          <Filter className="size-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1.5 size-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <Button
          className="bg-amber-500 hover:bg-amber-600 text-black text-xs"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="size-3.5 mr-1.5" />
          Add Station
        </Button>
      </div>

      {/* ── Filter Sidebar ─────────────────────────────────────────────── */}
      {showFilters && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Filter className="size-4 text-amber-400" />
                Filters
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterFuelType('all');
                  setFilterAmenity('all');
                  setFilterDistance('all');
                  setFilterOpenNow(false);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                Clear All
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Fuel Type</Label>
                <Select value={filterFuelType} onValueChange={setFilterFuelType}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Fuel Types</SelectItem>
                    {fuelFilterOptions.map((ft) => (
                      <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Amenities</Label>
                <Select value={filterAmenity} onValueChange={setFilterAmenity}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Amenities</SelectItem>
                    {amenityOptions.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Distance Range</Label>
                <Select value={filterDistance} onValueChange={setFilterDistance}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">Any Distance</SelectItem>
                    <SelectItem value="3">Within 3 km</SelectItem>
                    <SelectItem value="5">Within 5 km</SelectItem>
                    <SelectItem value="10">Within 10 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Status</Label>
                <Button
                  variant={filterOpenNow ? 'default' : 'outline'}
                  onClick={() => setFilterOpenNow(!filterOpenNow)}
                  className={`w-full text-xs ${
                    filterOpenNow
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <Clock className="size-3.5 mr-1.5" />
                  {filterOpenNow ? 'Open Now Only' : 'All Stations'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {stations.length === 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mx-auto mb-4">
              <MapPin className="size-8 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 mb-1">No stations found</h3>
            <p className="text-xs text-slate-500 mb-4">You haven&apos;t added any stations yet. Create your first station to get started.</p>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-black text-xs"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="size-3.5 mr-1.5" />
              Add Your First Station
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Map + Station List Row ─────────────────────────────────────── */}
      {stations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map Placeholder */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:row-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-amber-400" />
                <div>
                  <CardTitle className="text-sm font-semibold">Station Map</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Your fuel stations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-[360px] rounded-xl bg-slate-900/80 border border-slate-700/30 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((x) => (
                    <line key={`v-${x}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                  ))}
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => (
                    <line key={`h-${y}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                  ))}
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#475569" strokeWidth="1.5" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#475569" strokeWidth="1.5" />
                  {filteredStations.map((station) => (
                    <g key={station.id}>
                      <circle
                        cx={`${station.coordinates.x}%`}
                        cy={`${station.coordinates.y}%`}
                        r="6"
                        fill={station.isOpen ? '#f59e0b' : '#64748b'}
                        stroke={station.isOpen ? '#fbbf24' : '#475569'}
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onClick={() => setSelectedStation(station)}
                      />
                      <circle
                        cx={`${station.coordinates.x}%`}
                        cy={`${station.coordinates.y}%`}
                        r="12"
                        fill="transparent"
                        className="cursor-pointer"
                        onClick={() => setSelectedStation(station)}
                      />
                    </g>
                  ))}
                  <circle cx="50%" cy="50%" r="4" fill="#22c55e" stroke="#16a34a" strokeWidth="1" />
                  <circle cx="50%" cy="50%" r="8" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.5" />
                </svg>
                <div className="absolute bottom-2 left-2 bg-slate-800/90 rounded-lg p-2 text-[9px] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-green-500" />
                    <span className="text-slate-300">Your Location</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-300">Open Station</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-slate-500" />
                    <span className="text-slate-300">Closed Station</span>
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-slate-800/90 rounded-lg px-2 py-1 text-[9px] text-slate-400">
                  Kenya
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Station List */}
          <div className="lg:col-span-2 space-y-3 max-h-[800px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {filteredStations.length === 0 ? (
              <Card className="bg-slate-800/60 border-slate-700/50 text-white">
                <CardContent className="p-8 text-center">
                  <MapPin className="size-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No stations match your filters</p>
                  <p className="text-xs text-slate-500 mt-1">Try adjusting your search or filter criteria</p>
                </CardContent>
              </Card>
            ) : (
              filteredStations.map((station) => (
                <Card key={station.id} className="bg-slate-800/60 border-slate-700/50 text-white hover:border-amber-500/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold truncate">{station.name}</h3>
                          <Badge className={`text-[10px] shrink-0 ${station.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {station.isOpen ? 'Open' : 'Closed'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="size-3" />
                            {station.address}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                            <Navigation className="size-3" />
                            {station.distance} km
                          </span>
                          <span className="text-xs text-slate-500">~{station.driveTime} drive</span>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`size-3 ${star <= Math.round(station.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                              />
                            ))}
                            <span className="text-xs text-slate-400 ml-1">{station.rating}</span>
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="size-3" />
                            {station.operatingHours}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {station.fuelTypes.map((ft) => (
                            <Badge
                              key={ft.type}
                              className={`text-[10px] ${ft.available ? 'bg-slate-700/50 text-slate-200' : 'bg-slate-800/50 text-slate-600 line-through'}`}
                            >
                              <Fuel className="size-2.5 mr-1" />
                              {ft.type}: Ksh {ft.price.toFixed(2)}
                              {!ft.available && ' (N/A)'}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {station.amenities.map((amenity) => (
                            <span
                              key={amenity}
                              className="text-[10px] bg-slate-700/30 text-slate-400 px-2 py-0.5 rounded-full"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-black text-xs h-7"
                          >
                            <Navigation className="size-3 mr-1" />
                            Get Directions
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-xs h-7"
                          >
                            <Phone className="size-3 mr-1" />
                            Call Station
                          </Button>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(station.id)}
                        className="shrink-0 text-slate-400 hover:text-amber-400"
                      >
                        <Heart
                          className={`size-5 ${station.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`}
                        />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Nearby Stations ─────────────────────────────────────────────── */}
      {nearbyStations.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-green-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Nearby Stations</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Top 5 closest fuel stations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {nearbyStations.map((station, i) => (
                <div
                  key={station.id}
                  className="bg-slate-700/30 rounded-xl p-3 hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedStation(station)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600/50 text-slate-400'
                    }`}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-semibold truncate">{station.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-1">
                    <Navigation className="size-3" />
                    {station.distance} km · {station.driveTime}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={`text-[9px] ${station.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {station.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                    <span className="text-[10px] text-slate-500">
                      {station.fuelTypes.filter((f) => f.available).length} fuel types
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Add Station Dialog ────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-4 text-amber-400" />
              Add New Station
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Station Name *</Label>
              <Input
                placeholder="e.g. Shell Westlands"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Location *</Label>
              <Input
                placeholder="e.g. Waiyaki Way, Westlands, Nairobi"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Country</Label>
              <Input
                value={formCountry}
                onChange={(e) => setFormCountry(e.target.value)}
                className="bg-slate-700/50 border-slate-600/50 text-white text-xs"
              />
            </div>
            <Button
              onClick={handleAddStation}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
              disabled={!formName || !formLocation}
            >
              <Plus className="size-3.5 mr-1.5" />
              Create Station
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Station Detail Dialog ───────────────────────────────────────── */}
      <Dialog open={!!selectedStation} onOpenChange={(open) => { if (!open) setSelectedStation(null); }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          {selectedStation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="size-4 text-amber-400" />
                  {selectedStation.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs ${selectedStation.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {selectedStation.isOpen ? 'Open Now' : 'Closed'}
                  </Badge>
                  <span className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-3.5 ${star <= Math.round(selectedStation.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                      />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">{selectedStation.rating}/5</span>
                  </span>
                </div>

                <div className="space-y-2 bg-slate-700/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <MapPin className="size-3.5 text-amber-400" />
                    {selectedStation.address}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs">
                      <Navigation className="size-3 text-amber-400" />
                      <span className="text-amber-400 font-semibold">{selectedStation.distance} km</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="size-3" />
                      ~{selectedStation.driveTime} drive
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="size-3" />
                    Hours: {selectedStation.operatingHours}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Fuel Prices</span>
                  <div className="mt-2 space-y-1.5">
                    {selectedStation.fuelTypes.map((ft) => (
                      <div key={ft.type} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <Fuel className={`size-3.5 ${ft.type === 'PMS' ? 'text-green-400' : ft.type === 'AGO' ? 'text-amber-400' : 'text-blue-400'}`} />
                          <span className="text-xs font-semibold">{ft.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${ft.available ? 'text-white' : 'text-slate-600'}`}>
                            Ksh {ft.price.toFixed(2)}/L
                          </span>
                          {!ft.available && (
                            <Badge className="text-[9px] bg-red-500/20 text-red-400">Unavailable</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedStation.amenities.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Amenities</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedStation.amenities.map((amenity) => (
                        <Badge key={amenity} className="text-[10px] bg-slate-700/50 text-slate-200">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Phone className="size-3.5 text-amber-400" />
                  {selectedStation.phone}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-black text-xs">
                    <Navigation className="size-3.5 mr-1.5" />
                    Get Directions
                  </Button>
                  <Button variant="outline" className="flex-1 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 text-xs">
                    <Phone className="size-3.5 mr-1.5" />
                    Call Station
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
