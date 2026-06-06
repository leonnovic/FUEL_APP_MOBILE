// ─── RBAC Configuration ─────────────────────────────────────────────────────
// Role-Based Access Control with tab-level permission mapping
// Ported from reference architecture, adapted for Next.js

import type { ActionType, DataType, UserRole } from '@/types/fuel';

// Tab permission map: which RBAC check gates each tab
export const TAB_PERMISSION_MAP: Record<string, { action: ActionType; dataType: DataType }> = {
  dashboard: { action: 'read', dataType: 'station' },
  sales: { action: 'read', dataType: 'sale' },
  pos: { action: 'create', dataType: 'sale' },
  inventory: { action: 'read', dataType: 'inventory' },
  live: { action: 'read', dataType: 'sale' },
  offloading: { action: 'read', dataType: 'inventory' },
  delivery: { action: 'read', dataType: 'inventory' },
  invoice: { action: 'read', dataType: 'invoice' },
  credit: { action: 'read', dataType: 'invoice' },
  debt: { action: 'read', dataType: 'invoice' },
  mpesa: { action: 'read', dataType: 'sale' },
  payroll: { action: 'read', dataType: 'employee' },
  shifts: { action: 'read', dataType: 'employee' },
  customers: { action: 'read', dataType: 'sale' },
  quality: { action: 'read', dataType: 'report' },
  'fuel-sales': { action: 'read', dataType: 'report' },
  reports: { action: 'read', dataType: 'report' },
  analytics: { action: 'read', dataType: 'report' },
  audit: { action: 'read', dataType: 'audit_log' },
  communication: { action: 'read', dataType: 'station' },
  news: { action: 'read', dataType: 'station' },
  data: { action: 'read', dataType: 'settings' },
  integration: { action: 'read', dataType: 'settings' },
  compliance: { action: 'read', dataType: 'report' },
  'fuel-types': { action: 'update', dataType: 'inventory' },
  team: { action: 'read', dataType: 'employee' },
  documents: { action: 'read', dataType: 'report' },
  suppliers: { action: 'read', dataType: 'inventory' },
  maintenance: { action: 'read', dataType: 'station' },
  expenses: { action: 'read', dataType: 'expense' },
  'price-board': { action: 'read', dataType: 'inventory' },
  settings: { action: 'read', dataType: 'settings' },
  'fuel-orders': { action: 'create', dataType: 'inventory' },
  'profit-calc': { action: 'read', dataType: 'report' },
  'station-perf': { action: 'read', dataType: 'report' },
  'price-predict': { action: 'read', dataType: 'report' },
  'station-locator': { action: 'read', dataType: 'station' },
  fleet: { action: 'read', dataType: 'station' },
  founder: { action: 'read', dataType: 'settings' },
  company: { action: 'read', dataType: 'settings' },
  'doc-converter': { action: 'read', dataType: 'report' },
};

// Default tabs accessible by each role (order matters for default tab)
export const DEFAULT_ROLE_TABS: Record<UserRole, string[]> = {
  founder: Object.keys(TAB_PERMISSION_MAP),
  owner: [
    'dashboard', 'sales', 'pos', 'inventory', 'live', 'offloading', 'delivery',
    'invoice', 'credit', 'debt', 'mpesa', 'payroll', 'shifts', 'customers',
    'quality', 'fuel-sales', 'reports', 'analytics', 'audit', 'communication',
    'news', 'data', 'integration', 'compliance', 'fuel-types', 'team', 'documents',
    'suppliers', 'maintenance', 'expenses', 'price-board', 'doc-converter', 'settings',
    'fuel-orders', 'profit-calc', 'station-perf', 'price-predict', 'station-locator',
    'fleet', 'company',
  ],
  manager: [
    'dashboard', 'sales', 'pos', 'inventory', 'live', 'offloading', 'delivery',
    'invoice', 'credit', 'debt', 'mpesa', 'shifts', 'customers', 'quality',
    'fuel-sales', 'reports', 'communication', 'news', 'fuel-types', 'team',
    'documents', 'suppliers', 'maintenance', 'expenses', 'price-board',
    'fuel-orders', 'station-perf',
  ],
  staff: [
    'dashboard', 'sales', 'pos', 'live', 'delivery', 'shifts', 'quality',
    'fuel-sales', 'communication', 'news', 'price-board',
  ],
  auditor: [
    'dashboard', 'sales', 'reports', 'analytics', 'audit', 'fuel-sales',
    'quality', 'documents', 'expenses',
  ],
  guest: [
    'dashboard', 'price-board', 'station-locator',
  ],
};

// Role hierarchy for inheritance checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  founder: 100,
  owner: 80,
  manager: 60,
  staff: 40,
  auditor: 30,
  guest: 10,
};

export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function getAccessibleTabs(role: UserRole): string[] {
  return DEFAULT_ROLE_TABS[role] ?? DEFAULT_ROLE_TABS.guest;
}
