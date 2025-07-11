const { ApiIntegration } = require('../models');
const ShopifyApiClient = require('../integrations/ShopifyApiClient');
const QuickBooksApiClient = require('../integrations/QuickBooksApiClient');
const BillComApiClient = require('../integrations/BillComApiClient');
const AfterShipApiClient = require('../integrations/AfterShipApiClient');
const CustomApiClient = require('../integrations/CustomApiClient');

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

        case 'invoices':
          if (integration.type === 'quickbooks') {
            results = await client.getInvoices();
          }
          break;

        case 'bills':
          if (integration.type === 'bill.com') {
            results = await client.getBills();
          }
          break;

        case 'trackings':
          if (integration.type === 'aftership') {
            results = await client.getTrackings();
          }
          break;
      }

      // Update last sync timestamp
      await ApiIntegration.findByIdAndUpdate(integrationId, {
        'status.lastSync': new Date()
      });

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
        lastSync: integration.status.lastSync,
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

  static async performAction(integrationId, action, data) {
    try {
      const integration = await ApiIntegration.findById(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const client = this.createClient(integration);

      switch (action) {
        case 'createShopifyFulfillment':
          if (integration.type === 'shopify') {
            return await client.updateOrderFulfillment(data.orderId, data.fulfillmentData);
          }
          break;

        case 'createQuickBooksInvoice':
          if (integration.type === 'quickbooks') {
            return await client.createInvoice(data);
          }
          break;

        case 'createBillComBill':
          if (integration.type === 'bill.com') {
            return await client.createBill(data);
          }
          break;

        case 'createAfterShipTracking':
          if (integration.type === 'aftership') {
            return await client.createTracking(data);
          }
          break;

        case 'customRequest':
          if (integration.type === 'custom') {
            return await client.makeCustomRequest(data.endpoint, data.options);
          }
          break;

        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      console.error(`Action error for integration ${integrationId}:`, error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = ApiIntegrationManager;