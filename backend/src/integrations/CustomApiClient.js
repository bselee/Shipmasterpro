const BaseApiClient = require('./BaseApiClient');

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
        case 'oauth2':
          // OAuth2 would need token management similar to QuickBooks
          if (auth.oauth2?.accessToken) {
            headers['Authorization'] = `Bearer ${auth.oauth2.accessToken}`;
          }
          break;
      }
    }
    
    return headers;
  }

  async performHealthCheck() {
    // Try to make a simple GET request to the base URL or a health endpoint
    const healthEndpoint = this.config.healthEndpoint || '/health';
    try {
      return await this.makeRequest(healthEndpoint);
    } catch (error) {
      // If health endpoint fails, try base URL
      if (error.response?.status === 404) {
        return await this.makeRequest('/');
      }
      throw error;
    }
  }

  async makeCustomRequest(endpoint, options = {}) {
    return await this.makeRequest(endpoint, options);
  }

  // Generic data transformation based on field mapping
  transformData(data, mappingType = 'orders') {
    const mapping = this.integration.fieldMapping?.[mappingType];
    if (!mapping || !data) return data;

    if (Array.isArray(data)) {
      return data.map(item => this.applyFieldMapping(item, mapping));
    }
    return this.applyFieldMapping(data, mapping);
  }

  applyFieldMapping(sourceData, mapping) {
    const result = {};
    
    for (const [targetField, sourceField] of Object.entries(mapping)) {
      const value = this.getNestedValue(sourceData, sourceField);
      this.setNestedValue(result, targetField, value);
    }
    
    return result;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // OAuth2 token refresh (if configured)
  async refreshOAuth2Token() {
    const oauth2 = this.config.authentication?.oauth2;
    if (!oauth2 || !oauth2.refreshToken) {
      throw new Error('OAuth2 refresh not configured');
    }

    try {
      const response = await axios.post(oauth2.tokenUrl, 
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: oauth2.refreshToken,
          client_id: oauth2.clientId,
          client_secret: oauth2.clientSecret
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Update stored tokens
      const ApiIntegration = require('../models/ApiIntegration');
      await ApiIntegration.findByIdAndUpdate(this.integration._id, {
        'config.authentication.oauth2.accessToken': response.data.access_token,
        'config.authentication.oauth2.refreshToken': response.data.refresh_token || oauth2.refreshToken,
        'config.authentication.oauth2.tokenExpiry': new Date(Date.now() + response.data.expires_in * 1000)
      });

      this.config.authentication.oauth2.accessToken = response.data.access_token;
      return true;
    } catch (error) {
      console.error('Failed to refresh OAuth2 token:', error);
      return false;
    }
  }
}

module.exports = CustomApiClient;