// API client for backend communication
// Handles all HTTP requests to the Node.js + Express backend
import type {
  MonthlyCustomer,
  Rate,
  Vehicle,
  CompanyConfig,
  Payment,
} from '@/contexts/ParkingContext';

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
let apiBase = import.meta.env.VITE_API_URL || '/api';

// Normalize: remove trailing slash, extract base URL (remove any existing paths), then add /api
if (apiBase.endsWith('/')) {
  apiBase = apiBase.slice(0, -1);
}

// If it's a full URL (starts with http:// or https://), extract just the origin
// This handles cases where VITE_API_URL might include paths like /health
if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
  try {
    const url = new URL(apiBase);
    apiBase = `${url.protocol}//${url.host}`;
  } catch (e) {
    // If URL parsing fails, try to extract origin manually
    const match = apiBase.match(/^(https?:\/\/[^\/]+)/);
    if (match) {
      apiBase = match[1];
    }
  }
}

// Ensure it ends with /api
if (!apiBase.endsWith('/api')) {
  apiBase = `${apiBase}/api`;
}

const API_BASE_URL = apiBase;

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
      ...((options?.headers as Record<string, string>) || {}),
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

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!response.ok) {
        // If not JSON, read as text to see what we got
        if (!isJson) {
          const text = await response.text();
          console.error(`Non-JSON error response from ${url}:`, text.substring(0, 300));
          throw new Error(
            `Server returned non-JSON response (${response.status}): ${response.statusText}`
          );
        }

        // Attempt to parse JSON error payload
        // Clone response first in case parsing fails
        const clonedResponse = response.clone();
        let payload: any;
        try {
          payload = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, read cloned response as text for debugging
          const text = await clonedResponse.text().catch(() => 'Unable to read response');
          console.error(`Failed to parse error JSON from ${url}:`, text.substring(0, 300));
          payload = { error: 'Unknown error' };
        }

        const errField = (payload && (payload.error ?? payload.message)) as any;
        let message: string;
        if (typeof errField === 'string') {
          message = errField;
        } else if (
          errField &&
          typeof errField === 'object' &&
          typeof errField.message === 'string'
        ) {
          message = errField.message;
        } else if (payload && typeof payload.details === 'string') {
          message = payload.details;
        } else if (payload && typeof payload.hint === 'string') {
          message = payload.hint;
        } else {
          // Fallback to status text and payload stringified (truncated)
          const json = JSON.stringify(payload);
          message =
            json && json.length < 200 ? json : `HTTP ${response.status}: ${response.statusText}`;
        }
        if (response.status === 401) {
          throw new Error(message || 'Unauthorized');
        }
        throw new Error(message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (response.status === 204) {
        return null as T;
      }

      // Verify response is JSON before parsing
      if (!isJson) {
        const text = await response.text();
        console.error(`Non-JSON response from ${url}:`, text.substring(0, 300));
        throw new Error('Server returned non-JSON response');
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
    return this.request<{ customer: MonthlyCustomer; payment: Payment }>(
      `/monthlyCustomers/${customerId}/pay`,
      {
        method: 'POST',
        body: JSON.stringify(payment),
      }
    );
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

  // Setup endpoints
  async resetToFirstRun() {
    return this.request<{ success: boolean; message: string }>('/setup/reset-to-first-run', {
      method: 'POST',
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

  async createUser(user: {
    name: string;
    email: string;
    login: string;
    password: string;
    role: string;
    permissions?: Record<string, boolean>;
  }) {
    return this.request<AuthUser>(`/users`, {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(
    id: string,
    patch: Partial<{
      name: string;
      email: string;
      login: string;
      role: string;
      permissions: Record<string, boolean>;
    }>
  ) {
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
  async createAuditEvent(payload: {
    action: string;
    targetType?: string;
    targetId?: string;
    details?: any;
  }) {
    return this.request<{ id: string }>(`/audit/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAuditEvents(params?: {
    start?: string;
    end?: string;
    action?: string;
    actorId?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.start) query.append('start', params.start);
    if (params?.end) query.append('end', params.end);
    if (params?.action) query.append('action', params.action);
    if (params?.actorId) query.append('actorId', params.actorId);
    const queryString = query.toString();
    return this.request<
      Array<{
        id: string;
        actor_id: string;
        actor_login: string;
        actor_name: string;
        action: string;
        target_type: string | null;
        target_id: string | null;
        details: string | null;
        created_at: string;
      }>
    >(`/audit/events${queryString ? `?${queryString}` : ''}`);
  }

  // Backup endpoints
  async createBackup() {
    return this.request<{ id: string; filename: string; size: number }>(`/backup`, {
      method: 'POST',
    });
  }

  async listBackups() {
    return this.request<Array<{ id: string; filename: string; size: number; timestamp: string }>>(
      `/backup`
    );
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
    return this.request<{ enabled: boolean; schedule: string; retentionDays: number }>(
      `/backup-config`
    );
  }

  async updateBackupConfig(config: {
    enabled?: boolean;
    schedule?: string;
    retentionDays?: number;
  }) {
    return this.request<{ enabled: boolean; schedule: string; retentionDays: number }>(
      `/backup-config`,
      {
        method: 'PUT',
        body: JSON.stringify(config),
      }
    );
  }

  async triggerAutoBackup() {
    return this.request<any>(`/backup-config/trigger`, {
      method: 'POST',
    });
  }

  // =====================
  // Monthly Reports (Financial Cycle Closure)
  // =====================
  async generateMonthlyReport(data?: {
    month?: number;
    year?: number;
    clearOperational?: boolean;
  }) {
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
    return this.request<
      Array<{
        id: string;
        report_month: number;
        report_year: number;
        generated_at: string;
        operator_name: string;
        total_revenue: number;
        avulsos_revenue: number;
        mensalistas_revenue: number;
        status: string;
      }>
    >(`/reports/monthly${queryString ? `?${queryString}` : ''}`);
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

  // Rate time windows (diária, pernoite, etc.)
  async getRateTimeWindows(rateId: string) {
    return this.request<any[]>(`/rates/${rateId}/windows`);
  }

  async createRateTimeWindow(rateId: string, window: any) {
    return this.request<any>(`/rates/${rateId}/windows`, {
      method: 'POST',
      body: JSON.stringify(window),
    });
  }

  async updateRateTimeWindow(id: string, window: any) {
    return this.request<any>(`/rate-windows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(window),
    });
  }

  async deleteRateTimeWindow(id: string) {
    return this.request<void>(`/rate-windows/${id}`, {
      method: 'DELETE',
    });
  }

  // Rate thresholds (teto/sugestões)
  async getRateThresholds(rateId: string) {
    return this.request<any[]>(`/rates/${rateId}/thresholds`);
  }

  async createRateThreshold(rateId: string, payload: any) {
    return this.request<any>(`/rates/${rateId}/thresholds`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateRateThreshold(id: string, payload: any) {
    return this.request<any>(`/rate-thresholds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteRateThreshold(id: string) {
    return this.request<void>(`/rate-thresholds/${id}`, {
      method: 'DELETE',
    });
  }

  // Receipt Templates endpoints
  async getReceiptTemplates(type?: string) {
    const query = type && type !== 'all' ? `?type=${type}` : '';
    return this.request<any[]>(`/receipt-templates${query}`);
  }

  async createReceiptTemplate(template: any) {
    return this.request<any>('/receipt-templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateReceiptTemplate(id: string, template: any) {
    return this.request<any>(`/receipt-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  async deleteReceiptTemplate(id: string) {
    return this.request<void>(`/receipt-templates/${id}`, {
      method: 'DELETE',
    });
  }

  async setDefaultReceiptTemplate(id: string) {
    return this.request<any>(`/receipt-templates/${id}/set-default`, {
      method: 'POST',
    });
  }

  async cloneReceiptTemplate(id: string) {
    return this.request<any>(`/receipt-templates/${id}/clone`, {
      method: 'POST',
    });
  }

  // Business Hours endpoints
  async getBusinessHours() {
    return this.request<any[]>('/business-hours');
  }

  async updateBusinessHours(dayOfWeek: number, data: any) {
    return this.request<any>(`/business-hours/${dayOfWeek}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Holidays endpoints
  async getHolidays(upcoming?: boolean) {
    const query = upcoming ? '?upcoming=true' : '';
    return this.request<any[]>(`/holidays${query}`);
  }

  async createHoliday(data: any) {
    return this.request<any>('/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHoliday(id: string, data: any) {
    return this.request<any>(`/holidays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteHoliday(id: string) {
    return this.request<void>(`/holidays/${id}`, {
      method: 'DELETE',
    });
  }

  // Special Events endpoints
  async getSpecialEvents(active?: boolean) {
    const query = active ? '?active=true' : '';
    return this.request<any[]>(`/special-events${query}`);
  }

  async createSpecialEvent(data: any) {
    return this.request<any>('/special-events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSpecialEvent(id: string, data: any) {
    return this.request<any>(`/special-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSpecialEvent(id: string) {
    return this.request<void>(`/special-events/${id}`, {
      method: 'DELETE',
    });
  }

  // Operational Status endpoint
  async getOperationalStatus() {
    return this.request<any>('/operational-status');
  }

  // Printer jobs (Print Agent)
  async enqueuePrinterJob(job: {
    jobType: string;
    payload: any;
    printerProfile?: string;
    priority?: number;
    scheduledFor?: string;
    jobKey?: string;
    maxRetries?: number;
  }) {
    return this.request<{ job: any; duplicate?: boolean }>('/printer-jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  async listPrinterJobs(params?: {
    status?: string[] | string;
    jobType?: string[] | string;
    limit?: number;
    since?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.status) {
      const values = Array.isArray(params.status) ? params.status : [params.status];
      values.forEach((value) => query.append('status', value));
    }
    if (params?.jobType) {
      const values = Array.isArray(params.jobType) ? params.jobType : [params.jobType];
      values.forEach((value) => query.append('jobType', value));
    }
    if (typeof params?.limit === 'number') query.set('limit', params.limit.toString());
    if (params?.since) query.set('since', params.since);
    if (params?.search) query.set('search', params.search);
    const queryString = query.toString();
    return this.request<{ jobs: any[] }>(`/printer-jobs${queryString ? `?${queryString}` : ''}`);
  }

  async getPrinterJob(id: string) {
    return this.request<{ job: any; events: any[] }>(`/printer-jobs/${id}`);
  }

  async cancelPrinterJob(id: string, reason?: string) {
    return this.request<{ job: any }>(`/printer-jobs/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getPrinterJobStatuses() {
    return this.request<{ statuses: Record<string, string> }>('/printer-jobs/statuses');
  }

  // Expenses endpoints
  async getExpenses(filters?: { start?: string; end?: string; category?: string; status?: string }) {
    const query = new URLSearchParams();
    if (filters?.start) query.set('start', filters.start);
    if (filters?.end) query.set('end', filters.end);
    if (filters?.category) query.set('category', filters.category);
    if (filters?.status) query.set('status', filters.status);
    const queryString = query.toString();
    return this.request<any[]>(`/expenses${queryString ? `?${queryString}` : ''}`);
  }

  async getExpense(id: string) {
    return this.request<any>(`/expenses/${id}`);
  }

  async createExpense(expense: {
    name: string;
    value: number;
    dueDate: string;
    paymentDate?: string | null;
    category: 'Contas' | 'Manutenção' | 'Pró-labore' | 'Impostos';
    isRecurring?: boolean;
    recurringFrequency?: 'monthly' | 'weekly' | 'yearly' | null;
    notes?: string | null;
  }) {
    return this.request<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  async updateExpense(id: string, expense: Partial<{
    name: string;
    value: number;
    dueDate: string;
    paymentDate: string | null;
    category: 'Contas' | 'Manutenção' | 'Pró-labore' | 'Impostos';
    isRecurring: boolean;
    recurringFrequency: 'monthly' | 'weekly' | 'yearly' | null;
    notes: string | null;
  }>) {
    return this.request<any>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  }

  async deleteExpense(id: string) {
    return this.request<void>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Manual Revenues endpoints
  async getManualRevenues(filters?: { start?: string; end?: string; category?: string }) {
    const query = new URLSearchParams();
    if (filters?.start) query.set('start', filters.start);
    if (filters?.end) query.set('end', filters.end);
    if (filters?.category) query.set('category', filters.category);
    const queryString = query.toString();
    return this.request<any[]>(`/manual-revenues${queryString ? `?${queryString}` : ''}`);
  }

  async getManualRevenue(id: string) {
    return this.request<any>(`/manual-revenues/${id}`);
  }

  async createManualRevenue(revenue: {
    description: string;
    value: number;
    date: string;
    category: string; // Campo livre agora
    status?: 'Pago' | 'Não Pago';
    notes?: string | null;
  }) {
    return this.request<any>('/manual-revenues', {
      method: 'POST',
      body: JSON.stringify(revenue),
    });
  }

  async updateManualRevenue(id: string, revenue: Partial<{
    description: string;
    value: number;
    date: string;
    category: string; // Campo livre agora
    status: 'Pago' | 'Não Pago';
    notes: string | null;
  }>) {
    return this.request<any>(`/manual-revenues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(revenue),
    });
  }

  async deleteManualRevenue(id: string) {
    return this.request<void>(`/manual-revenues/${id}`, {
      method: 'DELETE',
    });
  }

  // Convenios endpoints
  async getConvenios(filters?: { status?: string; tipo?: string; categoria?: string; busca?: string }) {
    const query = new URLSearchParams();
    if (filters?.status && filters.status !== 'todos') query.set('status', filters.status);
    if (filters?.tipo && filters.tipo !== 'todos') query.set('tipo', filters.tipo);
    if (filters?.categoria && filters.categoria !== 'todos') query.set('categoria', filters.categoria);
    if (filters?.busca) query.set('busca', filters.busca);
    const queryString = query.toString();
    return this.request<any[]>(`/convenios${queryString ? `?${queryString}` : ''}`);
  }

  async getConvenioById(id: string) {
    return this.request<any>(`/convenios/${id}`);
  }

  async getConvenioStats() {
    return this.request<any>('/convenios/stats');
  }

  async getConveniosRanking() {
    return this.request<any[]>('/convenios/relatorios/ocupacao');
  }

  async createConvenio(convenio: any) {
    return this.request<any>('/convenios', {
      method: 'POST',
      body: JSON.stringify(convenio),
    });
  }

  async updateConvenio(id: string, updates: any) {
    return this.request<any>(`/convenios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteConvenio(id: string) {
    return this.request<void>(`/convenios/${id}`, {
      method: 'DELETE',
    });
  }

  async getConveniosRelatoriosFaturas(filters?: { status?: string; periodo?: string; data_inicio?: string; data_fim?: string }) {
    const query = new URLSearchParams();
    if (filters?.status) query.set('status', filters.status);
    if (filters?.periodo) query.set('periodo', filters.periodo);
    if (filters?.data_inicio) query.set('data_inicio', filters.data_inicio);
    if (filters?.data_fim) query.set('data_fim', filters.data_fim);
    const queryString = query.toString();
    return this.request<any[]>(`/convenios/relatorios/faturas${queryString ? `?${queryString}` : ''}`);
  }

  async getConvenioMovimentacoes(convenioId: string, filters?: { data_inicio?: string; data_fim?: string; placa?: string; faturado?: boolean }) {
    const query = new URLSearchParams();
    if (filters?.data_inicio) query.set('data_inicio', filters.data_inicio);
    if (filters?.data_fim) query.set('data_fim', filters.data_fim);
    if (filters?.placa) query.set('placa', filters.placa);
    if (filters?.faturado !== undefined) query.set('faturado', String(filters.faturado));
    const queryString = query.toString();
    return this.request<any[]>(`/convenios/${convenioId}/movimentacoes${queryString ? `?${queryString}` : ''}`);
  }

  async getConvenioDocumentos(convenioId: string) {
    return this.request<any[]>(`/convenios/${convenioId}/documentos`);
  }

  async addConvenioVeiculo(convenioId: string, veiculo: any) {
    return this.request<any>(`/convenios/${convenioId}/veiculos`, {
      method: 'POST',
      body: JSON.stringify(veiculo),
    });
  }

  async uploadConvenioDocumento(convenioId: string, documento: any) {
    return this.request<any>(`/convenios/${convenioId}/documentos`, {
      method: 'POST',
      body: JSON.stringify(documento),
    });
  }

  async deleteConvenioDocumento(convenioId: string, docId: string) {
    return this.request<void>(`/convenios/${convenioId}/documentos/${docId}`, {
      method: 'DELETE',
    });
  }

  // Notificações
  async getNotificacoes(unreadOnly?: boolean) {
    const query = unreadOnly ? '?unreadOnly=true' : '';
    return this.request<any[]>(`/notificacoes${query}`);
  }

  async countNotificacoes() {
    return this.request<{ count: number }>('/notificacoes/count');
  }

  async markNotificacaoRead(id: string) {
    return this.request<any>(`/notificacoes/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificacoesRead() {
    return this.request<any>('/notificacoes/read-all', {
      method: 'PATCH',
    });
  }

  // Jobs
  async runConveniosJob(jobName: 'verificar-vencimentos' | 'verificar-faturas-atrasadas') {
    return this.request<any>(`/convenios/jobs/${jobName}`, {
      method: 'POST',
    });
  }

  // Cash Register endpoints
  async openCashRegister(data: { openingAmount: number; operatorName: string }) {
    return this.request<{
      success: boolean;
      session: {
        id: string;
        openedAt: string;
        openingAmount: number;
        operatorName: string;
      };
    }>('/cash-register/open', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentCashRegisterSession() {
    return this.request<{
      isOpen: boolean;
      session: {
        id: string;
        openedAt: string;
        openingAmount: number;
        operatorName: string;
        operatorId?: string;
      } | null;
    }>('/cash-register/current');
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
