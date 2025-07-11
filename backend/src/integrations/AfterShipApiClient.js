const BaseApiClient = require('./BaseApiClient');

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

  async deleteTracking(trackingNumber, carrier) {
    const slug = carrier.toLowerCase();
    return await this.makeRequest(`/trackings/${slug}/${trackingNumber}`, {
      method: 'DELETE'
    });
  }

  async getCouriers() {
    return await this.makeRequest('/couriers');
  }

  async getTrackings(params = {}) {
    const defaultParams = {
      limit: this.integration.syncSettings.batchSize || 100,
      ...params
    };

    const response = await this.makeRequest('/trackings', {
      params: defaultParams
    });

    return this.transformTrackingData(response);
  }

  transformTrackingData(aftershipData) {
    if (aftershipData.data?.tracking) {
      // Single tracking response
      return this.transformSingleTracking(aftershipData.data.tracking);
    } else if (aftershipData.data?.trackings) {
      // Multiple trackings response
      return aftershipData.data.trackings.map(tracking => this.transformSingleTracking(tracking));
    }
    return [];
  }

  transformSingleTracking(tracking) {
    return {
      trackingNumber: tracking.tracking_number,
      carrier: tracking.slug,
      status: this.mapTrackingStatus(tracking.tag),
      estimatedDelivery: tracking.expected_delivery,
      actualDelivery: tracking.delivered_at,
      currentLocation: tracking.last_checkpoint?.location || tracking.origin_country_iso3,
      events: (tracking.checkpoints || []).map(checkpoint => ({
        timestamp: checkpoint.checkpoint_time,
        status: checkpoint.tag,
        location: `${checkpoint.city || ''}, ${checkpoint.state || ''} ${checkpoint.country_iso3 || ''}`.trim(),
        description: checkpoint.message
      })),
      lastUpdate: tracking.updated_at,
      orderNumber: tracking.order_id,
      customerName: tracking.customer_name,
      destinationCountry: tracking.destination_country_iso3,
      shipmentType: tracking.shipment_type,
      signedBy: tracking.signed_by
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

  // Webhook verification
  verifyWebhook(webhookBody, webhookSignature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.integration.webhooks.secret)
      .update(JSON.stringify(webhookBody))
      .digest('hex');
    
    return webhookSignature === expectedSignature;
  }
}

module.exports = AfterShipApiClient;