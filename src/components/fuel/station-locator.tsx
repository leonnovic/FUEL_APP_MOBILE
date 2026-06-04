'use client';

import { useMemo, useState } from 'react';
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
  ChevronDown,
  ExternalLink,
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
import { useFuelStore } from '@/store/fuel-store';

// ─── Types ────────────────────────────────────────────────────────────────

interface FuelStation {
  id: string;
  name: string;
  distance: number; // km
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

// ─── Mock Data ────────────────────────────────────────────────────────────

const initialStations: FuelStation[] = [
  {
    id: '1',
    name: 'Shell Westlands',
    distance: 1.2,
    address: 'Waiyaki Way, Westlands, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 195.5, available: true },
      { type: 'AGO', price: 180.2, available: true },
      { type: 'DPK', price: 168.0, available: false },
    ],
    isOpen: true,
    operatingHours: '06:00 - 22:00',
    rating: 4.5,
    amenities: ['ATM', 'Car Wash', 'Shop', 'Air'],
    phone: '+254 720 100 001',
    coordinates: { x: 35, y: 25 },
    driveTime: '5 min',
    isFavorite: false,
  },
  {
    id: '2',
    name: 'Total Energies Uhuru Highway',
    distance: 2.4,
    address: 'Uhuru Highway, CBD, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 194.8, available: true },
      { type: 'AGO', price: 179.5, available: true },
      { type: 'DPK', price: 167.5, available: true },
    ],
    isOpen: true,
    operatingHours: '24 Hours',
    rating: 4.2,
    amenities: ['ATM', 'Restroom', 'Shop', 'Car Wash'],
    phone: '+254 720 200 002',
    coordinates: { x: 50, y: 40 },
    driveTime: '10 min',
    isFavorite: true,
  },
  {
    id: '3',
    name: 'KenolKobil Kilimani',
    distance: 3.1,
    address: 'Argwings Kodhek Rd, Kilimani, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 196.0, available: true },
      { type: 'AGO', price: 181.0, available: true },
    ],
    isOpen: true,
    operatingHours: '05:30 - 23:00',
    rating: 3.8,
    amenities: ['ATM', 'Car Wash'],
    phone: '+254 720 300 003',
    coordinates: { x: 42, y: 55 },
    driveTime: '12 min',
    isFavorite: false,
  },
  {
    id: '4',
    name: 'National Oil Industrial Area',
    distance: 4.5,
    address: 'Enterprise Rd, Industrial Area, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 193.5, available: true },
      { type: 'AGO', price: 178.0, available: true },
      { type: 'DPK', price: 166.5, available: true },
    ],
    isOpen: true,
    operatingHours: '06:00 - 21:00',
    rating: 3.5,
    amenities: ['Restroom', 'Air'],
    phone: '+254 720 400 004',
    coordinates: { x: 60, y: 70 },
    driveTime: '18 min',
    isFavorite: false,
  },
  {
    id: '5',
    name: 'OilLibya Mombasa Road',
    distance: 5.2,
    address: 'Mombasa Rd, South B, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 195.0, available: true },
      { type: 'AGO', price: 180.5, available: true },
    ],
    isOpen: true,
    operatingHours: '24 Hours',
    rating: 4.0,
    amenities: ['ATM', 'Car Wash', 'Restroom', 'Shop', 'Air'],
    phone: '+254 720 500 005',
    coordinates: { x: 70, y: 60 },
    driveTime: '20 min',
    isFavorite: false,
  },
  {
    id: '6',
    name: 'Shell Jogoo Road',
    distance: 3.8,
    address: 'Jogoo Rd, Makadara, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 197.0, available: true },
      { type: 'AGO', price: 182.0, available: true },
      { type: 'DPK', price: 169.0, available: true },
    ],
    isOpen: false,
    operatingHours: '06:00 - 20:00',
    rating: 3.2,
    amenities: ['ATM', 'Shop'],
    phone: '+254 720 600 006',
    coordinates: { x: 58, y: 50 },
    driveTime: '15 min',
    isFavorite: false,
  },
  {
    id: '7',
    name: 'Gulf Energy Thika Road',
    distance: 6.1,
    address: 'Thika Rd, Roysambu, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 194.0, available: true },
      { type: 'AGO', price: 179.0, available: true },
    ],
    isOpen: true,
    operatingHours: '06:00 - 22:00',
    rating: 4.3,
    amenities: ['Car Wash', 'Restroom', 'Shop', 'Air'],
    phone: '+254 720 700 007',
    coordinates: { x: 45, y: 15 },
    driveTime: '22 min',
    isFavorite: false,
  },
  {
    id: '8',
    name: 'Rubis Langata',
    distance: 7.3,
    address: 'Langata Rd, Karen, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 196.5, available: true },
      { type: 'AGO', price: 181.5, available: true },
      { type: 'DPK', price: 168.5, available: false },
    ],
    isOpen: true,
    operatingHours: '06:00 - 22:00',
    rating: 4.1,
    amenities: ['ATM', 'Car Wash', 'Shop'],
    phone: '+254 720 800 008',
    coordinates: { x: 30, y: 75 },
    driveTime: '25 min',
    isFavorite: true,
  },
  {
    id: '9',
    name: 'KenolKobil Eastern Bypass',
    distance: 8.5,
    address: 'Eastern Bypass, Umoja, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 193.0, available: true },
      { type: 'AGO', price: 177.5, available: true },
    ],
    isOpen: false,
    operatingHours: '06:30 - 21:30',
    rating: 3.6,
    amenities: ['Restroom', 'Air'],
    phone: '+254 720 900 009',
    coordinates: { x: 80, y: 45 },
    driveTime: '30 min',
    isFavorite: false,
  },
  {
    id: '10',
    name: 'Total Energies Kiambu Road',
    distance: 9.2,
    address: 'Kiambu Rd, Ridgeways, Nairobi',
    fuelTypes: [
      { type: 'PMS', price: 195.2, available: true },
      { type: 'AGO', price: 180.0, available: true },
      { type: 'DPK', price: 167.0, available: true },
    ],
    isOpen: true,
    operatingHours: '05:00 - 23:00',
    rating: 4.4,
    amenities: ['ATM', 'Car Wash', 'Restroom', 'Shop', 'Air'],
    phone: '+254 721 000 010',
    coordinates: { x: 25, y: 10 },
    driveTime: '35 min',
    isFavorite: false,
  },
];

