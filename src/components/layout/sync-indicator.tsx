'use client';

import { useCrossDeviceSync } from '@/hooks/use-cross-device-sync';
import { useVersionSync } from '@/hooks/use-version-sync';
import { useFuelStore } from '@/store/fuel-store';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Monitor } from 'lucide-react';

/**
 * SyncIndicator - Shows real-time sync status in the header.
 * Displays: online/offline, sync status, active devices, version updates.
 */
export function SyncIndicator() {
  const { isSyncing, lastSyncAt, syncError, isOnline, activeDevices } = useCrossDeviceSync();
  const { hasUpdate, serverVersion, currentVersion, dismissUpdate } = useVersionSync();
  const theme = useFuelStore((s) => s.theme);
  const isDark = theme === 'dark';

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Version update banner */}
      {hasUpdate && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
          <AlertTriangle className="size-3.5" />
          <span>v{serverVersion} available</span>
          <button
            onClick={() => window.location.reload()}
            className="font-semibold hover:underline"
          >
            Update
          </button>
          <button
            onClick={dismissUpdate}
            className="ml-1 opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Active devices */}
      {activeDevices > 1 && (
        <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
          isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
        }`}>
          <Monitor className="size-3" />
          <span>{activeDevices} devices</span>
        </div>
      )}

      {/* Sync status */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-default transition-colors ${
          syncError
            ? isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
            : !isOnline
            ? isDark ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-100 text-slate-500'
            : isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
        }`}
        title={`Last sync: ${formatLastSync(lastSyncAt)}${syncError ? `\nError: ${syncError}` : ''}\nVersion: v${currentVersion}`}
      >
        {isSyncing ? (
          <RefreshCw className="size-3 animate-spin" />
        ) : !isOnline ? (
          <CloudOff className="size-3" />
        ) : syncError ? (
          <AlertTriangle className="size-3" />
        ) : (
          <Cloud className="size-3" />
        )}
        <span className="hidden sm:inline">
          {isSyncing ? 'Syncing' : !isOnline ? 'Offline' : syncError ? 'Error' : formatLastSync(lastSyncAt)}
        </span>
      </div>
    </div>
  );
}
