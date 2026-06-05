'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useFuelStore } from '@/store/fuel-store';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';

const SYNC_INTERVAL_MS = 15_000; // 15 seconds for near-real-time sync
const HEARTBEAT_KEY = 'fuelpro_heartbeat';
const DEVICE_ID_KEY = 'fuelpro_device_id';

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Browser';
}

interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  deviceId: string;
  isOnline: boolean;
  activeDevices: number;
}

/**
 * Cross-device sync hook that ensures data continuity across devices.
 * - Polls the server every 15 seconds for fresh data
 * - Broadcasts state changes via BroadcastChannel (same-device tabs)
 * - Heartbeat to track active device count
 * - Handles offline/online transitions gracefully
 */
export function useCrossDeviceSync(): SyncStatus {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const validateSession = useAuthStore((s) => s.validateSession);
  const currentStation = useStationStore((s) => s.currentStation);
  const syncFromServer = useFuelStore((s) => s.syncFromServer);
  const isSyncing = useFuelStore((s) => s.isSyncing);
  const syncError = useFuelStore((s) => s.syncError);
  const lastSyncAt = useFuelStore((s) => s.lastSyncAt);

  const [isOnline, setIsOnline] = useState(true);
  const [activeDevices, setActiveDevices] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const deviceId = useRef(getDeviceId());

  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Immediately sync when coming back online
      if (isAuthenticated && currentStation?.id) {
        syncFromServer(currentStation.id).catch(() => {});
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, currentStation?.id, syncFromServer]);

  // BroadcastChannel for same-device tab sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
      channelRef.current = new BroadcastChannel('fuelpro_sync');

      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'data_updated' && event.data?.deviceId !== deviceId.current) {
          // Another tab updated data, refresh from server
          if (isAuthenticated && currentStation?.id) {
            syncFromServer(currentStation.id).catch(() => {});
          }
        }
        if (event.data?.type === 'logout') {
          // Another tab logged out
          useAuthStore.getState().logout();
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      channelRef.current?.close();
    };
  }, [isAuthenticated, currentStation?.id, syncFromServer]);

  // Notify other tabs when data changes
  const notifyTabs = useCallback((type: string) => {
    channelRef.current?.postMessage({ type, deviceId: deviceId.current, timestamp: Date.now() });
  }, []);

  // Heartbeat to track active sessions
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const heartbeat = () => {
      const now = Date.now();
      const heartbeats = JSON.parse(localStorage.getItem(HEARTBEAT_KEY) || '{}');
      heartbeats[deviceId.current] = {
        lastSeen: now,
        device: getDeviceInfo(),
      };

      // Clean up stale heartbeats (>2 minutes old)
      const active = Object.entries(heartbeats).filter(
        ([, v]) => now - (v as { lastSeen: number }).lastSeen < 120_000
      );
      const cleaned = Object.fromEntries(active);
      localStorage.setItem(HEARTBEAT_KEY, JSON.stringify(cleaned));
      setActiveDevices(active.length);
    };

    heartbeat();
    const hbInterval = setInterval(heartbeat, 30_000);
    return () => clearInterval(hbInterval);
  }, [isAuthenticated]);

  // Server polling for cross-device sync
  useEffect(() => {
    if (!isAuthenticated || !token || !currentStation?.id || !isOnline) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial sync
    syncFromServer(currentStation.id).then(() => {
      notifyTabs('data_updated');
    }).catch(() => {});

    // Validate session to ensure token is still valid
    validateSession().catch(() => {});

    // Set up polling
    intervalRef.current = setInterval(() => {
      syncFromServer(currentStation.id).then(() => {
        notifyTabs('data_updated');
      }).catch(() => {});
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, token, currentStation?.id, isOnline, syncFromServer, validateSession, notifyTabs]);

  // Listen for storage events (cross-tab/device sync via shared storage)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fuelpro-auth' || e.key === 'fuelpro-fuel') {
        // Another tab or device changed auth/fuel data
        if (isAuthenticated && currentStation?.id) {
          syncFromServer(currentStation.id).catch(() => {});
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isAuthenticated, currentStation?.id, syncFromServer]);

  return {
    isSyncing,
    lastSyncAt,
    syncError,
    deviceId: deviceId.current,
    isOnline,
    activeDevices,
  };
}
