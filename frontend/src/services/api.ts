import axios, { AxiosInstance } from 'axios';
import { Integration, CreateIntegrationData, DiagnosticsResult, ApiLog } from '../types/integration';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Integration endpoints
  async getIntegrations(): Promise<Integration[]> {
    const response = await this.api.get('/integrations');
    return response.data;
  }

  async getIntegration(id: string): Promise<Integration> {
    const response = await this.api.get(`/integrations/${id}`);
    return response.data;
  }

  async createIntegration(data: CreateIntegrationData): Promise<Integration> {
    const response = await this.api.post('/integrations', data);
    return response.data.integration;
  }

  async updateIntegration(id: string, data: Partial<Integration>): Promise<Integration> {
    const response = await this.api.put(`/integrations/${id}`, data);
    return response.data;
  }

  async deleteIntegration(id: string): Promise<void> {
    await this.api.delete(`/integrations/${id}`);
  }

  async testConnection(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await this.api.post(`/integrations/${id}/test`);
    return response.data;
  }

  async syncData(id: string, syncType: string): Promise<any> {
    const response = await this.api.post(`/integrations/${id}/sync`, { syncType });
    return response.data;
  }

  async getIntegrationLogs(id: string, params?: { page?: number; limit?: number; level?: string }): Promise<{
    logs: ApiLog[];
    totalPages: number;
    currentPage: number;
    total: number;
  }> {
    const response = await this.api.get(`/integrations/${id}/logs`, { params });
    return response.data;
  }

  async getLogDetail(integrationId: string, logId: string): Promise<ApiLog> {
    const response = await this.api.get(`/integrations/${integrationId}/logs/${logId}`);
    return response.data;
  }

  async diagnoseIntegration(id: string): Promise<DiagnosticsResult> {
    const response = await this.api.get(`/integrations/${id}/diagnose`);
    return response.data;
  }

  async getIntegrationStats(id: string): Promise<any> {
    const response = await this.api.get(`/integrations/${id}/stats`);
    return response.data;
  }

  // Tag endpoints
  async getTags(params?: { category?: string; search?: string }): Promise<any[]> {
    const response = await this.api.get('/tags', { params });
    return response.data.tags;
  }

  async createTag(data: any): Promise<any> {
    const response = await this.api.post('/tags', data);
    return response.data;
  }

  async applyTags(entityType: string, entityId: string, tagIds: string[]): Promise<any> {
    const response = await this.api.post('/tags/apply', {
      entityType,
      entityId,
      tagIds
    });
    return response.data;
  }

  async removeTags(entityType: string, entityId: string, tagIds: string[]): Promise<any> {
    const response = await this.api.post('/tags/remove', {
      entityType,
      entityId,
      tagIds
    });
    return response.data;
  }

  async getSuggestedTags(orderId: string): Promise<any[]> {
    const response = await this.api.get(`/tags/suggest/${orderId}`);
    return response.data;
  }

  // Order endpoints
  async getOrders(params?: any): Promise<any> {
    const response = await this.api.get('/orders', { params });
    return response.data;
  }

  async createOrder(data: any): Promise<any> {
    const response = await this.api.post('/orders', data);
    return response.data;
  }

  async updateOrder(id: string, data: any): Promise<any> {
    const response = await this.api.put(`/orders/${id}`, data);
    return response.data;
  }

  // Shipping endpoints
  async calculateRates(data: any): Promise<any> {
    const response = await this.api.post('/shipping/rates', data);
    return response.data;
  }

  async createLabel(data: any): Promise<any> {
    const response = await this.api.post('/shipping/labels', data);
    return response.data;
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: any): Promise<{ token: string; user: any }> {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }
}

export const apiService = new ApiService();