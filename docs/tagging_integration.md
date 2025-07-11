// ShipMaster Pro - Advanced Tagging System & Automation Engine
// Comprehensive tagging for orders, products, customers with automation triggers

const mongoose = require('mongoose');

// Enhanced Tag Schema
const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String, default: '#3B82F6' }, // Hex color code
  description: String,
  category: { 
    type: String, 
    enum: ['order', 'product', 'customer', 'shipping', 'priority', 'custom'],
    default: 'custom'
  },
  isSystem: { type: Boolean, default: false }, // System tags cannot be deleted
  usage: {
    orders: { type: Number, default: 0 },
    products: { type: Number, default: 0 },
    customers: { type: Number, default: 0 }
  },
  automation: {
    canTrigger: { type: Boolean, default: true },
    priority: { type: Number, default: 0 } // Higher priority tags trigger first
  },
  metadata: {
    icon: String, // Icon class or emoji
    tooltip: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastUsed: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Tag Collection Schema for grouping related tags
const tagCollectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  color: { type: String, default: '#6B7280' },
  isExclusive: { type: Boolean, default: false }, // Only one tag from collection can be applied
  autoApply: {
    enabled: { type: Boolean, default: false },
    conditions: Object // Conditions for auto-applying tags from this collection
  },
  createdAt: { type: Date, default: Date.now }
});

// Enhanced Tagging Service
class TaggingService {
  constructor() {
    this.Tag = mongoose.model('Tag', tagSchema);
    this.TagCollection = mongoose.model('TagCollection', tagCollectionSchema);
    this.tagCache = new Map();
    this.tagListeners = new Map();
  }

  // Initialize system tags
  async initializeSystemTags() {
    const systemTags = [
      // Priority Tags
      { name: 'urgent', category: 'priority', color: '#EF4444', description: 'Urgent priority orders', isSystem: true, metadata: { icon: '🚨' } },
      { name: 'high-priority', category: 'priority', color: '#F59E0B', description: 'High priority orders', isSystem: true, metadata: { icon: '⚡' } },
      { name: 'standard', category: 'priority', color: '#10B981', description: 'Standard priority orders', isSystem: true, metadata: { icon: '📦' } },
      
      // Shipping Tags
      { name: 'express', category: 'shipping', color: '#8B5CF6', description: 'Express shipping required', isSystem: true, metadata: { icon: '🚀' } },
      { name: 'fragile', category: 'shipping', color: '#F97316', description: 'Fragile items requiring special handling', isSystem: true, metadata: { icon: '🔍' } },
      { name: 'hazmat', category: 'shipping', color: '#DC2626', description: 'Hazardous materials', isSystem: true, metadata: { icon: '⚠️' } },
      { name: 'oversized', category: 'shipping', color: '#7C3AED', description: 'Oversized packages', isSystem: true, metadata: { icon: '📏' } },
      { name: 'signature-required', category: 'shipping', color: '#059669', description: 'Signature required for delivery', isSystem: true, metadata: { icon: '✍️' } },
      
      // Order Tags
      { name: 'gift', category: 'order', color: '#EC4899', description: 'Gift orders', isSystem: true, metadata: { icon: '🎁' } },
      { name: 'international', category: 'order', color: '#3B82F6', description: 'International shipping', isSystem: true, metadata: { icon: '🌍' } },
      { name: 'backorder', category: 'order', color: '#6B7280', description: 'Items on backorder', isSystem: true, metadata: { icon: '⏳' } },
      { name: 'dropship', category: 'order', color: '#8B5CF6', description: 'Dropship orders', isSystem: true, metadata: { icon: '🏭' } },
      { name: 'wholesale', category: 'order', color: '#059669', description: 'Wholesale orders', isSystem: true, metadata: { icon: '🏢' } },
      
      // Customer Tags
      { name: 'vip', category: 'customer', color: '#F59E0B', description: 'VIP customers', isSystem: true, metadata: { icon: '👑' } },
      { name: 'repeat-customer', category: 'customer', color: '#10B981', description: 'Repeat customers', isSystem: true, metadata: { icon: '🔄' } },
      { name: 'new-customer', category: 'customer', color: '#3B82F6', description: 'New customers', isSystem: true, metadata: { icon: '🌟' } },
      
      // Product Tags
      { name: 'electronics', category: 'product', color: '#6366F1', description: 'Electronic items', isSystem: true, metadata: { icon: '📱' } },
      { name: 'apparel', category: 'product', color: '#EC4899', description: 'Clothing and apparel', isSystem: true, metadata: { icon: '👕' } },
      { name: 'books', category: 'product', color: '#8B5CF6', description: 'Books and publications', isSystem: true, metadata: { icon: '📚' } },
      { name: 'food', category: 'product', color: '#F59E0B', description: 'Food items', isSystem: true, metadata: { icon: '🍎' } },
      { name: 'cosmetics', category: 'product', color: '#EC4899', description: 'Beauty and cosmetic products', isSystem: true, metadata: { icon: '💄' } }
    ];

    for (const tagData of systemTags) {
      await this.Tag.findOneAndUpdate(
        { name: tagData.name },
        tagData,
        { upsert: true, new: true }
      );
    }

    // Create system tag collections
    const tagCollections = [
      {
        name: 'Priority Levels',
        description: 'Order priority classification',
        tags: await this.Tag.find({ category: 'priority' }).select('_id'),
        isExclusive: true,
        color: '#F59E0B'
      },
      {
        name: 'Shipping Requirements',
        description: 'Special shipping handling requirements',
        tags: await this.Tag.find({ category: 'shipping' }).select('_id'),
        color: '#8B5CF6'
      },
      {
        name: 'Customer Types',
        description: 'Customer classification tags',
        tags: await this.Tag.find({ category: 'customer' }).select('_id'),
        isExclusive: true,
        color: '#10B981'
      }
    ];

    for (const collection of tagCollections) {
      await this.TagCollection.findOneAndUpdate(
        { name: collection.name },
        collection,
        { upsert: true, new: true }
      );
    }
  }

