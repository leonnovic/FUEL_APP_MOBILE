// FuelPro - Fuel Management System Type Definitions

// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = 'founder' | 'owner' | 'manager' | 'staff' | 'auditor' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tier?: UserTier;
  phone?: string;
  avatarUrl?: string;
  permissions?: Permission[];
  assignedStations?: string[];
  token?: string;
}

// ─── Station ─────────────────────────────────────────────────────────────────
export interface Station {
  id: string;
  name: string;
  location: string;
  country: string;
  currency: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── StationBinding ─────────────────────────────────────────────────────────
export type BindingRole = 'owner' | 'manager' | 'attendant';

export interface StationBinding {
  id: string;
  userId: string;
  stationId: string;
  role: BindingRole;
  active: boolean;
  createdAt: string;
}

// ─── Sale ────────────────────────────────────────────────────────────────────
export interface Sale {
  id: string;
  stationId: string;
  date: string;
  pmsOpeningReading: number;
  pmsClosingReading: number;
  agoOpeningReading: number;
  agoClosingReading: number;
  pmsPrice: number;
  agoPrice: number;
  pmsSalesKsh: number;
  agoSalesKsh: number;
  pmsSalesL: number;
  agoSalesL: number;
  totalSales: number;
  expenses: number;
  createdAt: string;
}

export interface SaleFormData {
  date: string;
  pmsOpeningReading: number;
  pmsClosingReading: number;
  agoOpeningReading: number;
  agoClosingReading: number;
  pmsPrice: number;
  agoPrice: number;
  expenses?: number;
}

// ─── Delivery ───────────────────────────────────────────────────────────────
export type DeliveryStatus = 'pending' | 'delivered' | 'cancelled';

export interface Delivery {
  id: string;
  stationId: string;
  date: string;
  supplier: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  balanceDue: number;
  invoiceNumber?: string;
  driverName?: string;
  vehicleNumber?: string;
  status: DeliveryStatus;
  createdAt: string;
}

export interface DeliveryFormData {
  date: string;
  supplier: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalAmount?: number;
  balanceDue?: number;
  invoiceNumber?: string;
  driverName?: string;
  vehicleNumber?: string;
  status?: DeliveryStatus;
}

// ─── Invoice ────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  stationId: string;
  clientName: string;
  clientPhone?: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: InvoiceStatus;
  dueDate?: string;
  invoiceNumber: string;
  createdAt: string;
}

export interface InvoiceFormData {
  clientName: string;
  clientPhone?: string;
  items: InvoiceItem[];
  totalAmount?: number;
  status?: InvoiceStatus;
  dueDate?: string;
}

// ─── Client ─────────────────────────────────────────────────────────────────
export interface Client {
  id: string;
  stationId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  balanceDue: number;
  createdAt: string;
}

export interface ClientFormData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  balanceDue?: number;
}

// ─── Employee ───────────────────────────────────────────────────────────────
export type EmployeeRole = 'manager' | 'attendant' | 'accountant' | 'supervisor' | 'other';
export type EmployeeStatus = 'active' | 'inactive' | 'terminated';

export interface Employee {
  id: string;
  stationId: string;
  name: string;
  phone?: string;
  role: EmployeeRole;
  salary: number;
  hireDate?: string;
  status: EmployeeStatus;
  nationalId?: string;
  createdAt: string;
}

export interface EmployeeFormData {
  name: string;
  phone?: string;
  role: EmployeeRole;
  salary?: number;
  hireDate?: string;
  status?: EmployeeStatus;
  nationalId?: string;
}

// ─── Expense ────────────────────────────────────────────────────────────────
export type ExpenseCategory = 'fuel' | 'maintenance' | 'salary' | 'utilities' | 'rent' | 'transport' | 'misc';

export interface Expense {
  id: string;
  stationId: string;
  date: string;
  category: ExpenseCategory;
  description?: string;
  amount: number;
  createdBy?: string;
  createdAt: string;
}

export interface ExpenseFormData {
  date: string;
  category: ExpenseCategory;
  description?: string;
  amount: number;
}

// ─── Shift ──────────────────────────────────────────────────────────────────
export type ShiftStatus = 'open' | 'closed' | 'verified';

export interface Shift {
  id: string;
  stationId: string;
  date: string;
  attendantName: string;
  startTime?: string;
  endTime?: string;
  pmsOpening: number;
  pmsClosing: number;
  agoOpening: number;
  agoClosing: number;
  totalSales: number;
  cashDeclared: number;
  variance: number;
  status: ShiftStatus;
  createdAt: string;
}

