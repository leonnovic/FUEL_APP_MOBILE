'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { ActionType, DataType } from '@/types/fuel';

interface PermissionGateProps {
  action: ActionType;
  dataType: DataType;
  stationId?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ action, dataType, stationId, fallback = null, children }: PermissionGateProps) {
  const can = useAuthStore((s) => s.can);

  if (!can(action, dataType, stationId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience components
export const CanCreateSale = ({ children, stationId, fallback }: { children: ReactNode; stationId?: string; fallback?: ReactNode }) => (
  <PermissionGate action="create" dataType="sale" stationId={stationId} fallback={fallback}>{children}</PermissionGate>
);

export const CanEditSale = ({ children, stationId, fallback }: { children: ReactNode; stationId?: string; fallback?: ReactNode }) => (
  <PermissionGate action="update" dataType="sale" stationId={stationId} fallback={fallback}>{children}</PermissionGate>
);

export const CanDeleteInventory = ({ children, stationId, fallback }: { children: ReactNode; stationId?: string; fallback?: ReactNode }) => (
  <PermissionGate action="delete" dataType="inventory" stationId={stationId} fallback={fallback}>{children}</PermissionGate>
);

export const CanViewAuditLogs = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <PermissionGate action="read" dataType="audit_log" fallback={fallback}>{children}</PermissionGate>
);

export const CanApprove = ({ children, stationId, fallback }: { children: ReactNode; stationId?: string; fallback?: ReactNode }) => (
  <PermissionGate action="approve" dataType="invoice" stationId={stationId} fallback={fallback}>{children}</PermissionGate>
);

export const CanExport = ({ children, stationId, fallback }: { children: ReactNode; stationId?: string; fallback?: ReactNode }) => (
  <PermissionGate action="export" dataType="report" stationId={stationId} fallback={fallback}>{children}</PermissionGate>
);

export const CanManageUsers = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <PermissionGate action="create" dataType="user" fallback={fallback}>{children}</PermissionGate>
);

export const CanManageStation = ({ children, stationId, fallback }: { children: ReactNode; stationId?: string; fallback?: ReactNode }) => (
  <PermissionGate action="update" dataType="station" stationId={stationId} fallback={fallback}>{children}</PermissionGate>
);