  // Create new tag
  async createTag(tagData) {
    const tag = new this.Tag({
      ...tagData,
      name: tagData.name.toLowerCase().replace(/\s+/g, '-')
    });
    
    await tag.save();
    this.invalidateCache();
    
    return tag;
  }

  // Apply tags to an entity (order, product, customer)
  async applyTags(entityType, entityId, tagNames, userId = null) {
    const Model = this.getModelForEntity(entityType);
    const entity = await Model.findById(entityId);
    
    if (!entity) {
      throw new Error(`${entityType} not found`);
    }

    // Get tag objects
    const tags = await this.Tag.find({ name: { $in: tagNames } });
    const validTagNames = tags.map(tag => tag.name);
    
    // Handle exclusive tag collections
    await this.handleExclusiveTags(entity.tags || [], validTagNames);
    
    // Add new tags (avoid duplicates)
    const currentTags = entity.tags || [];
    const newTags = [...new Set([...currentTags, ...validTagNames])];
    
    // Update entity
    entity.tags = newTags;
    entity.tagHistory = entity.tagHistory || [];
    entity.tagHistory.push({
      action: 'applied',
      tags: validTagNames,
      appliedBy: userId,
      timestamp: new Date()
    });
    
    await entity.save();
    
    // Update tag usage statistics
    await this.updateTagUsage(validTagNames, entityType, 1);
    
    // Trigger automation if this is an order
    if (entityType === 'order') {
      await this.triggerTagAutomation(entity, validTagNames, 'tag_applied');
    }
    
    // Emit events for listeners
    this.emitTagEvent('tags_applied', {
      entityType,
      entityId,
      tags: validTagNames,
      appliedBy: userId
    });
    
    return entity;
  }

