const axios = require('axios');
const BaseApiClient = require('./BaseApiClient');

class QuickBooksApiClient extends BaseApiClient {
  getDefaultBaseUrl() {
    return process.env.NODE_ENV === 'production' 
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
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
      const ApiIntegration = require('../models/ApiIntegration');
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

  async getInvoices(params = {}) {
    const defaultParams = {
      limit: this.integration.syncSettings.batchSize || 100,
      ...params
    };
    
    const query = `SELECT * FROM Invoice ORDER BY MetaData.CreateTime DESC MAXRESULTS ${defaultParams.limit}`;
    const response = await this.makeRequest(`/v3/company/${this.config.companyId}/query`, {
      params: { query }
    });
    
    return this.transformInvoices(response.QueryResponse?.Invoice || []);
  }

  transformInvoices(invoices) {
    return invoices.map(invoice => ({
      externalId: invoice.Id,
      invoiceNumber: invoice.DocNumber,
      customerName: invoice.CustomerRef?.name,
      customerId: invoice.CustomerRef?.value,
      totalAmount: parseFloat(invoice.TotalAmt),
      balance: parseFloat(invoice.Balance),
      dueDate: invoice.DueDate,
      status: invoice.Balance > 0 ? 'open' : 'paid',
      lineItems: invoice.Line?.filter(line => line.DetailType === 'SalesItemLineDetail').map(line => ({
        description: line.Description,
        amount: parseFloat(line.Amount),
        quantity: line.SalesItemLineDetail?.Qty,
        itemRef: line.SalesItemLineDetail?.ItemRef
      })) || [],
      createdAt: new Date(invoice.MetaData?.CreateTime),
      updatedAt: new Date(invoice.MetaData?.LastUpdatedTime)
    }));
  }
}

module.exports = QuickBooksApiClient;