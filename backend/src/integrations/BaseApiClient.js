const axios = require('axios');
const crypto = require('crypto');
const { ApiIntegration, ApiLog } = require('../models');

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

  // Methods to be implemented by subclasses
  getDefaultBaseUrl() {
    throw new Error('getDefaultBaseUrl must be implemented by subclass');
  }

  async performHealthCheck() {
    throw new Error('performHealthCheck must be implemented by subclass');
  }
}

module.exports = BaseApiClient;