  // Remove tags from an entity
  async removeTags(entityType, entityId, tagNames, userId = null) {
    const Model = this.getModelForEntity(entityType);
    const entity = await Model.findById(entityId);
    
    if (!entity) {
      throw new Error(`${entityType} not found`);
    }

    // Remove tags
    const currentTags = entity.tags || [];
    const remainingTags = currentTags.filter(tag => !tagNames.includes(tag));
    
    entity.tags = remainingTags;
    entity.tagHistory = entity.tagHistory || [];
    entity.tagHistory.push({
      action: 'removed',
      tags: tagNames,
      removedBy: userId,
      timestamp: new Date()
    });
    
    await entity.save();
    
    // Update tag usage statistics
    await this.updateTagUsage(tagNames, entityType, -1);
    
    // Trigger automation if this is an order
    if (entityType === 'order') {
      await this.triggerTagAutomation(entity, tagNames, 'tag_removed');
    }
    
    // Emit events for listeners
    this.emitTagEvent('tags_removed', {
      entityType,
      entityId,
      tags: tagNames,
      removedBy: userId
    });
    
    return entity;
  }

  // Handle exclusive tag collections (only one tag from collection allowed)
  async handleExclusiveTags(currentTags, newTags) {
    const exclusiveCollections = await this.TagCollection.find({ isExclusive: true }).populate('tags');
    
    for (const collection of exclusiveCollections) {
      const collectionTagNames = collection.tags.map(tag => tag.name);
      const existingCollectionTags = currentTags.filter(tag => collectionTagNames.includes(tag));
      const newCollectionTags = newTags.filter(tag => collectionTagNames.includes(tag));
      
      if (newCollectionTags.length > 0 && existingCollectionTags.length > 0) {
        // Remove existing tags from this exclusive collection
        const tagsToRemove = existingCollectionTags.filter(tag => !newCollectionTags.includes(tag));
        currentTags = currentTags.filter(tag => !tagsToRemove.includes(tag));
      }
    }
    
    return currentTags;
  }

  // Smart tag suggestions based on entity data
  async suggestTags(entityType, entityData) {
    const suggestions = [];
    
    if (entityType === 'order') {
      // Value-based suggestions
      if (entityData.totals.total > 500) {
        suggestions.push({ tag: 'high-value', confidence: 0.9, reason: 'Order value > $500' });
      }
      
      // International shipping
      if (entityData.shippingAddress.country !== 'US') {
        suggestions.push({ tag: 'international', confidence: 1.0, reason: 'Non-US shipping address' });
      }
      
      // Customer type suggestions
      if (entityData.customer.orderCount > 10) {
        suggestions.push({ tag: 'repeat-customer', confidence: 0.8, reason: 'Customer has 10+ orders' });
      } else if (entityData.customer.orderCount === 1) {
        suggestions.push({ tag: 'new-customer', confidence: 0.9, reason: 'First order from customer' });
      }
      
      // Product-based suggestions
      if (entityData.items.some(item => item.tags?.includes('fragile'))) {
        suggestions.push({ tag: 'fragile', confidence: 0.8, reason: 'Contains fragile items' });
      }
      
      // Weight-based suggestions
      const totalWeight = entityData.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
      if (totalWeight > 50) {
        suggestions.push({ tag: 'oversized', confidence: 0.7, reason: 'Package weight > 50 lbs' });
      }
    }
    
    if (entityType === 'product') {
      // Category-based suggestions
      if (entityData.category) {
        const categoryTag = entityData.category.toLowerCase();
        suggestions.push({ tag: categoryTag, confidence: 0.9, reason: `Product category: ${entityData.category}` });
      }
      
      // Weight-based suggestions
      if (entityData.weight < 1) {
        suggestions.push({ tag: 'lightweight', confidence: 0.7, reason: 'Product weight < 1 lb' });
      }
      
      // Price-based suggestions
      if (entityData.price > 200) {
        suggestions.push({ tag: 'high-value', confidence: 0.8, reason: 'Product price > $200' });
      }
    }
    
    return suggestions;
  }

  // Auto-apply tags based on conditions
  async autoApplyTags(entityType, entity) {
    const suggestions = await this.suggestTags(entityType, entity);
    const autoApplyTags = suggestions
      .filter(suggestion => suggestion.confidence >= 0.8)
      .map(suggestion => suggestion.tag);
    
    if (autoApplyTags.length > 0) {
      await this.applyTags(entityType, entity._id, autoApplyTags, 'system');
    }
    
    return autoApplyTags;
  }

