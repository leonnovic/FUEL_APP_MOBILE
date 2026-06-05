import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Station, StationBinding } from '@/types/fuel';

interface StationState {
  stations: Station[];
  currentStation: Station | null;
  bindings: StationBinding[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addStation: (station: Omit<Station, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Station;
  updateStation: (id: string, data: Partial<Station>) => void;
  deleteStation: (id: string) => void;
  switchStation: (stationId: string) => void;
  setStations: (stations: Station[]) => void;
  addBinding: (binding: Omit<StationBinding, 'id' | 'createdAt'>) => void;
  removeBinding: (userId: string, stationId: string) => void;
  setBindings: (bindings: StationBinding[]) => void;
  setLoading: (isLoading: boolean) => void;
  clearError: () => void;
}

// Helper to generate a unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useStationStore = create<StationState>()(
  persist(
    (set, get) => ({
      stations: [],
      currentStation: null,
      bindings: [],
      isLoading: false,
      error: null,

      addStation: (stationData): Station => {
        const station: Station = {
          id: stationData.id || generateId(),
          name: stationData.name,
          location: stationData.location,
          country: stationData.country,
          currency: stationData.currency,
          ownerId: stationData.ownerId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((s) => {
          const stations = [...s.stations, station];
          // If this is the first station, auto-select it
          const currentStation = s.currentStation ?? station;
          return { stations, currentStation };
        });

        return station;
      },

      updateStation: (id, data) =>
        set((s) => ({
          stations: s.stations.map((st) =>
            st.id === id
              ? { ...st, ...data, updatedAt: new Date().toISOString() }
              : st
          ),
          currentStation:
            s.currentStation?.id === id
              ? { ...s.currentStation, ...data, updatedAt: new Date().toISOString() }
              : s.currentStation,
        })),

      deleteStation: (id) =>
        set((s) => {
          const stations = s.stations.filter((st) => st.id !== id);
          const currentStation =
            s.currentStation?.id === id
              ? stations[0] ?? null
              : s.currentStation;
          return { stations, currentStation };
        }),

      switchStation: (stationId: string) => {
        const station = get().stations.find((s) => s.id === stationId) ?? null;
        set({ currentStation: station });
      },

      setStations: (stations: Station[]) => {
        const state = get();
        const currentStation =
          state.currentStation &&
          stations.find((s) => s.id === state.currentStation!.id)
            ? state.currentStation
            : stations[0] ?? null;
        set({ stations, currentStation });
      },

      addBinding: (bindingData) => {
        const binding: StationBinding = {
          id: generateId(),
          userId: bindingData.userId,
          stationId: bindingData.stationId,
          role: bindingData.role,
          active: bindingData.active,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ bindings: [...s.bindings, binding] }));
      },

      removeBinding: (userId, stationId) =>
        set((s) => ({
          bindings: s.bindings.filter(
            (b) => !(b.userId === userId && b.stationId === stationId)
          ),
        })),

      setBindings: (bindings: StationBinding[]) => set({ bindings }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'fuelpro-stations',
      partialize: (state) => ({
        stations: state.stations,
        currentStation: state.currentStation,
        bindings: state.bindings,
      }),
    }
  )
);
