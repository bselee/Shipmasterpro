// ShipMaster Pro - Comprehensive API Integration Backend
// Native integrations for Shopify, QuickBooks, Bill.com, AfterShip + Custom APIs

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');

// API Integration Schema
const apiIntegrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['shopify', 'quickbooks', 'bill.com', 'aftership', 'custom', 'woocommerce', 'amazon', 'ebay'],
    required: true 
  },
  
  // Connection Configuration
  config: {
    // Shopify
    shopUrl: String,
    accessToken: String,
    apiVersion: { type: String, default: '2023-07' },
    
    // QuickBooks
    companyId: String,
    accessToken: String,
    refreshToken: String,
    tokenExpiry: Date,
    
    // Bill.com
    sessionId: String,
    organizationId: String,
    devKey: String,
    
    // AfterShip
    apiKey: String,
    
    // Custom API
    baseUrl: String,
    headers: Object,
    authentication: {
      type: { type: String, enum: ['none', 'api_key', 'bearer', 'basic', 'oauth2'] },
      apiKey: String,
      apiKeyHeader: String,
      bearerToken: String,
      username: String,
      password: String,
      oauth2: {
        clientId: String,
        clientSecret: String,
        tokenUrl: String,
        scope: String
      }
    }
  },
  
  // Connection Status
  status: {
    connected: { type: Boolean, default: false },
    lastConnected: Date,
    lastSync: Date,
    lastError: String,
    errorCount: { type: Number, default: 0 },
    consecutiveErrors: { type: Number, default: 0 }
  },
  
  // Sync Settings
  syncSettings: {
    enabled: { type: Boolean, default: true },
    frequency: { type: Number, default: 15 }, // minutes
    autoSync: { type: Boolean, default: true },
    syncDirection: { 
      type: String, 
      enum: ['import', 'export', 'bidirectional'], 
      default: 'import' 
    },
    lastSyncId: String,
    batchSize: { type: Number, default: 100 }
  },
  
  // Data Mapping
  fieldMapping: {
    orders: Object,
    products: Object,
    customers: Object,
    invoices: Object,
    tracking: Object
  },
  
  // Webhooks
  webhooks: {
    enabled: { type: Boolean, default: false },
    url: String,
    secret: String,
    events: [String]
  },
  
  // Rate Limiting
  rateLimits: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerHour: { type: Number, default: 3600 },
    burstLimit: { type: Number, default: 10 }
  },
  
  // Statistics
  stats: {
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    dataTransferred: { type: Number, default: 0 }, // bytes
    lastResetDate: { type: Date, default: Date.now }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// API Log Schema for monitoring
const apiLogSchema = new mongoose.Schema({
  integrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiIntegration' },
  endpoint: String,
  method: String,
  requestHeaders: Object,
  requestBody: Object,
  responseStatus: Number,
  responseHeaders: Object,
  responseBody: Object,
  responseTime: Number,
  error: String,
  timestamp: { type: Date, default: Date.now }
});

const ApiIntegration = mongoose.model('ApiIntegration', apiIntegrationSchema);
const ApiLog = mongoose.model('ApiLog', apiLogSchema);

// Base API Client Class
class BaseApiClient {
  constructor(integration) {
    this.integration = integration;
    this.config = integration.config;
    this.rateLimiter = new Map();
  }

  async makeRequest(endpoint, options = {}) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      // Rate limiting check
      await this.checkRateLimit();
      
      // Prepare request
      const requestConfig = await this.prepareRequest(endpoint, options);
      
      // Log request
      const logEntry = {
        integrationId: this.integration._id,
        endpoint: requestConfig.url,
        method: requestConfig.method || 'GET',
        requestHeaders: requestConfig.headers,
        requestBody: requestConfig.data
      };
      
      // Make request
      const response = await axios(requestConfig);
      const responseTime = Date.now() - startTime;
      
      // Log successful response
      await this.logRequest({
        ...logEntry,
        responseStatus: response.status,
        responseHeaders: response.headers,
        responseBody: response.data,
        responseTime
      });
      
      // Update stats
      await this.updateStats(true, responseTime, JSON.stringify(response.data).length);
      
      return response.data;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Log error
      await this.logRequest({
        integrationId: this.integration._id,
        endpoint: endpoint,
        method: options.method || 'GET',
        responseStatus: error.response?.status,
        responseHeaders: error.response?.headers,
        responseBody: error.response?.data,
        responseTime,
        error: error.message
      });
      
      // Update stats and status
      await this.updateStats(false, responseTime, 0);
      await this.handleError(error);
      
      throw error;
    }
  }

  async prepareRequest(endpoint, options) {
    const config = {
      url: this.buildUrl(endpoint),
      method: options.method || 'GET',
      headers: { ...this.getDefaultHeaders(), ...options.headers },
      timeout: options.timeout || 30000
    };

    if (options.data) {
      config.data = options.data;
    }

    if (options.params) {
      config.params = options.params;
    }

    return config;
  }

  buildUrl(endpoint) {
    const baseUrl = this.config.baseUrl || this.getDefaultBaseUrl();
    return `${baseUrl}${endpoint}`;
  }

  getDefaultHeaders() {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'ShipMaster-Pro/1.0'
    };
  }

  async checkRateLimit() {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    
    if (!this.rateLimiter.has('requests')) {
      this.rateLimiter.set('requests', []);
    }
    
    const requests = this.rateLimiter.get('requests');
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= this.integration.rateLimits.requestsPerMinute) {
      const waitTime = windowMs - (now - recentRequests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    recentRequests.push(now);
    this.rateLimiter.set('requests', recentRequests);
  }

  async logRequest(logData) {
    try {
      const log = new ApiLog(logData);
      await log.save();
    } catch (error) {
      console.error('Failed to log API request:', error);
    }
  }

  async updateStats(success, responseTime, dataSize) {
    const update = {
      $inc: {
        'stats.totalRequests': 1,
        'stats.dataTransferred': dataSize
      },
      $set: {
        'status.lastConnected': new Date(),
        'stats.avgResponseTime': responseTime
      }
    };

    if (success) {
      update.$inc['stats.successfulRequests'] = 1;
      update.$set['status.consecutiveErrors'] = 0;
      update.$set['status.connected'] = true;
    } else {
      update.$inc['stats.failedRequests'] = 1;
      update.$inc['status.consecutiveErrors'] = 1;
      update.$inc['status.errorCount'] = 1;
    }

    await ApiIntegration.findByIdAndUpdate(this.integration._id, update);
  }

  async handleError(error) {
    const errorMessage = error.response?.data?.message || error.message;
    
    await ApiIntegration.findByIdAndUpdate(this.integration._id, {
      'status.lastError': errorMessage,
      'status.connected': false
    });

    // Disable integration if too many consecutive errors
    if (this.integration.status.consecutiveErrors >= 10) {
      await ApiIntegration.findByIdAndUpdate(this.integration._id, {
        'syncSettings.enabled': false
      });
    }
  }

  async testConnection() {
    try {
      const result = await this.performHealthCheck();
      return { success: true, message: 'Connection successful', data: result };
    } catch (error) {
      return { 
        success: false, 
        message: error.message, 
        error: error.response?.data || error.toString() 
      };
    }
  }
}

