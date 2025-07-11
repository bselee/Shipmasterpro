const BaseApiClient = require('./BaseApiClient');

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

  async getBills(params = {}) {
    const defaultParams = {
      start: 0,
      max: this.integration.syncSettings.batchSize || 100,
      ...params
    };

    const response = await this.makeRequest('/List/Bill.json', {
      method: 'POST',
      data: {
        devKey: this.config.devKey,
        sessionId: this.config.sessionId,
        ...defaultParams
      }
    });

    return this.transformBills(response);
  }

  async payBill(billId, paymentData) {
    const payment = {
      obj: {
        entity: "BillPay",
        billId: billId,
        amount: paymentData.amount,
        processDate: paymentData.processDate || new Date().toISOString().split('T')[0],
        bankAccountId: paymentData.bankAccountId
      },
      devKey: this.config.devKey,
      sessionId: this.config.sessionId
    };

    return await this.makeRequest('/Crud/Create/BillPay.json', {
      method: 'POST',
      data: payment
    });
  }

  transformBills(billsResponse) {
    if (!billsResponse || !Array.isArray(billsResponse)) return [];

    return billsResponse.map(bill => ({
      externalId: bill.id,
      vendorName: bill.vendorName,
      vendorId: bill.vendorId,
      invoiceNumber: bill.invoiceNumber,
      amount: parseFloat(bill.amount),
      dueAmount: parseFloat(bill.dueAmount || bill.amount),
      dueDate: bill.dueDate,
      status: bill.paymentStatus,
      description: bill.description,
      createdDate: bill.createdDate,
      updatedDate: bill.updatedDate
    }));
  }
}

module.exports = BillComApiClient;