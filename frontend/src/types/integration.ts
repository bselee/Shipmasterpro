export interface Integration {
  _id: string;
  name: string;
  type: 'shopify' | 'quickbooks' | 'bill.com' | 'aftership' | 'custom';
  config: {
    shopUrl?: string;
    apiVersion?: string;
    companyId?: string;
    tokenExpiry?: Date;
    baseUrl?: string;
    headers?: Record<string, string>;
    authentication?: {
      type: 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';
      apiKey?: string;
      apiKeyHeader?: string;
      bearerToken?: string;
      username?: string;
      password?: string;
    };
  };
  status: {
    connected: boolean;
    lastConnected?: Date;
    lastSync?: Date;
    lastError?: string;
    errorCount: number;
    consecutiveErrors: number;
  };
  syncSettings: {
    enabled: boolean;
    frequency: number;
    autoSync: boolean;
    syncDirection: 'import' | 'export' | 'bidirectional';
    lastSyncId?: string;
    batchSize: number;
  };
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    dataTransferred: number;
    lastResetDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationStats {
  totalIntegrations: number;
  connectedIntegrations: number;
  totalSyncs: number;
  failedSyncs: number;
  dataVolume: number;
  recentActivity: Activity[];
}

export interface Activity {
  timestamp: Date;
  type: string;
  integration: string;
  message: string;
  status: 'success' | 'error' | 'warning';
}

export interface DiagnosticsResult {
  integration: string;
  type: string;
  status: boolean;
  issues: DiagnosticIssue[];
  recommendations: string[];
  details: Record<string, any>;
}

export interface DiagnosticIssue {
  severity: 'error' | 'warning' | 'info';
  type: string;
  message: string;
  details?: string;
}

export interface ApiLog {
  _id: string;
  integrationId: string;
  endpoint: string;
  method: string;
  requestHeaders?: Record<string, any>;
  requestBody?: any;
  responseStatus: number;
  responseHeaders?: Record<string, any>;
  responseBody?: any;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export interface CreateIntegrationData {
  name: string;
  type: Integration['type'];
  config: any;
  syncSettings?: Partial<Integration['syncSettings']>;
}