// Shopify API Client
class ShopifyApiClient extends BaseApiClient {
  getDefaultBaseUrl() {
    return `https://${this.config.shopUrl}.myshopify.com/admin/api/${this.config.apiVersion}`;
  }

  getDefaultHeaders() {
    return {
      ...super.getDefaultHeaders(),
      'X-Shopify-Access-Token': this.config.accessToken
    };
  }

  async performHealthCheck() {
    return await this.makeRequest('/shop.json');
  }

  async getOrders(params = {}) {
    const defaultParams = {
      limit: this.integration.syncSettings.batchSize,
      status: 'any',
      ...params
    };
    
    const response = await this.makeRequest('/orders.json', { params: defaultParams });
    return this.transformOrders(response.orders);
  }

  async getProducts(params = {}) {
    const defaultParams = {
      limit: this.integration.syncSettings.batchSize,
      ...params
    };
    
    const response = await this.makeRequest('/products.json', { params: defaultParams });
    return this.transformProducts(response.products);
  }

  async updateOrderFulfillment(orderId, fulfillmentData) {
    const fulfillment = {
      tracking_number: fulfillmentData.trackingNumber,
      tracking_company: fulfillmentData.carrier,
      tracking_urls: fulfillmentData.trackingUrls || [],
      notify_customer: true,
      line_items: fulfillmentData.lineItems || []
    };

    return await this.makeRequest(`/orders/${orderId}/fulfillments.json`, {
      method: 'POST',
      data: { fulfillment }
    });
  }