  // Search entities by tags
  async searchByTags(entityType, tagQuery) {
    const Model = this.getModelForEntity(entityType);
    const { include = [], exclude = [], operator = 'AND' } = tagQuery;
    
    let query = {};
    
    if (include.length > 0) {
      if (operator === 'AND') {
        query.tags = { $all: include };
      } else {
        query.tags = { $in: include };
      }
    }
    
    if (exclude.length > 0) {
      query.tags = { ...query.tags, $nin: exclude };
    }
    
    return await Model.find(query);
  }

  // Get tag analytics
  async getTagAnalytics(timeRange = '30d') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));
    
    const analytics = await this.Tag.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'name',
          foreignField: 'tags',
          as: 'recentOrders'
        }
      },
      {
        $addFields: {
          recentOrdersCount: {
            $size: {
              $filter: {
                input: '$recentOrders',
                cond: { $gte: ['$$this.createdAt', startDate] }
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          category: 1,
          color: 1,
          usage: 1,
          recentOrdersCount: 1,
          totalUsage: { $add: ['$usage.orders', '$usage.products', '$usage.customers'] }
        }
      },
      {
        $sort: { totalUsage: -1 }
      }
    ]);
    
    return analytics;
  }

  // Trigger automation based on tag changes
  async triggerTagAutomation(order, tags, eventType) {
    const AutomationRule = mongoose.model('AutomationRule');
    
    // Find rules that trigger on tag events
    const rules = await AutomationRule.find({
      enabled: true,
      'trigger.event': eventType,
      $or: [
        { 'trigger.conditions.tags.include': { $in: tags } },
        { 'trigger.conditions.tags.exclude': { $nin: tags } }
      ]
    }).sort({ priority: -1 });
    
    for (const rule of rules) {
      if (await this.evaluateTagConditions(order, rule.trigger.conditions)) {
        await this.executeTagActions(order, rule.actions);
        
        // Log automation execution
        order.automation = order.automation || {};
        order.automation.rules = order.automation.rules || [];
        order.automation.rules.push({
          ruleId: rule._id,
          triggeredBy: eventType,
          tags: tags,
          timestamp: new Date()
        });
        
        await order.save();
      }
    }
  }

  // Evaluate tag-based conditions
  async evaluateTagConditions(order, conditions) {
    if (!conditions.tags) return true;
    
    const orderTags = order.tags || [];
    const { include = [], exclude = [], operator = 'AND' } = conditions.tags;
    
    // Check include conditions
    if (include.length > 0) {
      if (operator === 'AND') {
        if (!include.every(tag => orderTags.includes(tag))) return false;
      } else {
        if (!include.some(tag => orderTags.includes(tag))) return false;
      }
    }
    
    // Check exclude conditions
    if (exclude.length > 0) {
      if (exclude.some(tag => orderTags.includes(tag))) return false;
    }
    
    return true;
  }

  // Execute actions based on tag automation
  async executeTagActions(order, actions) {
    // Apply additional tags
    if (actions.tagging?.addTags?.length > 0) {
      await this.applyTags('order', order._id, actions.tagging.addTags, 'automation');
    }
    
    // Remove tags
    if (actions.tagging?.removeTags?.length > 0) {
      await this.removeTags('order', order._id, actions.tagging.removeTags, 'automation');
    }
    
    // Other automation actions (shipping, notifications, etc.)
    // These would integrate with existing automation system
    if (actions.shipping) {
      order.shipping = { ...order.shipping, ...actions.shipping };
    }
    
    if (actions.priority) {
      await this.applyTags('order', order._id, [actions.priority], 'automation');
    }
    
    if (actions.notifications?.emailTeam) {
      // Trigger email notification
      await this.sendTagNotification(order, actions.notifications);
    }
  }

  // Send notifications for tag-based events
  async sendTagNotification(order, notificationConfig) {
    const emailContent = {
      subject: `Order ${order.orderNumber} - Tag Action Triggered`,
      body: `Order ${order.orderNumber} has been automatically processed based on tag rules.
      
      Current Tags: ${order.tags.join(', ')}
      Customer: ${order.customer.name}
      Value: $${order.totals.total}
      
      This is an automated notification from ShipMaster Pro.`
    };
    
    // Integration with notification service
    console.log('Tag notification:', emailContent);
  }

  // Utility methods
  getModelForEntity(entityType) {
    const models = {
      'order': mongoose.model('Order'),
      'product': mongoose.model('Product'),
      'customer': mongoose.model('Customer')
    };
    
    return models[entityType];
  }

  async updateTagUsage(tagNames, entityType, delta) {
    const updateField = `usage.${entityType}s`;
    await this.Tag.updateMany(
      { name: { $in: tagNames } },
      { 
        $inc: { [updateField]: delta },
        $set: { 'metadata.lastUsed': new Date() }
      }
    );
  }

  invalidateCache() {
    this.tagCache.clear();
  }

  emitTagEvent(eventType, data) {
    const listeners = this.tagListeners.get(eventType) || [];
    listeners.forEach(listener => listener(data));
  }

  onTagEvent(eventType, listener) {
    const listeners = this.tagListeners.get(eventType) || [];
    listeners.push(listener);
    this.tagListeners.set(eventType, listeners);
  }
}

