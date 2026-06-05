'use client';

import { useEffect, useState, useCallback } from 'react';

interface VersionInfo {
  version: string;
  buildNumber: number;
  releaseNotes?: string;
}

interface VersionSyncState {
  currentVersion: string;
  serverVersion: string | null;
  hasUpdate: boolean;
  isChecking: boolean;
  error: string | null;
  checkForUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

const CLIENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.2.0';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Frontend-backend version sync hook.
 * Periodically checks the server for version updates and notifies
 * the user if a newer version is deployed.
 */
export function useVersionSync(): VersionSyncState {
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const res = await fetch('/api/version', {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        // Version endpoint not available yet - not an error
        return;
      }
      const data = await res.json();
      if (data.success && data.version) {
        const sv = data.version.version;
        setServerVersion(sv);
        if (sv !== CLIENT_VERSION && !dismissed) {
          setHasUpdate(true);
        }
      }
    } catch {
      // Silently fail - version check is non-critical
    } finally {
      setIsChecking(false);
    }
  }, [dismissed]);

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    setHasUpdate(false);
  }, []);

  // Check on mount and periodically
  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  return {
    currentVersion: CLIENT_VERSION,
    serverVersion,
    hasUpdate,
    isChecking,
    error,
    checkForUpdate,
    dismissUpdate,
  };
}