  async createWebhook(topic, address) {
    const webhook = {
      topic,
      address,
      format: 'json'
    };

    return await this.makeRequest('/webhooks.json', {
      method: 'POST',
      data: { webhook }
    });
  }

  transformOrders(orders) {
    return orders.map(order => ({
      externalId: order.id.toString(),
      orderNumber: order.order_number || order.name,
      source: 'shopify',
      status: this.mapOrderStatus(order.fulfillment_status),
      customer: {
        name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
        email: order.customer?.email,
        phone: order.customer?.phone
      },
      shippingAddress: this.transformAddress(order.shipping_address),
      billingAddress: this.transformAddress(order.billing_address),
      items: order.line_items.map(item => ({
        externalId: item.id.toString(),
        sku: item.sku,
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        weight: item.grams ? item.grams * 0.035274 : 0 // Convert grams to oz
      })),
      totals: {
        subtotal: parseFloat(order.subtotal_price),
        tax: parseFloat(order.total_tax),
        shipping: order.shipping_lines?.[0] ? parseFloat(order.shipping_lines[0].price) : 0,
        discount: parseFloat(order.total_discounts || 0),
        total: parseFloat(order.total_price)
      },
      timestamps: {
        ordered: new Date(order.created_at),
        updated: new Date(order.updated_at)
      },
      tags: order.tags ? order.tags.split(', ') : []
    }));
  }

  transformAddress(address) {
    if (!address) return null;
    
    return {
      name: address.name,
      company: address.company,
      address1: address.address1,
      address2: address.address2,
      city: address.city,
      state: address.province,
      zip: address.zip,
      country: address.country_code,
      phone: address.phone
    };
  }

  mapOrderStatus(fulfillmentStatus) {
    const statusMap = {
      null: 'pending',
      'pending': 'processing',
      'partial': 'processing',
      'fulfilled': 'shipped'
    };
    
    return statusMap[fulfillmentStatus] || 'pending';
  }
}

// QuickBooks API Client
class QuickBooksApiClient extends BaseApiClient {
  getDefaultBaseUrl() {
    return 'https://sandbox-quickbooks.api.intuit.com'; // Use production URL in production
  }

  getDefaultHeaders() {
    return {
      ...super.getDefaultHeaders(),
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Accept': 'application/json'
    };
  }

  async performHealthCheck() {
    return await this.makeRequest(`/v3/company/${this.config.companyId}/companyinfo/${this.config.companyId}`);
  }

