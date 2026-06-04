import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Sale,
  SaleFormData,
  Delivery,
  DeliveryFormData,
  Client,
  ClientFormData,
  Invoice,
  InvoiceFormData,
  Employee,
  EmployeeFormData,
  Expense,
  ExpenseFormData,
  Shift,
  ShiftFormData,
  FuelType,
  FuelTypeFormData,
  Supplier,
  SupplierFormData,
  Maintenance,
  MaintenanceFormData,
  CompanyData,
  Theme,
} from '@/types/fuel';

interface FuelState {
  // Current station context
  stationId: string;

  // Data collections
  salesHistory: Record<string, Sale>;
  deliveryData: Record<string, Delivery>;
  clients: Record<string, Client>;
  invoices: Record<string, Invoice>;
  employees: Employee[];
  expenses: Expense[];
  shifts: Shift[];
  fuelTypes: FuelType[];
  suppliers: Supplier[];
  maintenance: Maintenance[];

  // Pricing
  pmsPrice: number;
  agoPrice: number;

  // Company info
  companyData: CompanyData;

  // Theme
  theme: Theme;

  // Loading states
  isLoading: boolean;

  // ─── Actions ─────────────────────────────────────────────────────────────

  // Station context
  setStationId: (stationId: string) => void;

  // Sales
  addSale: (sale: SaleFormData) => Sale;
  updateSale: (id: string, data: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  setSalesHistory: (sales: Sale[]) => void;

  // Deliveries
  addDelivery: (delivery: DeliveryFormData) => Delivery;
  updateDelivery: (id: string, data: Partial<Delivery>) => void;
  deleteDelivery: (id: string) => void;
  setDeliveryData: (deliveries: Delivery[]) => void;

  // Clients
  addClient: (client: ClientFormData) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  setClients: (clients: Client[]) => void;

  // Invoices
  addInvoice: (invoice: InvoiceFormData) => Invoice;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  setInvoices: (invoices: Invoice[]) => void;

  // Employees
  addEmployee: (employee: EmployeeFormData) => Employee;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  setEmployees: (employees: Employee[]) => void;

  // Expenses
  addExpense: (expense: ExpenseFormData) => Expense;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  setExpenses: (expenses: Expense[]) => void;

  // Shifts
  addShift: (shift: ShiftFormData) => Shift;
  updateShift: (id: string, data: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  setShifts: (shifts: Shift[]) => void;

  // Fuel Types
  addFuelType: (fuelType: FuelTypeFormData) => FuelType;
  updateFuelType: (id: string, data: Partial<FuelType>) => void;
  deleteFuelType: (id: string) => void;
  setFuelTypes: (fuelTypes: FuelType[]) => void;

  // Suppliers
  addSupplier: (supplier: SupplierFormData) => Supplier;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  setSuppliers: (suppliers: Supplier[]) => void;

  // Maintenance
  addMaintenance: (maintenance: MaintenanceFormData) => Maintenance;
  updateMaintenance: (id: string, data: Partial<Maintenance>) => void;
  deleteMaintenance: (id: string) => void;
  setMaintenance: (maintenance: Maintenance[]) => void;

  // Pricing
  setPmsPrice: (price: number) => void;
  setAgoPrice: (price: number) => void;

  // Company
  setCompanyData: (data: Partial<CompanyData>) => void;

  // Theme
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;

  // General
  setLoading: (loading: boolean) => void;
  resetStore: () => void;
}

// Helper to generate a unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Default company data
const defaultCompanyData: CompanyData = {
  name: 'FuelPro Station',
  phone: '',
  email: '',
  address: '',
};

const initialState = {
  stationId: '',
  salesHistory: {},
  deliveryData: {},
  clients: {},
  invoices: {},
  employees: [],
  expenses: [],
  shifts: [],
  fuelTypes: [],
  suppliers: [],
  maintenance: [],
  pmsPrice: 0,
  agoPrice: 0,
  companyData: defaultCompanyData,
  theme: 'light' as Theme,
  isLoading: false,
};

export const useFuelStore = create<FuelState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─── Station Context ────────────────────────────────────────────────
      setStationId: (stationId: string) => set({ stationId }),

      // ─── Sales ──────────────────────────────────────────────────────────
      addSale: (saleData: SaleFormData): Sale => {
        const state = get();
        const pmsSalesL = saleData.pmsClosingReading - saleData.pmsOpeningReading;
        const agoSalesL = saleData.agoClosingReading - saleData.agoOpeningReading;
        const pmsSalesKsh = pmsSalesL * saleData.pmsPrice;
        const agoSalesKsh = agoSalesL * saleData.agoPrice;
        const totalSales = pmsSalesKsh + agoSalesKsh;

        const sale: Sale = {
          id: generateId(),
          stationId: state.stationId,
          date: saleData.date,
          pmsOpeningReading: saleData.pmsOpeningReading,
          pmsClosingReading: saleData.pmsClosingReading,
          agoOpeningReading: saleData.agoOpeningReading,
          agoClosingReading: saleData.agoClosingReading,
          pmsPrice: saleData.pmsPrice,
          agoPrice: saleData.agoPrice,
          pmsSalesKsh,
          agoSalesKsh,
          pmsSalesL,
          agoSalesL,
          totalSales,
          expenses: saleData.expenses ?? 0,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          salesHistory: { ...s.salesHistory, [sale.id]: sale },
        }));
        return sale;
      },

      updateSale: (id, data) =>
        set((s) => ({
          salesHistory: {
            ...s.salesHistory,
            [id]: s.salesHistory[id]
              ? { ...s.salesHistory[id], ...data }
              : s.salesHistory[id],
          },
        })),

      deleteSale: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.salesHistory;
          return { salesHistory: rest };
        }),

      setSalesHistory: (sales: Sale[]) =>
        set({
          salesHistory: sales.reduce(
            (acc, sale) => ({ ...acc, [sale.id]: sale }),
            {} as Record<string, Sale>
          ),
        }),

      // ─── Deliveries ─────────────────────────────────────────────────────
      addDelivery: (deliveryData: DeliveryFormData): Delivery => {
        const state = get();
        const totalAmount = deliveryData.totalAmount ?? deliveryData.quantity * deliveryData.unitPrice;
        const balanceDue = deliveryData.balanceDue ?? totalAmount;

        const delivery: Delivery = {
          id: generateId(),
          stationId: state.stationId,
          date: deliveryData.date,
          supplier: deliveryData.supplier,
          product: deliveryData.product,
          quantity: deliveryData.quantity,
          unitPrice: deliveryData.unitPrice,
          totalAmount,
          balanceDue,
          invoiceNumber: deliveryData.invoiceNumber,
          driverName: deliveryData.driverName,
          vehicleNumber: deliveryData.vehicleNumber,
          status: deliveryData.status ?? 'pending',
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          deliveryData: { ...s.deliveryData, [delivery.id]: delivery },
        }));
        return delivery;
      },

      updateDelivery: (id, data) =>
        set((s) => ({
          deliveryData: {
            ...s.deliveryData,
            [id]: s.deliveryData[id]
              ? { ...s.deliveryData[id], ...data }
              : s.deliveryData[id],
          },
        })),

      deleteDelivery: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.deliveryData;
          return { deliveryData: rest };
        }),

      setDeliveryData: (deliveries: Delivery[]) =>
        set({
          deliveryData: deliveries.reduce(
            (acc, d) => ({ ...acc, [d.id]: d }),
            {} as Record<string, Delivery>
          ),
        }),

      // ─── Clients ────────────────────────────────────────────────────────
      addClient: (clientData: ClientFormData): Client => {
        const state = get();
        const client: Client = {
          id: generateId(),
          stationId: state.stationId,
          name: clientData.name,
          phone: clientData.phone,
          email: clientData.email,
          address: clientData.address,
          creditLimit: clientData.creditLimit ?? 0,
          balanceDue: clientData.balanceDue ?? 0,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          clients: { ...s.clients, [client.id]: client },
        }));
        return client;
      },

      updateClient: (id, data) =>
        set((s) => ({
          clients: {
            ...s.clients,
            [id]: s.clients[id] ? { ...s.clients[id], ...data } : s.clients[id],
          },
        })),

      deleteClient: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.clients;
          return { clients: rest };
        }),

      setClients: (clients: Client[]) =>
        set({
          clients: clients.reduce(
            (acc, c) => ({ ...acc, [c.id]: c }),
            {} as Record<string, Client>
          ),
        }),

      // ─── Invoices ───────────────────────────────────────────────────────
      addInvoice: (invoiceData: InvoiceFormData): Invoice => {
        const state = get();
        const totalAmount =
          invoiceData.totalAmount ??
          invoiceData.items.reduce((sum, item) => sum + item.total, 0);

        const invoice: Invoice = {
          id: generateId(),
          stationId: state.stationId,
          clientName: invoiceData.clientName,
          clientPhone: invoiceData.clientPhone,
          items: invoiceData.items,
          totalAmount,
          status: invoiceData.status ?? 'pending',
          dueDate: invoiceData.dueDate,
          invoiceNumber: `INV-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          invoices: { ...s.invoices, [invoice.id]: invoice },
        }));
        return invoice;
      },

      updateInvoice: (id, data) =>
        set((s) => ({
          invoices: {
            ...s.invoices,
            [id]: s.invoices[id]
              ? { ...s.invoices[id], ...data }
              : s.invoices[id],
          },
        })),

      deleteInvoice: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.invoices;
          return { invoices: rest };
        }),

      setInvoices: (invoices: Invoice[]) =>
        set({
          invoices: invoices.reduce(
            (acc, inv) => ({ ...acc, [inv.id]: inv }),
            {} as Record<string, Invoice>
          ),
        }),

      // ─── Employees ──────────────────────────────────────────────────────
      addEmployee: (employeeData: EmployeeFormData): Employee => {
        const state = get();
        const employee: Employee = {
          id: generateId(),
          stationId: state.stationId,
          name: employeeData.name,
          phone: employeeData.phone,
          role: employeeData.role,
          salary: employeeData.salary ?? 0,
          hireDate: employeeData.hireDate,
          status: employeeData.status ?? 'active',
          nationalId: employeeData.nationalId,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          employees: [...s.employees, employee],
        }));
        return employee;
      },

      updateEmployee: (id, data) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        })),

      deleteEmployee: (id) =>
        set((s) => ({
          employees: s.employees.filter((e) => e.id !== id),
        })),

      setEmployees: (employees: Employee[]) => set({ employees }),

      // ─── Expenses ───────────────────────────────────────────────────────
      addExpense: (expenseData: ExpenseFormData): Expense => {
        const state = get();
        const expense: Expense = {
          id: generateId(),
          stationId: state.stationId,
          date: expenseData.date,
          category: expenseData.category,
          description: expenseData.description,
          amount: expenseData.amount,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          expenses: [...s.expenses, expense],
        }));
        return expense;
      },

      updateExpense: (id, data) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        })),

      deleteExpense: (id) =>
        set((s) => ({
          expenses: s.expenses.filter((e) => e.id !== id),
        })),

      setExpenses: (expenses: Expense[]) => set({ expenses }),

      // ─── Shifts ─────────────────────────────────────────────────────────
      addShift: (shiftData: ShiftFormData): Shift => {
        const state = get();
        const pmsSales = (shiftData.pmsClosing ?? 0) - (shiftData.pmsOpening ?? 0);
        const agoSales = (shiftData.agoClosing ?? 0) - (shiftData.agoOpening ?? 0);
        const totalSales = pmsSales * state.pmsPrice + agoSales * state.agoPrice;
        const variance = (shiftData.cashDeclared ?? 0) - totalSales;

        const shift: Shift = {
          id: generateId(),
          stationId: state.stationId,
          date: shiftData.date,
          attendantName: shiftData.attendantName,
          startTime: shiftData.startTime,
          endTime: shiftData.endTime,
          pmsOpening: shiftData.pmsOpening ?? 0,
          pmsClosing: shiftData.pmsClosing ?? 0,
          agoOpening: shiftData.agoOpening ?? 0,
          agoClosing: shiftData.agoClosing ?? 0,
          totalSales,
          cashDeclared: shiftData.cashDeclared ?? 0,
          variance,
          status: shiftData.status ?? 'open',
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          shifts: [...s.shifts, shift],
        }));
        return shift;
      },

      updateShift: (id, data) =>
        set((s) => ({
          shifts: s.shifts.map((sh) =>
            sh.id === id ? { ...sh, ...data } : sh
          ),
        })),

      deleteShift: (id) =>
        set((s) => ({
          shifts: s.shifts.filter((sh) => sh.id !== id),
        })),

      setShifts: (shifts: Shift[]) => set({ shifts }),

      // ─── Fuel Types ─────────────────────────────────────────────────────
      addFuelType: (fuelTypeData: FuelTypeFormData): FuelType => {
        const state = get();
        const fuelType: FuelType = {
          id: generateId(),
          stationId: state.stationId,
          name: fuelTypeData.name,
          category: fuelTypeData.category ?? 'fuel',
          price: fuelTypeData.price,
          tankCapacity: fuelTypeData.tankCapacity ?? 0,
          currentLevel: fuelTypeData.currentLevel ?? 0,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          fuelTypes: [...s.fuelTypes, fuelType],
        }));
        return fuelType;
      },

      updateFuelType: (id, data) =>
        set((s) => ({
          fuelTypes: s.fuelTypes.map((ft) =>
            ft.id === id ? { ...ft, ...data } : ft
          ),
        })),

      deleteFuelType: (id) =>
        set((s) => ({
          fuelTypes: s.fuelTypes.filter((ft) => ft.id !== id),
        })),

      setFuelTypes: (fuelTypes: FuelType[]) => set({ fuelTypes }),

      // ─── Suppliers ──────────────────────────────────────────────────────
      addSupplier: (supplierData: SupplierFormData): Supplier => {
        const state = get();
        const supplier: Supplier = {
          id: generateId(),
          stationId: state.stationId,
          name: supplierData.name,
          phone: supplierData.phone,
          email: supplierData.email,
          product: supplierData.product,
          address: supplierData.address,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          suppliers: [...s.suppliers, supplier],
        }));
        return supplier;
      },

      updateSupplier: (id, data) =>
        set((s) => ({
          suppliers: s.suppliers.map((sup) =>
            sup.id === id ? { ...sup, ...data } : sup
          ),
        })),

      deleteSupplier: (id) =>
        set((s) => ({
          suppliers: s.suppliers.filter((sup) => sup.id !== id),
        })),

      setSuppliers: (suppliers: Supplier[]) => set({ suppliers }),

      // ─── Maintenance ────────────────────────────────────────────────────
      addMaintenance: (maintenanceData: MaintenanceFormData): Maintenance => {
        const state = get();
        const maintenance: Maintenance = {
          id: generateId(),
          stationId: state.stationId,
          equipment: maintenanceData.equipment,
          description: maintenanceData.description,
          status: maintenanceData.status ?? 'scheduled',
          priority: maintenanceData.priority ?? 'medium',
          scheduledDate: maintenanceData.scheduledDate,
          completedDate: maintenanceData.completedDate,
          cost: maintenanceData.cost ?? 0,
          assignedTo: maintenanceData.assignedTo,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          maintenance: [...s.maintenance, maintenance],
        }));
        return maintenance;
      },

      updateMaintenance: (id, data) =>
        set((s) => ({
          maintenance: s.maintenance.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        })),

      deleteMaintenance: (id) =>
        set((s) => ({
          maintenance: s.maintenance.filter((m) => m.id !== id),
        })),

      setMaintenance: (maintenance: Maintenance[]) => set({ maintenance }),

      // ─── Pricing ────────────────────────────────────────────────────────
      setPmsPrice: (price: number) => set({ pmsPrice: price }),
      setAgoPrice: (price: number) => set({ agoPrice: price }),

      // ─── Company ────────────────────────────────────────────────────────
      setCompanyData: (data: Partial<CompanyData>) =>
        set((s) => ({
          companyData: { ...s.companyData, ...data },
        })),

      // ─── Theme ──────────────────────────────────────────────────────────
      toggleTheme: () =>
        set((s) => ({
          theme: s.theme === 'light' ? 'dark' : 'light',
        })),

      setTheme: (theme: Theme) => set({ theme }),

      // ─── General ────────────────────────────────────────────────────────
      setLoading: (isLoading: boolean) => set({ isLoading }),

      resetStore: () => set(initialState),
    }),
    {
      name: 'fuelpro-data',
      partialize: (state) => ({
        stationId: state.stationId,
        salesHistory: state.salesHistory,
        deliveryData: state.deliveryData,
        clients: state.clients,
        invoices: state.invoices,
        employees: state.employees,
        expenses: state.expenses,
        shifts: state.shifts,
        fuelTypes: state.fuelTypes,
        suppliers: state.suppliers,
        maintenance: state.maintenance,
        pmsPrice: state.pmsPrice,
        agoPrice: state.agoPrice,
        companyData: state.companyData,
        theme: state.theme,
      }),
    }
  )
);
