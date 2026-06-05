import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────────────────

type VehicleType = 'Saloon' | 'SUV' | 'Truck' | 'Motorcycle' | 'Bus';
type FuelKind = 'PMS' | 'AGO';

export interface Vehicle {
  id: string;
  registration: string;
  makeModel: string;
  type: VehicleType;
  fuelType: FuelKind;
  tankCapacity: number;
  mileage: number;
  fuelEfficiency: number;
  efficiencyTrend: 'up' | 'down' | 'stable';
  nextServiceDate: string;
  nextServiceKm: number;
  monthlyFuelCost: number;
  status: 'active' | 'maintenance';
}

interface FleetState {
  // Vehicles keyed by stationId
  vehiclesByStation: Record<string, Vehicle[]>;

  // Actions
  getVehicles: (stationId: string) => Vehicle[];
  addVehicle: (stationId: string, vehicle: Vehicle) => void;
  updateVehicle: (stationId: string, vehicleId: string, data: Partial<Vehicle>) => void;
  deleteVehicle: (stationId: string, vehicleId: string) => void;
  setVehicles: (stationId: string, vehicles: Vehicle[]) => void;
}

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export { generateId };

export const useFleetStore = create<FleetState>()(
  persist(
    (set, get) => ({
      vehiclesByStation: {},

      getVehicles: (stationId: string): Vehicle[] => {
        return get().vehiclesByStation[stationId] ?? [];
      },

      addVehicle: (stationId: string, vehicle: Vehicle) => {
        set((s) => ({
          vehiclesByStation: {
            ...s.vehiclesByStation,
            [stationId]: [...(s.vehiclesByStation[stationId] ?? []), vehicle],
          },
        }));
      },

      updateVehicle: (stationId: string, vehicleId: string, data: Partial<Vehicle>) => {
        set((s) => ({
          vehiclesByStation: {
            ...s.vehiclesByStation,
            [stationId]: (s.vehiclesByStation[stationId] ?? []).map((v) =>
              v.id === vehicleId ? { ...v, ...data } : v
            ),
          },
        }));
      },

      deleteVehicle: (stationId: string, vehicleId: string) => {
        set((s) => ({
          vehiclesByStation: {
            ...s.vehiclesByStation,
            [stationId]: (s.vehiclesByStation[stationId] ?? []).filter(
              (v) => v.id !== vehicleId
            ),
          },
        }));
      },

      setVehicles: (stationId: string, vehicles: Vehicle[]) => {
        set((s) => ({
          vehiclesByStation: {
            ...s.vehiclesByStation,
            [stationId]: vehicles,
          },
        }));
      },
    }),
    {
      name: 'fuelpro-fleet',
      partialize: (state) => ({
        vehiclesByStation: state.vehiclesByStation,
      }),
    }
  )
);