  async refreshAccessToken() {
    try {
      const response = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken
        }), {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Update stored tokens
      await ApiIntegration.findByIdAndUpdate(this.integration._id, {
        'config.accessToken': response.data.access_token,
        'config.refreshToken': response.data.refresh_token,
        'config.tokenExpiry': new Date(Date.now() + response.data.expires_in * 1000)
      });

      this.config.accessToken = response.data.access_token;
      return true;
    } catch (error) {
      console.error('Failed to refresh QuickBooks token:', error);
      return false;
    }
  }

  async createInvoice(orderData) {
    // Check token expiry
    if (this.config.tokenExpiry && new Date() > this.config.tokenExpiry) {
      await this.refreshAccessToken();
    }

    const invoice = {
      Line: orderData.items.map((item, index) => ({
        Id: index + 1,
        LineNum: index + 1,
        Amount: item.price * item.quantity,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            value: item.sku,
            name: item.name
          },
          Qty: item.quantity,
          UnitPrice: item.price
        }
      })),
      CustomerRef: {
        value: orderData.customerId || "1" // Default customer if none specified
      },
      TotalAmt: orderData.totals.total,
      TxnDate: new Date().toISOString().split('T')[0],
      DocNumber: orderData.orderNumber
    };

    return await this.makeRequest(`/v3/company/${this.config.companyId}/invoice`, {
      method: 'POST',
      data: invoice
    });
  }

  async getCustomers(params = {}) {
    const query = `SELECT * FROM Customer WHERE Active = true`;
    return await this.makeRequest(`/v3/company/${this.config.companyId}/query`, {
      params: { query, ...params }
    });
  }
}

// Bill.com API Client
class BillComApiClient extends BaseApiClient {
  getDefaultBaseUrl() {
    return 'https://api.bill.com/api/v2';
  }

  getDefaultHeaders() {
    return {
      ...super.getDefaultHeaders(),
      'sessionId': this.config.sessionId,
      'devKey': this.config.devKey
    };
  }

  async performHealthCheck() {
    return await this.makeRequest('/ListOrganizations.json', {
      method: 'POST',
      data: {
        devKey: this.config.devKey,
        sessionId: this.config.sessionId
      }
    });
  }

  async createBill(orderData) {
    const bill = {
      obj: {
        entity: "Bill",
        vendorId: orderData.vendorId,
        invoiceNumber: orderData.orderNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        amount: orderData.totals.total,
        billLineItems: orderData.items.map(item => ({
          entity: "BillLineItem",
          chartOfAccountId: process.env.BILL_COM_DEFAULT_ACCOUNT,
          amount: item.price * item.quantity,
          description: `${item.name} (${item.sku})`
        }))
      },
      devKey: this.config.devKey,
      sessionId: this.config.sessionId
    };

    return await this.makeRequest('/Crud/Create/Bill.json', {
      method: 'POST',
      data: bill
    });
  }

  async getVendors() {
    return await this.makeRequest('/List/Vendor.json', {
      method: 'POST',
      data: {
        devKey: this.config.devKey,
        sessionId: this.config.sessionId
      }
    });
  }
}

// AfterShip API Client
class AfterShipApiClient extends BaseApiClient {
  getDefaultBaseUrl() {
    return 'https://api.aftership.com/v4';
  }

  getDefaultHeaders() {
    return {
      ...super.getDefaultHeaders(),
      'aftership-api-key': this.config.apiKey
    };
  }

  async performHealthCheck() {
    return await this.makeRequest('/couriers');
  }

  async createTracking(trackingData) {
    const tracking = {
      tracking: {
        tracking_number: trackingData.trackingNumber,
        slug: trackingData.carrier.toLowerCase(),
        title: trackingData.title || trackingData.orderNumber,
        smses: trackingData.phoneNumbers || [],
        emails: trackingData.emails || [],
        order_id: trackingData.orderNumber,
        custom_fields: trackingData.customFields || {}
      }
    };

    return await this.makeRequest('/trackings', {
      method: 'POST',
      data: tracking
    });
  }

  async getTracking(trackingNumber, carrier) {
    const slug = carrier.toLowerCase();
    return await this.makeRequest(`/trackings/${slug}/${trackingNumber}`);
  }