// Enhanced Automation Rules with Tag Support
const enhancedAutomationRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  enabled: { type: Boolean, default: true },
  priority: { type: Number, default: 1 },
  
  trigger: {
    event: { 
      type: String, 
      enum: ['order_imported', 'order_updated', 'tag_applied', 'tag_removed', 'customer_updated', 'inventory_low'],
      required: true 
    },
    conditions: {
      // Existing conditions
      orderValue: { min: Number, max: Number },
      weight: { min: Number, max: Number },
      itemCount: { min: Number, max: Number },
      
      // Enhanced tag conditions
      tags: {
        include: [String], // Must have ALL these tags (AND)
        exclude: [String], // Must NOT have ANY of these tags
        operator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
        includeAny: [String], // Must have AT LEAST ONE of these tags (OR)
        collections: [String], // Must have tags from these collections
        priority: { min: Number, max: Number } // Tag priority range
      },
      
      // Time-based tag conditions
      tagHistory: {
        addedWithin: Number, // Minutes since tag was added
        removedWithin: Number, // Minutes since tag was removed
        specificTag: String // Check history for specific tag
      },
      
      // Customer tag conditions
      customerTags: {
        include: [String],
        exclude: [String],
        operator: { type: String, enum: ['AND', 'OR'], default: 'AND' }
      },
      
      // Product tag conditions
      productTags: {
        include: [String],
        exclude: [String],
        operator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
        percentage: Number // Percentage of items that must match
      }
    }
  },
  
  actions: {
    // Enhanced tagging actions
    tagging: {
      addTags: [String],
      removeTags: [String],
      replaceTags: [{ from: String, to: String }],
      copyFromCustomer: Boolean, // Copy customer tags to order
      copyFromProducts: Boolean, // Copy product tags to order
      conditional: [{
        condition: Object,
        addTags: [String],
        removeTags: [String]
      }]
    },
    
    // Priority management
    priority: {
      level: { type: String, enum: ['urgent', 'high', 'normal', 'low'] },
      adjustBy: Number, // Adjust priority score
      queue: String // Assign to specific queue
    },
    
    // Enhanced shipping actions
    shipping: {
      carrier: String,
      service: String,
      packaging: String,
      requireSignature: Boolean,
      addInsurance: Boolean,
      saturdayDelivery: Boolean,
      holdForPickup: Boolean
    },
    
    // Workflow actions
    workflow: {
      assignTo: String, // User ID or team
      department: String,
      status: String,
      requireApproval: Boolean,
      escalate: Boolean,
      skipSteps: [String] // Skip specific workflow steps
    },
    
    // Enhanced notifications
    notifications: {
      email: {
        team: Boolean,
        customer: Boolean,
        specific: [String], // Specific email addresses
        template: String,
        includeDetails: Boolean
      },
      sms: {
        customer: Boolean,
        team: Boolean
      },
      slack: {
        channel: String,
        mentionUsers: [String],
        template: String
      },
      webhook: {
        url: String,
        payload: Object
      }
    },
    
    // Integration actions
    integrations: {
      updateExternalSystems: Boolean,
      syncInventory: Boolean,
      createFulfillmentOrder: Boolean,
      updateCRM: {
        enabled: Boolean,
        fields: Object
      }
    }
  },
  
  schedule: {
    enabled: Boolean,
    frequency: { type: String, enum: ['immediate', 'hourly', 'daily', 'weekly'] },
    time: String,
    timezone: String,
    delayMinutes: Number // Delay execution by X minutes
  },
  
  conditions: {
    businessHours: Boolean,
    weekdays: [String],
    excludeHolidays: Boolean,
    orderAge: { min: Number, max: Number } // Minutes since order creation
  },
  
  stats: {
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
    lastExecuted: Date,
    avgExecutionTime: { type: Number, default: 0 },
    taggedOrders: { type: Number, default: 0 }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Tag-based API Routes
const tagRoutes = {
  // Get all tags with analytics
  'GET /api/tags': async (req, res) => {
    try {
      const { category, includeUsage = true } = req.query;
      const query = category ? { category } : {};
      
      let tags = await Tag.find(query).sort({ name: 1 });
      
      if (includeUsage) {
        const analytics = await taggingService.getTagAnalytics();
        tags = tags.map(tag => {
          const analytics_data = analytics.find(a => a._id.equals(tag._id));
          return { ...tag.toObject(), analytics: analytics_data };
        });
      }
      
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Create new tag
  'POST /api/tags': async (req, res) => {
    try {
      const tag = await taggingService.createTag(req.body);
      res.status(201).json(tag);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Apply tags to entity
  'POST /api/tags/apply': async (req, res) => {
    try {
      const { entityType, entityId, tags } = req.body;
      const entity = await taggingService.applyTags(
        entityType, 
        entityId, 
        tags, 
        req.user?.id
      );
      res.json(entity);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Remove tags from entity
  'POST /api/tags/remove': async (req, res) => {
    try {
      const { entityType, entityId, tags } = req.body;
      const entity = await taggingService.removeTags(
        entityType, 
        entityId, 
        tags, 
        req.user?.id
      );
      res.json(entity);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Get tag suggestions
  'POST /api/tags/suggest': async (req, res) => {
    try {
      const { entityType, entityData } = req.body;
      const suggestions = await taggingService.suggestTags(entityType, entityData);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Search entities by tags
  'POST /api/tags/search': async (req, res) => {
    try {
      const { entityType, tagQuery } = req.body;
      const results = await taggingService.searchByTags(entityType, tagQuery);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get tag analytics
  'GET /api/tags/analytics': async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const analytics = await taggingService.getTagAnalytics(timeRange);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Bulk tag operations
  'POST /api/tags/bulk': async (req, res) => {
    try {
      const { operation, entities, tags } = req.body; // operation: 'apply' | 'remove'
      const results = [];
      
      for (const entity of entities) {
        try {
          const result = operation === 'apply' 
            ? await taggingService.applyTags(entity.type, entity.id, tags, req.user?.id)
            : await taggingService.removeTags(entity.type, entity.id, tags, req.user?.id);
          
          results.push({ success: true, entity: entity.id, result });
        } catch (error) {
          results.push({ success: false, entity: entity.id, error: error.message });
        }
      }
      
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Tag collections management
  'GET /api/tags/collections': async (req, res) => {
    try {
      const collections = await TagCollection.find().populate('tags');
      res.json(collections);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  'POST /api/tags/collections': async (req, res) => {
    try {
      const collection = new TagCollection(req.body);
      await collection.save();
      res.status(201).json(collection);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

// Initialize tagging service
const taggingService = new TaggingService();

// Export everything
module.exports = {
  TaggingService,
  tagSchema,
  tagCollectionSchema,
  enhancedAutomationRuleSchema,
  tagRoutes,
  taggingService
};