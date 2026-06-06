import { useState, useEffect, useCallback, useRef } from 'react';
import {
  runFullSync,
  isSyncDue,
  getSyncedFuelPrice,
  getSyncedTaxRates,
  getSyncedExchangeRates,
  getRegulatoryUpdates,
  type SyncResult,
  type FuelPriceData,
  type TaxRateData,
  type ExchangeRateData,
  type RegulatoryUpdate,
} from '@/react-app/services/DataSyncService';

interface UseAutoSyncReturn {
  // Status
  isSyncing: boolean;
  lastSync: string | null;
  error: string | null;
  // Data
  fuelPrice: FuelPriceData | null;
  taxRates: TaxRateData | null;
  exchangeRates: ExchangeRateData | null;
  regulatoryUpdates: RegulatoryUpdate[];
  // Actions
  syncNow: () => Promise<void>;
  dismissUpdate: (id: string) => void;
  markUpdateRead: (id: string) => void;
  unreadCount: number;
  highPriorityCount: number;
}

export function useAutoSync(countryCode: string): UseAutoSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('fuelpro_last_full_sync'));
  const [error, setError] = useState<string | null>(null);
  const [fuelPrice, setFuelPrice] = useState<FuelPriceData | null>(() => getSyncedFuelPrice(countryCode));
  const [taxRates, setTaxRates] = useState<TaxRateData | null>(() => getSyncedTaxRates(countryCode));
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateData | null>(() => getSyncedExchangeRates());
  const [regulatoryUpdates, setRegulatoryUpdates] = useState<RegulatoryUpdate[]>(() => getRegulatoryUpdates(countryCode));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);

    try {
      const result = await runFullSync(countryCode);
      setFuelPrice(result.fuelPrices[0] || null);
      setTaxRates(result.taxRates);
      setExchangeRates(result.exchangeRates);
      setRegulatoryUpdates(result.regulatoryUpdates);
      setLastSync(new Date().toISOString());
    } catch (err) {
      setError((err as Error).message);
      // Keep existing data on error
    } finally {
      setIsSyncing(false);
    }
  }, [countryCode, isSyncing]);

  // Load cached data and set up auto-sync
  useEffect(() => {
    // Load cached data immediately
    const cachedFuel = getSyncedFuelPrice(countryCode);
    const cachedTax = getSyncedTaxRates(countryCode);
    const cachedEx = getSyncedExchangeRates();
    const cachedReg = getRegulatoryUpdates(countryCode);

    if (cachedFuel) setFuelPrice(cachedFuel);
    if (cachedTax) setTaxRates(cachedTax);
    if (cachedEx) setExchangeRates(cachedEx);
    if (cachedReg.length > 0) setRegulatoryUpdates(cachedReg);

    // Initial sync if due
    if (isSyncDue(countryCode)) {
      doSync();
    }

    // Periodic check every 15 minutes
    intervalRef.current = setInterval(() => {
      if (isSyncDue(countryCode)) {
        doSync();
      }
    }, 1000 * 60 * 15);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [countryCode, doSync]);

  // Listen for sync events from other components
  useEffect(() => {
    const handleSyncEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.countryCode === countryCode || !detail?.countryCode) {
        // Refresh from localStorage
        setFuelPrice(getSyncedFuelPrice(countryCode));
        setTaxRates(getSyncedTaxRates(countryCode));
        setExchangeRates(getSyncedExchangeRates());
        setRegulatoryUpdates(getRegulatoryUpdates(countryCode));
        setLastSync(localStorage.getItem('fuelpro_last_full_sync'));
      }
    };

    window.addEventListener('fuelpro-sync-complete', handleSyncEvent);
    return () => window.removeEventListener('fuelpro-sync-complete', handleSyncEvent);
  }, [countryCode]);

  const dismissUpdate = useCallback((id: string) => {
    setRegulatoryUpdates(prev => prev.filter(u => u.id !== id));
    // Also update localStorage
    const updated = regulatoryUpdates.filter(u => u.id !== id);
    localStorage.setItem(`fuelpro_regulatory_${countryCode}`, JSON.stringify(updated));
  }, [countryCode, regulatoryUpdates]);

  const markUpdateRead = useCallback((id: string) => {
    setRegulatoryUpdates(prev =>
      prev.map(u => u.id === id ? { ...u, read: true } : u)
    );
    const updated = regulatoryUpdates.map(u => u.id === id ? { ...u, read: true } : u);
    localStorage.setItem(`fuelpro_regulatory_${countryCode}`, JSON.stringify(updated));
  }, [countryCode, regulatoryUpdates]);

  const unreadCount = regulatoryUpdates.filter(u => !u.read).length;
  const highPriorityCount = regulatoryUpdates.filter(u => !u.read && u.priority === 'high').length;

  return {
    isSyncing,
    lastSync,
    error,
    fuelPrice,
    taxRates,
    exchangeRates,
    regulatoryUpdates,
    syncNow: doSync,
    dismissUpdate,
    markUpdateRead,
    unreadCount,
    highPriorityCount,
  };
}