  async updateTracking(trackingNumber, carrier, updateData) {
    const slug = carrier.toLowerCase();
    return await this.makeRequest(`/trackings/${slug}/${trackingNumber}`, {
      method: 'PUT',
      data: { tracking: updateData }
    });
  }

  async getCouriers() {
    return await this.makeRequest('/couriers');
  }

  transformTrackingData(aftershipData) {
    const tracking = aftershipData.data.tracking;
    
    return {
      trackingNumber: tracking.tracking_number,
      carrier: tracking.slug,
      status: this.mapTrackingStatus(tracking.tag),
      estimatedDelivery: tracking.expected_delivery,
      actualDelivery: tracking.delivered_at,
      currentLocation: tracking.origin_country_iso3,
      events: tracking.checkpoints.map(checkpoint => ({
        timestamp: checkpoint.checkpoint_time,
        status: checkpoint.tag,
        location: `${checkpoint.city || ''}, ${checkpoint.state || ''} ${checkpoint.country_iso3 || ''}`.trim(),
        description: checkpoint.message
      })),
      lastUpdate: tracking.updated_at
    };
  }

  mapTrackingStatus(tag) {
    const statusMap = {
      'Pending': 'pending',
      'InfoReceived': 'info_received',
      'InTransit': 'in_transit',
      'OutForDelivery': 'out_for_delivery',
      'AttemptFail': 'delivery_attempted',
      'Delivered': 'delivered',
      'Exception': 'exception',
      'Expired': 'expired'
    };
    
    return statusMap[tag] || 'unknown';
  }
}

// Custom API Client
class CustomApiClient extends BaseApiClient {
  getDefaultBaseUrl() {
    return this.config.baseUrl;
  }

  getDefaultHeaders() {
    const headers = { ...super.getDefaultHeaders() };
    
    // Add custom headers
    if (this.config.headers) {
      Object.assign(headers, this.config.headers);
    }
    
    // Add authentication headers
    const auth = this.config.authentication;
    if (auth) {
      switch (auth.type) {
        case 'api_key':
          headers[auth.apiKeyHeader || 'X-API-Key'] = auth.apiKey;
          break;
        case 'bearer':
          headers['Authorization'] = `Bearer ${auth.bearerToken}`;
          break;
        case 'basic':
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
          break;
      }
    }
    
    return headers;
  }

  async performHealthCheck() {
    // Try to make a simple GET request to the base URL or a health endpoint
    const healthEndpoint = this.config.healthEndpoint || '/health';
    return await this.makeRequest(healthEndpoint);
  }

  async makeCustomRequest(endpoint, options = {}) {
    return await this.makeRequest(endpoint, options);
  }
}

// API Integration Manager
class ApiIntegrationManager {
  static createClient(integration) {
    switch (integration.type) {
      case 'shopify':
        return new ShopifyApiClient(integration);
      case 'quickbooks':
        return new QuickBooksApiClient(integration);
      case 'bill.com':
        return new BillComApiClient(integration);
      case 'aftership':
        return new AfterShipApiClient(integration);
      case 'custom':
        return new CustomApiClient(integration);
      default:
        throw new Error(`Unsupported integration type: ${integration.type}`);
    }
  }

