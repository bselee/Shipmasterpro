const BaseApiClient = require('./BaseApiClient');

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

  transformProducts(products) {
    return products.map(product => ({
      externalId: product.id.toString(),
      title: product.title,
      vendor: product.vendor,
      productType: product.product_type,
      tags: product.tags ? product.tags.split(', ') : [],
      variants: product.variants.map(variant => ({
        externalId: variant.id.toString(),
        sku: variant.sku,
        title: variant.title,
        price: parseFloat(variant.price),
        compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
        inventoryQuantity: variant.inventory_quantity,
        weight: variant.grams ? variant.grams * 0.035274 : 0,
        weightUnit: 'oz'
      })),
      images: product.images.map(img => img.src),
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
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

module.exports = ShopifyApiClient;