// API client for backend communication
// Handles all HTTP requests to the Node.js + Express backend
import type { MonthlyCustomer, Rate, Vehicle, CompanyConfig, Payment } from '@/contexts/ParkingContext';

// Lightweight user type (matches backend authController toFrontendUser)
export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  login: string;
  role: string; // 'admin' | 'operator'
  permissions?: Record<string, any>;
}

// Default to Vite proxy path so browser calls are forwarded to the backend even in Codespaces
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token?: string | null) {
    this.authToken = token || null;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Attempt to parse JSON error payload
        const payload = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errField = (payload && (payload.error ?? payload.message)) as any;
        let message: string;
        if (typeof errField === 'string') {
          message = errField;
        } else if (errField && typeof errField === 'object' && typeof errField.message === 'string') {
          message = errField.message;
        } else if (payload && typeof payload.details === 'string') {
          message = payload.details;
        } else if (payload && typeof payload.hint === 'string') {
          message = payload.hint;
        } else {
          // Fallback to status text and payload stringified (truncated)
          const json = JSON.stringify(payload);
          message = json && json.length < 200 ? json : `HTTP ${response.status}: ${response.statusText}`;
        }
        if (response.status === 401) {
          throw new Error(message || 'Unauthorized');
        }
        throw new Error(message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (response.status === 204) {
        return null as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Rates endpoints
  async getRates() {
    return this.request<Rate[]>('/rates');
  }

  async createRate(rate: Omit<Rate, 'id'>) {
    return this.request<Rate>('/rates', {
      method: 'POST',
      body: JSON.stringify(rate),
    });
  }

  async updateRate(id: string, rate: Partial<Rate>) {
    return this.request<Rate>(`/rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rate),
    });
  }

  async deleteRate(id: string) {
    return this.request<void>(`/rates/${id}`, {
      method: 'DELETE',
    });
  }

  // Monthly customers endpoints
  async getMonthlyCustomers() {
    return this.request<MonthlyCustomer[]>('/monthlyCustomers');
  }

  async createMonthlyCustomer(customer: Omit<MonthlyCustomer, 'id' | 'paymentHistory'>) {
    return this.request<MonthlyCustomer>('/monthlyCustomers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async updateMonthlyCustomer(id: string, customer: Partial<MonthlyCustomer>) {
    return this.request<MonthlyCustomer>(`/monthlyCustomers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  }

  async deleteMonthlyCustomer(id: string) {
    return this.request<void>(`/monthlyCustomers/${id}`, {
      method: 'DELETE',
    });
  }

  async registerMonthlyPayment(customerId: string, payment: { value: number; method: string }) {
    return this.request<{ customer: MonthlyCustomer; payment: Payment }>(`/monthlyCustomers/${customerId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Tickets endpoints (vehicle entry/exit)
  async createTicket(ticket: { vehicle_plate: string; vehicle_type: string }) {
    return this.request<any>('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  async processTicketExit(ticketId: string, exitData: { method: string }) {
    return this.request<any>(`/tickets/${ticketId}/exit`, {
      method: 'POST',
      body: JSON.stringify(exitData),
    });
  }

  async getTicket(ticketId: string) {
    return this.request<any>(`/tickets/${ticketId}`);
  }

  // Payments endpoints
  async getPayments(filters?: { start?: string; end?: string }) {
    const params = new URLSearchParams();
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    const query = params.toString();
    return this.request<any[]>(`/payments${query ? `?${query}` : ''}`);
  }

  async createPayment(payment: any) {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Reports endpoints
  async getFinancialReport(filters?: { start?: string; end?: string }) {
    const params = new URLSearchParams();
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    const query = params.toString();
    return this.request<any>(`/reports${query ? `?${query}` : ''}`);
  }

  // Company config endpoints
  async getCompanyConfig() {
    return this.request<CompanyConfig>('/companyConfig');
  }

  async updateCompanyConfig(config: Partial<CompanyConfig>) {
    return this.request<CompanyConfig>('/companyConfig', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Legacy vehicles endpoint (if backend still supports it)
  async getVehicles() {
    try {
      return await this.request<Vehicle[]>('/vehicles');
    } catch (error) {
      console.warn('Vehicles endpoint not available, using tickets instead');
      return [];
    }
  }

  async createVehicle(vehicle: Omit<Vehicle, 'id'>) {
    try {
      return await this.request<Vehicle>('/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicle),
      });
    } catch (error) {
      // Fallback to tickets
      return this.createTicket({
        vehicle_plate: vehicle.plate,
        vehicle_type: vehicle.vehicleType,
      });
    }
  }

  async updateVehicle(id: string, vehicle: Partial<Vehicle>) {
    return this.request<Vehicle>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vehicle),
    });
  }

  async deleteVehicle(id: string) {
    return this.request<void>(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  }

  // Vehicle types endpoints
  async getVehicleTypes() {
    return this.request<any[]>('/vehicleTypes');
  }

  async createVehicleType(name: string) {
    return this.request<any>('/vehicleTypes', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteVehicleType(id: string) {
    return this.request<void>(`/vehicleTypes/${id}`, {
      method: 'DELETE',
    });
  }

  // =====================
  // Auth endpoints
  // =====================
  async login(credentials: { login: string; password: string }) {
    return this.request<{ 
      token: string; 
      user: AuthUser;
      mustChangePassword?: boolean;
      isFirstLogin?: boolean;
    }>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser() {
    return this.request<{ user: AuthUser }>(`/auth/me`);
  }

  async changePassword(data: { currentPassword?: string; newPassword: string }) {
    return this.request<void>(`/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Users (admin) endpoints
  async getUsers() {
    return this.request<AuthUser[]>(`/users`);
  }

  async createUser(user: { name: string; email: string; login: string; password: string; role: string; permissions?: Record<string, boolean> }) {
    return this.request<AuthUser>(`/users`, {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id: string, patch: Partial<{ name: string; email: string; login: string; role: string; permissions: Record<string, boolean> }>) {
    return this.request<AuthUser>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  }

  async updateUserPassword(id: string, password: string) {
    return this.request<void>(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword: password }),
    });
  }

  async updateOwnPassword(id: string, oldPassword: string, newPassword: string) {
    return this.request<void>(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  async validatePasswordStrength(password: string) {
    return this.request<{
      valid: boolean;
      strength: { score: number };
      errors: string[];
    }>(`/auth/validate-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async getPasswordRequirements() {
    return this.request<{
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    }>(`/auth/password-requirements`);
  }

  async deleteUser(id: string) {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Audit endpoints
  async createAuditEvent(payload: { action: string; targetType?: string; targetId?: string; details?: any }) {
    return this.request<{ id: string }>(`/audit/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAuditEvents(params?: { start?: string; end?: string; action?: string; actorId?: string }) {
    const query = new URLSearchParams();
    if (params?.start) query.append('start', params.start);
    if (params?.end) query.append('end', params.end);
    if (params?.action) query.append('action', params.action);
    if (params?.actorId) query.append('actorId', params.actorId);
    const queryString = query.toString();
    return this.request<Array<{
      id: string;
      actor_id: string;
      actor_login: string;
      actor_name: string;
      action: string;
      target_type: string | null;
      target_id: string | null;
      details: string | null;
      created_at: string;
    }>>(`/audit/events${queryString ? `?${queryString}` : ''}`);
  }

  // Backup endpoints
  async createBackup() {
    return this.request<{ id: string; filename: string; size: number }>(`/backup`, { method: 'POST' });
  }

  async listBackups() {
    return this.request<Array<{ id: string; filename: string; size: number; timestamp: string }>>(`/backup`);
  }

  async downloadBackup(id: string) {
    const url = `${this.baseUrl}/backup/${encodeURIComponent(id)}`;
    const headers: Record<string, string> = {};
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(payload.error || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    return blob;
  }

  async previewBackup(id: string) {
    return this.request<any>(`/backup/${encodeURIComponent(id)}/preview`);
  }

  async restoreBackup(id: string, tables?: string[]) {
    return this.request<any>(`/backup/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      body: JSON.stringify({ tables }),
    });
  }

  async deleteBackup(id: string) {
    return this.request<void>(`/backup/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async getBackupConfig() {
    return this.request<{ enabled: boolean; schedule: string; retentionDays: number }>(`/backup-config`);
  }

  async updateBackupConfig(config: { enabled?: boolean; schedule?: string; retentionDays?: number }) {
    return this.request<{ enabled: boolean; schedule: string; retentionDays: number }>(`/backup-config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async triggerAutoBackup() {
    return this.request<any>(`/backup-config/trigger`, {
      method: 'POST',
    });
  }

  // =====================
  // Monthly Reports (Financial Cycle Closure)
  // =====================
  async generateMonthlyReport(data?: { month?: number; year?: number; clearOperational?: boolean }) {
    return this.request<{
      success: boolean;
      message: string;
      report: {
        id: string;
        month: number;
        year: number;
        totalRevenue: number;
        avulsosRevenue: number;
        mensalistasRevenue: number;
        totalTickets: number;
        ticketsClosed: number;
        operationalCleared: boolean;
        generatedAt: string;
      };
    }>(`/reports/monthly`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async getMonthlyReports(params?: { year?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.year) query.append('year', params.year.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryString = query.toString();
    return this.request<Array<{
      id: string;
      report_month: number;
      report_year: number;
      generated_at: string;
      operator_name: string;
      total_revenue: number;
      avulsos_revenue: number;
      mensalistas_revenue: number;
      status: string;
    }>>(`/reports/monthly${queryString ? `?${queryString}` : ''}`);
  }

  async getMonthlyReportById(id: string) {
    return this.request<any>(`/reports/monthly/${id}`);
  }

  async deleteMonthlyReport(id: string) {
    return this.request<void>(`/reports/monthly/${id}`, {
      method: 'DELETE',
    });
  }

  // Pricing Rules endpoints
  async getPricingRules(rateId: string) {
    return this.request<any[]>(`/pricing-rules/rate/${rateId}`);
  }

  async createPricingRule(rule: any) {
    return this.request<any>('/pricing-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updatePricingRule(id: string, updates: any) {
    return this.request<any>(`/pricing-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deletePricingRule(id: string) {
    return this.request<void>(`/pricing-rules/${id}`, {
      method: 'DELETE',
    });
  }

  async togglePricingRule(id: string, isActive: boolean) {
    return this.request<any>(`/pricing-rules/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