export interface ShiftFormData {
  date: string;
  attendantName: string;
  startTime?: string;
  endTime?: string;
  pmsOpening?: number;
  pmsClosing?: number;
  agoOpening?: number;
  agoClosing?: number;
  cashDeclared?: number;
  status?: ShiftStatus;
}

// ─── FuelType ───────────────────────────────────────────────────────────────
export type FuelCategory = 'fuel' | 'lubricant' | 'gas';

export interface FuelType {
  id: string;
  stationId: string;
  name: string;
  category: FuelCategory;
  price: number;
  tankCapacity: number;
  currentLevel: number;
  createdAt: string;
}

export interface FuelTypeFormData {
  name: string;
  category?: FuelCategory;
  price: number;
  tankCapacity?: number;
  currentLevel?: number;
}

// ─── Supplier ───────────────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  stationId: string;
  name: string;
  phone?: string;
  email?: string;
  product?: string;
  address?: string;
  createdAt: string;
}

export interface SupplierFormData {
  name: string;
  phone?: string;
  email?: string;
  product?: string;
  address?: string;
}

// ─── Maintenance ────────────────────────────────────────────────────────────
export type MaintenanceStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Maintenance {
  id: string;
  stationId: string;
  equipment: string;
  description?: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  scheduledDate?: string;
  completedDate?: string;
  cost: number;
  assignedTo?: string;
  createdAt: string;
}

export interface MaintenanceFormData {
  equipment: string;
  description?: string;
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  scheduledDate?: string;
  completedDate?: string;
  cost?: number;
  assignedTo?: string;
}

// ─── AuditLog ───────────────────────────────────────────────────────────────
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export';

export interface AuditLog {
  id: string;
  stationId: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ─── Document ───────────────────────────────────────────────────────────────
export type DocumentType = 'invoice' | 'receipt' | 'report' | 'contract' | 'other';
export type DocumentCategory = 'financial' | 'operational' | 'legal' | 'other';

export interface Document {
  id: string;
  stationId: string;
  name: string;
  type: DocumentType;
  category?: DocumentCategory;
  size: number;
  url: string;
  uploadedBy?: string;
  createdAt: string;
}

// ─── Company Data (local only, not a DB model) ─────────────────────────────
export interface CompanyData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

// ─── Dashboard Aggregates ───────────────────────────────────────────────────
export interface DashboardStats {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  totalDeliveries: number;
  pendingInvoices: number;
  activeEmployees: number;
  fuelLevels: { name: string; level: number; capacity: number }[];
}

// ─── API Response Wrappers ──────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Login / Register ───────────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
  phone?: string;
}

// ─── Theme ──────────────────────────────────────────────────────────────────
export type Theme = 'light' | 'dark';

// ─── RBAC Types ──────────────────────────────────────────────────────────────
export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve';
export type DataType = 'station' | 'sale' | 'inventory' | 'employee' | 'invoice' | 'expense' | 'audit_log' | 'user' | 'report' | 'settings';
export type TeamScope = 'global' | 'station' | 'team' | 'personal';
export type UserRoleExtended = 'founder' | 'owner' | 'manager' | 'staff' | 'auditor' | 'guest';

export interface Permission {
  id: string;
  userId: string;
  action: ActionType;
  dataType: DataType;
  teamScope: TeamScope;
  stationId?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  createdAt: string;
}

// Extended UserPublic with RBAC fields
export interface UserPublicExtended extends UserPublic {
  role: UserRoleExtended;
  tier: UserTier;
  permissions: Permission[];
  assignedStations: string[];
  token: string;
}

// ─── Audit Log SOC-2 Types ──────────────────────────────────────────────────
export interface AuditLogSoc2 {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  sessionId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  snapshotBefore?: string;
  snapshotAfter?: string;
  payloadHash?: string;
  ipAddress: string;
  userAgent: string;
  stationId?: string;
  teamId?: string;
  timestamp: string;
  logSignature?: string;
  previousLogHash?: string;
  logHash?: string;
  reason?: string;
  createdAt: string;
}

// ─── App Version ────────────────────────────────────────────────────────────
export interface AppVersion {
  id: string;
  version: string;
  buildNumber: number;
  releaseNotes?: string;
  isActive: boolean;
  createdAt: string;
}
