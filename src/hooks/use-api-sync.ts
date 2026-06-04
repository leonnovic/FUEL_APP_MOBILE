'use client';

import { useEffect, useRef } from 'react';
import { useFuelStore } from '@/store/fuel-store';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds

/**
 * useApiSync - Hook that handles cross-device data synchronization.
 *
 * On mount:
 * - Syncs data from the server for the current station
 *
 * Every 30 seconds:
 * - Polls the server for updated data
 *
 * Conflict resolution:
 * - Server wins (for now)
 *
 * Toast notifications:
 * - Shows toast on sync success/failure
 */
export function useApiSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentStation = useStationStore((s) => s.currentStation);
  const syncFromServer = useFuelStore((s) => s.syncFromServer);
  const isSyncing = useFuelStore((s) => s.isSyncing);
  const syncError = useFuelStore((s) => s.syncError);
  const lastSyncAt = useFuelStore((s) => s.lastSyncAt);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialSyncRef = useRef(false);
  const stationId = currentStation?.id ?? null;

  // Initial sync on mount
  useEffect(() => {
    if (!isAuthenticated || !stationId) return;
    if (isInitialSyncRef.current) return;

    isInitialSyncRef.current = true;
    syncFromServer(stationId).catch(() => {
      // Error is already handled in the store
    });
  }, [isAuthenticated, stationId, syncFromServer]);

  // Set up polling interval
  useEffect(() => {
    if (!isAuthenticated || !stationId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      syncFromServer(stationId).catch(() => {
        // Error is already handled in the store
      });
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, stationId, syncFromServer]);

  // Reset initial sync flag when auth changes
  useEffect(() => {
    if (!isAuthenticated) {
      isInitialSyncRef.current = false;
    }
  }, [isAuthenticated]);

  return {
    isSyncing,
    syncError,
    lastSyncAt,
  };
}
