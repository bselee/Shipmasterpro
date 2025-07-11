const EventEmitter = require('events');

class ShipMasterEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase default limit for complex workflows
  }

  // Override emit to add logging in development
  emit(eventName, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Event] ${eventName} emitted with ${args.length} arguments`);
    }
    
    return super.emit(eventName, ...args);
  }
}

// Create singleton instance
const eventEmitter = new ShipMasterEventEmitter();

// Define event types for better IDE support
const EventTypes = {
  // Order events
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_DELETED: 'order:deleted',
  ORDER_STATUS_CHANGED: 'order:statusChanged',
  ORDER_SHIPPED: 'order:shipped',
  ORDER_DELIVERED: 'order:delivered',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_TAGGED: 'order:tagged',
  ORDER_UNTAGGED: 'order:untagged',
  
  // Product events
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  PRODUCT_DELETED: 'product:deleted',
  PRODUCT_TAGGED: 'product:tagged',
  PRODUCT_UNTAGGED: 'product:untagged',
  INVENTORY_LOW: 'product:inventoryLow',
  INVENTORY_OUT: 'product:inventoryOut',
  
  // Customer events
  CUSTOMER_CREATED: 'customer:created',
  CUSTOMER_UPDATED: 'customer:updated',
  CUSTOMER_TAGGED: 'customer:tagged',
  CUSTOMER_UNTAGGED: 'customer:untagged',
  
  // Shipping events
  LABEL_CREATED: 'shipping:labelCreated',
  LABEL_PRINTED: 'shipping:labelPrinted',
  LABEL_VOIDED: 'shipping:labelVoided',
  TRACKING_UPDATED: 'shipping:trackingUpdated',
  DELIVERY_EXCEPTION: 'shipping:deliveryException',
  
  // Integration events
  INTEGRATION_CONNECTED: 'integration:connected',
  INTEGRATION_DISCONNECTED: 'integration:disconnected',
  INTEGRATION_SYNC_STARTED: 'integration:syncStarted',
  INTEGRATION_SYNC_COMPLETED: 'integration:syncCompleted',
  INTEGRATION_SYNC_FAILED: 'integration:syncFailed',
  INTEGRATION_WEBHOOK_RECEIVED: 'integration:webhookReceived',
  
  // Automation events
  AUTOMATION_TRIGGERED: 'automation:triggered',
  AUTOMATION_EXECUTED: 'automation:executed',
  AUTOMATION_FAILED: 'automation:failed',
  AUTOMATION_RULE_CREATED: 'automation:ruleCreated',
  AUTOMATION_RULE_UPDATED: 'automation:ruleUpdated',
  AUTOMATION_RULE_DELETED: 'automation:ruleDeleted',
  
  // Tag events
  TAG_CREATED: 'tag:created',
  TAG_UPDATED: 'tag:updated',
  TAG_DELETED: 'tag:deleted',
  TAG_APPLIED: 'tag:applied',
  TAG_REMOVED: 'tag:removed',
  
  // System events
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info',
  RATE_LIMIT_EXCEEDED: 'system:rateLimitExceeded',
  SUBSCRIPTION_UPDATED: 'system:subscriptionUpdated',
  USER_LOGIN: 'system:userLogin',
  USER_LOGOUT: 'system:userLogout'
};

// Export both the emitter and event types
module.exports = eventEmitter;
module.exports.EventTypes = EventTypes;