const amenityOptions = ['ATM', 'Car Wash', 'Restroom', 'Shop', 'Air'];
const fuelFilterOptions = ['PMS', 'AGO', 'DPK'];

// ─── Component ────────────────────────────────────────────────────────────

export function StationLocator() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);

  const [stations, setStations] = useState<FuelStation[]>(initialStations);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFuelType, setFilterFuelType] = useState<string>('all');
  const [filterAmenity, setFilterAmenity] = useState<string>('all');
  const [filterDistance, setFilterDistance] = useState<string>('all');
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);

  // Toggle favorite
  const toggleFavorite = (stationId: string) => {
    setStations((prev) =>
      prev.map((s) =>
        s.id === stationId ? { ...s, isFavorite: !s.isFavorite } : s
      )
    );
  };

  // Filtered stations
  const filteredStations = useMemo(() => {
    let result = [...stations];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.fuelTypes.some((f) => f.type.toLowerCase().includes(q))
      );
    }

    // Fuel type filter
    if (filterFuelType !== 'all') {
      result = result.filter((s) =>
        s.fuelTypes.some((f) => f.type === filterFuelType && f.available)
      );
    }

    // Amenity filter
    if (filterAmenity !== 'all') {
      result = result.filter((s) => s.amenities.includes(filterAmenity));
    }

    // Distance filter
    if (filterDistance !== 'all') {
      const maxDist = parseInt(filterDistance);
      result = result.filter((s) => s.distance <= maxDist);
    }

    // Open now filter
    if (filterOpenNow) {
      result = result.filter((s) => s.isOpen);
    }

    return result;
  }, [stations, searchQuery, filterFuelType, filterAmenity, filterDistance, filterOpenNow]);

  // Nearby stations (top 5 by distance)
  const nearbyStations = useMemo(
    () => [...stations].sort((a, b) => a.distance - b.distance).slice(0, 5),
    [stations]
  );

  // Active filter count
  const activeFilterCount = [
    filterFuelType !== 'all' ? 1 : 0,
    filterAmenity !== 'all' ? 1 : 0,
    filterDistance !== 'all' ? 1 : 0,
    filterOpenNow ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

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

      {/* ── Map + Station List Row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map Placeholder */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:row-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-amber-400" />
              <div>
                <CardTitle className="text-sm font-semibold">Station Map</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Nairobi area fuel stations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative h-[360px] rounded-xl bg-slate-900/80 border border-slate-700/30 overflow-hidden">
              {/* Grid lines */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Vertical grid lines */}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((x) => (
                  <line key={`v-${x}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                ))}
                {/* Horizontal grid lines */}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => (
                  <line key={`h-${y}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                ))}
                {/* Major roads */}
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#475569" strokeWidth="1.5" />
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#475569" strokeWidth="1.5" />
                {/* Station markers */}
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
                {/* Your location marker */}
                <circle cx="50%" cy="50%" r="4" fill="#22c55e" stroke="#16a34a" strokeWidth="1" />
                <circle cx="50%" cy="50%" r="8" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.5" />
              </svg>
              {/* Map legend */}
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
              {/* Map label */}
              <div className="absolute top-2 right-2 bg-slate-800/90 rounded-lg px-2 py-1 text-[9px] text-slate-400">
                Nairobi, Kenya
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
                      {/* Station name + favorite */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate">{station.name}</h3>
                        <Badge className={`text-[10px] shrink-0 ${station.isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {station.isOpen ? 'Open' : 'Closed'}
                        </Badge>
                      </div>

                      {/* Address + distance */}
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

                      {/* Rating + Hours */}
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

                      {/* Fuel types + prices */}
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

                      {/* Amenities */}
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

                      {/* Action buttons */}
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

                    {/* Favorite toggle */}
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

      {/* ── Nearby Stations ─────────────────────────────────────────────── */}
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
                {station.fuelTypes.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {station.fuelTypes.slice(0, 2).map((ft) => (
                      <div key={ft.type} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{ft.type}</span>
                        <span className={ft.available ? 'text-slate-200' : 'text-slate-600'}>Ksh {ft.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                {/* Status + Rating */}
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

                {/* Address + Distance + Drive time */}
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

                {/* Fuel prices */}
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

                {/* Amenities */}
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

                {/* Phone */}
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Phone className="size-3.5 text-amber-400" />
                  {selectedStation.phone}
                </div>

                {/* Actions */}
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