  static async testConnection(integrationId) {
    try {
      const integration = await ApiIntegration.findById(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const client = this.createClient(integration);
      return await client.testConnection();
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static async syncData(integrationId, syncType = 'orders') {
    try {
      const integration = await ApiIntegration.findById(integrationId);
      if (!integration || !integration.syncSettings.enabled) {
        return { success: false, message: 'Integration disabled or not found' };
      }

      const client = this.createClient(integration);
      let results = [];

      switch (syncType) {
        case 'orders':
          if (integration.type === 'shopify') {
            const lastSyncId = integration.syncSettings.lastSyncId;
            const params = lastSyncId ? { since_id: lastSyncId } : {};
            results = await client.getOrders(params);
            
            // Update last sync ID
            if (results.length > 0) {
              const lastOrder = results[results.length - 1];
              await ApiIntegration.findByIdAndUpdate(integrationId, {
                'syncSettings.lastSyncId': lastOrder.externalId,
                'syncSettings.lastSync': new Date()
              });
            }
          }
          break;
          
        case 'products':
          if (integration.type === 'shopify') {
            results = await client.getProducts();
          }
          break;
      }

      return { success: true, data: results, count: results.length };
    } catch (error) {
      console.error(`Sync error for integration ${integrationId}:`, error);
      return { success: false, message: error.message };
    }
  }

  static async diagnoseConnection(integrationId) {
    const integration = await ApiIntegration.findById(integrationId);
    if (!integration) {
      return { error: 'Integration not found' };
    }

    const diagnostics = {
      integration: integration.name,
      type: integration.type,
      status: integration.status.connected,
      issues: [],
      recommendations: [],
      details: {}
    };

    try {
      const client = this.createClient(integration);
      
      // Test basic connectivity
      const connectionTest = await client.testConnection();
      if (!connectionTest.success) {
        diagnostics.issues.push({
          severity: 'error',
          type: 'connection',
          message: 'Failed to establish connection',
          details: connectionTest.message
        });
      }

      // Check authentication
      if (integration.type === 'shopify') {
        if (!integration.config.accessToken) {
          diagnostics.issues.push({
            severity: 'error',
            type: 'authentication',
            message: 'Missing access token'
          });
        }
        if (!integration.config.shopUrl) {
          diagnostics.issues.push({
            severity: 'error',
            type: 'configuration',
            message: 'Missing shop URL'
          });
        }
      }

      // Check rate limiting
      if (integration.stats.failedRequests > integration.stats.successfulRequests) {
        diagnostics.issues.push({
          severity: 'warning',
          type: 'rate_limiting',
          message: 'High failure rate detected',
          details: `Failed: ${integration.stats.failedRequests}, Successful: ${integration.stats.successfulRequests}`
        });
      }

      // Check token expiry (for OAuth integrations)
      if (integration.type === 'quickbooks' && integration.config.tokenExpiry) {
        const timeToExpiry = new Date(integration.config.tokenExpiry) - new Date();
        if (timeToExpiry < 24 * 60 * 60 * 1000) { // Less than 24 hours
          diagnostics.issues.push({
            severity: 'warning',
            type: 'token_expiry',
            message: 'Access token expires soon',
            details: `Expires at: ${integration.config.tokenExpiry}`
          });
        }
      }

      // Generate recommendations
      if (diagnostics.issues.length === 0) {
        diagnostics.recommendations.push('Connection is healthy');
      } else {
        diagnostics.issues.forEach(issue => {
          switch (issue.type) {
            case 'connection':
              diagnostics.recommendations.push('Check network connectivity and API endpoint URLs');
              break;
            case 'authentication':
              diagnostics.recommendations.push('Verify API credentials and permissions');
              break;
            case 'rate_limiting':
              diagnostics.recommendations.push('Reduce sync frequency or implement backoff strategy');
              break;
            case 'token_expiry':
              diagnostics.recommendations.push('Refresh access token before expiry');
              break;
          }
        });
      }

      diagnostics.details = {
        lastConnected: integration.status.lastConnected,
        lastSync: integration.syncSettings.lastSync,
        totalRequests: integration.stats.totalRequests,
        errorRate: integration.stats.totalRequests > 0 
          ? (integration.stats.failedRequests / integration.stats.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        avgResponseTime: integration.stats.avgResponseTime + 'ms'
      };

    } catch (error) {
      diagnostics.issues.push({
        severity: 'error',
        type: 'diagnostic_error',
        message: 'Failed to run diagnostics',
        details: error.message
      });
    }

    return diagnostics;
  }
}

// API Routes
const router = express.Router();

// Rate limiting for API management endpoints
const apiManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API management requests'
});

router.use(apiManagementLimiter);

// Get all integrations for user
router.get('/integrations', async (req, res) => {
  try {
    const integrations = await ApiIntegration.find({ userId: req.user.id })
      .select('-config.accessToken -config.refreshToken -config.sessionId -config.apiKey')
      .sort({ createdAt: -1 });
    
    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new integration
router.post('/integrations', async (req, res) => {
  try {
    const integrationData = {
      ...req.body,
      userId: req.user.id
    };
    
    const integration = new ApiIntegration(integrationData);
    await integration.save();
    
    // Test connection immediately
    const connectionTest = await ApiIntegrationManager.testConnection(integration._id);
    
    res.status(201).json({
      integration: integration.toObject(),
      connectionTest
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update integration
router.put('/integrations/:id', async (req, res) => {
  try {
    const integration = await ApiIntegration.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json(integration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete integration
router.delete('/integrations/:id', async (req, res) => {
  try {
    const integration = await ApiIntegration.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Clean up related logs
    await ApiLog.deleteMany({ integrationId: req.params.id });
    
    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test connection
router.post('/integrations/:id/test', async (req, res) => {
  try {
    const result = await ApiIntegrationManager.testConnection(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync data
router.post('/integrations/:id/sync', async (req, res) => {
  try {
    const { syncType = 'orders' } = req.body;
    const result = await ApiIntegrationManager.syncData(req.params.id, syncType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get integration logs
router.get('/integrations/:id/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, level } = req.query;
    const query = { integrationId: req.params.id };
    
    if (level === 'errors') {
      query.error = { $exists: true };
    }
    
    const logs = await ApiLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-requestBody -responseBody'); // Exclude large fields for list view
    
    const total = await ApiLog.countDocuments(query);
    
    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed log entry
router.get('/integrations/:id/logs/:logId', async (req, res) => {
  try {
    const log = await ApiLog.findOne({
      _id: req.params.logId,
      integrationId: req.params.id
    });
    
    if (!log) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Diagnose connection issues
router.get('/integrations/:id/diagnose', async (req, res) => {
  try {
    const diagnostics = await ApiIntegrationManager.diagnoseConnection(req.params.id);
    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get integration statistics
router.get('/integrations/:id/stats', async (req, res) => {
  try {
    const integration = await ApiIntegration.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Get recent logs for trend analysis
    const recentLogs = await ApiLog.aggregate([
      { $match: { integrationId: integration._id } },
      { $sort: { timestamp: -1 } },
      { $limit: 1000 },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d %H:00",
              date: "$timestamp"
            }
          },
          requests: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $ne: ["$error", null] }, 1, 0]
            }
          },
          avgResponseTime: { $avg: "$responseTime" }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    
    res.json({
      ...integration.stats,
      status: integration.status,
      recentTrends: recentLogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scheduled sync job
cron.schedule('*/5 * * * *', async () => {
  console.log('Running scheduled API sync...');
  
  try {
    const activeIntegrations = await ApiIntegration.find({
      'syncSettings.enabled': true,
      'syncSettings.autoSync': true,
      'status.connected': true
    });
    
    for (const integration of activeIntegrations) {
      const lastSync = integration.syncSettings.lastSync || new Date(0);
      const syncIntervalMs = integration.syncSettings.frequency * 60 * 1000;
      
      if (Date.now() - lastSync.getTime() >= syncIntervalMs) {
        console.log(`Syncing integration: ${integration.name}`);
        await ApiIntegrationManager.syncData(integration._id, 'orders');
      }
    }
  } catch (error) {
    console.error('Scheduled sync error:', error);
  }
});

module.exports = {
  router,
  ApiIntegrationManager,
  ShopifyApiClient,
  QuickBooksApiClient,
  BillComApiClient,
  AfterShipApiClient,
  CustomApiClient
};