import { useAuthStore } from '@/store/auth-store';

const API_BASE = '';

class ApiClient {
  private getToken(): string | null {
    return useAuthStore.getState().token;
  }

  private getStationId(): string | null {
    return useAuthStore.getState().user?.assignedStations?.[0] || null;
  }

  private async request(path: string, options?: RequestInit): Promise<Response> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const stationId = this.getStationId();
    if (stationId) headers['X-Station-Id'] = stationId;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      // Session expired - trigger logout
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }

    if (res.status === 403) {
      throw new Error('Permission denied');
    }

    return res;
  }

  async get(path: string): Promise<unknown> {
    const res = await this.request(path);
    return res.json();
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const res = await this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async put(path: string, body: unknown): Promise<unknown> {
    const res = await this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async delete(path: string): Promise<unknown> {
    const res = await this.request(path, { method: 'DELETE' });
    return res.json();
  }

  // ─── Typed Entity Methods ──────────────────────────────────────────────

  // Sales
  async getSales(stationId: string, page = 1, pageSize = 50) {
    return this.get(`/api/sales?stationId=${stationId}&page=${page}&pageSize=${pageSize}`);
  }

  async createSale(data: unknown) {
    return this.post('/api/sales', data);
  }

  async updateSale(id: string, data: unknown) {
    return this.put(`/api/sales/${id}`, data);
  }

  async deleteSale(id: string) {
    return this.delete(`/api/sales/${id}`);
  }

  // Deliveries
  async getDeliveries(stationId: string, page = 1, pageSize = 50) {
    return this.get(`/api/deliveries?stationId=${stationId}&page=${page}&pageSize=${pageSize}`);
  }

  async createDelivery(data: unknown) {
    return this.post('/api/deliveries', data);
  }

  async updateDelivery(id: string, data: unknown) {
    return this.put(`/api/deliveries/${id}`, data);
  }

  async deleteDelivery(id: string) {
    return this.delete(`/api/deliveries/${id}`);
  }

  // Clients
  async getClients(stationId: string, page = 1, pageSize = 50) {
    return this.get(`/api/clients?stationId=${stationId}&page=${page}&pageSize=${pageSize}`);
  }

  async createClient(data: unknown) {
    return this.post('/api/clients', data);
  }

  async updateClient(id: string, data: unknown) {
    return this.put(`/api/clients/${id}`, data);
  }

  async deleteClient(id: string) {
    return this.delete(`/api/clients/${id}`);
  }

  // Invoices
  async getInvoices(stationId: string, page = 1, pageSize = 50) {
    return this.get(`/api/invoices?stationId=${stationId}&page=${page}&pageSize=${pageSize}`);
  }

  async createInvoice(data: unknown) {
    return this.post('/api/invoices', data);
  }

  async updateInvoice(id: string, data: unknown) {
    return this.put(`/api/invoices/${id}`, data);
  }

  async deleteInvoice(id: string) {
    return this.delete(`/api/invoices/${id}`);
  }

  // Employees
  async getEmployees(stationId: string, page = 1, pageSize = 50) {
    return this.get(`/api/employees?stationId=${stationId}&page=${page}&pageSize=${pageSize}`);
  }

  async createEmployee(data: unknown) {
    return this.post('/api/employees', data);
  }

  async updateEmployee(id: string, data: unknown) {
    return this.put(`/api/employees/${id}`, data);
  }

  async deleteEmployee(id: string) {
    return this.delete(`/api/employees/${id}`);
  }

  // Expenses
  async getExpenses(stationId: string, page = 1, pageSize = 50) {
    return this.get(`/api/expenses?stationId=${stationId}&page=${page}&pageSize=${pageSize}`);
  }

  async createExpense(data: unknown) {
    return this.post('/api/expenses', data);
  }

  async updateExpense(id: string, data: unknown) {
    return this.put(`/api/expenses/${id}`, data);
  }

  async deleteExpense(id: string) {
    return this.delete(`/api/expenses/${id}`);
  }

  // Shifts
  async getShifts(stationId: string, page = 1, pageSize = 50) {
    return this.get(`/api/shifts?stationId=${stationId}&page=${page}&pageSize=${pageSize}`);
  }

  async createShift(data: unknown) {
    return this.post('/api/shifts', data);
  }

  async updateShift(id: string, data: unknown) {
    return this.put(`/api/shifts/${id}`, data);
  }

  // Fuel Types
  async getFuelTypes(stationId: string) {
    return this.get(`/api/fuel-types?stationId=${stationId}`);
  }

  async createFuelType(data: unknown) {
    return this.post('/api/fuel-types', data);
  }

  async updateFuelType(id: string, data: unknown) {
    return this.put(`/api/fuel-types/${id}`, data);
  }

  async deleteFuelType(id: string) {
    return this.delete(`/api/fuel-types/${id}`);
  }

  // Suppliers
  async getSuppliers(stationId: string) {
    return this.get(`/api/suppliers?stationId=${stationId}`);
  }

  async createSupplier(data: unknown) {
    return this.post('/api/suppliers', data);
  }

  async updateSupplier(id: string, data: unknown) {
    return this.put(`/api/suppliers/${id}`, data);
  }

  async deleteSupplier(id: string) {
    return this.delete(`/api/suppliers/${id}`);
  }

  // Maintenance
  async getMaintenance(stationId: string) {
    return this.get(`/api/maintenance?stationId=${stationId}`);
  }

  async createMaintenance(data: unknown) {
    return this.post('/api/maintenance', data);
  }

  async updateMaintenance(id: string, data: unknown) {
    return this.put(`/api/maintenance/${id}`, data);
  }

  async deleteMaintenance(id: string) {
    return this.delete(`/api/maintenance/${id}`);
  }

  // Dashboard
  async getDashboardStats(stationId: string) {
    return this.get(`/api/dashboard?stationId=${stationId}`);
  }

  // Audit Logs
  async getAuditLogs(params: { stationId: string; action?: string; resourceType?: string; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, v as string])
    ).toString();
    return this.get(`/api/audit-logs?${query}`);
  }

  // Auth
  async login(email: string, password: string) {
    return this.post('/api/auth/login', { email, password });
  }

  async register(data: { email: string; name: string; password: string; phone?: string }) {
    return this.post('/api/auth/register', data);
  }

  async validateSession() {
    return this.get('/api/auth/session');
  }

  async logout() {
    return this.post('/api/auth/logout', {});
  }
}

export const api = new ApiClient();
