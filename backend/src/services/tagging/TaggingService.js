const { Tag, TagCollection, Order } = require('../../models');
const eventEmitter = require('../../utils/eventEmitter');

class TaggingService {
  constructor() {
    this.tagCache = new Map();
    this.collectionCache = new Map();
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Listen for order events
    eventEmitter.on('order:created', this.handleOrderCreated.bind(this));
    eventEmitter.on('order:updated', this.handleOrderUpdated.bind(this));
    eventEmitter.on('order:statusChanged', this.handleStatusChanged.bind(this));
  }

  // Tag Management
  async createTag(tagData) {
    const tag = new Tag(tagData);
    await tag.save();
    
    // Clear cache
    this.tagCache.clear();
    
    return tag;
  }

  async updateTag(tagId, updates) {
    const tag = await Tag.findByIdAndUpdate(tagId, updates, { new: true });
    
    // Clear cache
    this.tagCache.delete(tagId);
    
    return tag;
  }

  async deleteTag(tagId) {
    const tag = await Tag.findById(tagId);
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    if (!tag.canBeDeleted()) {
      throw new Error('Tag cannot be deleted: System tag or used in automation rules');
    }
    
    // Remove tag from all orders
    await Order.updateMany(
      { tags: tagId },
      { $pull: { tags: tagId } }
    );
    
    // Remove tag from collections
    await TagCollection.updateMany(
      { tags: tagId },
      { $pull: { tags: tagId } }
    );
    
    await tag.remove();
    
    // Clear cache
    this.tagCache.delete(tagId);
    
    return { success: true };
  }

  async getTag(tagId) {
    if (this.tagCache.has(tagId)) {
      return this.tagCache.get(tagId);
    }
    
    const tag = await Tag.findById(tagId);
    if (tag) {
      this.tagCache.set(tagId, tag);
    }
    
    return tag;
  }

  async getTags(filters = {}) {
    const query = { 'metadata.isActive': true };
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { displayName: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') }
      ];
    }
    
    return Tag.find(query).sort({ 'metadata.usageCount': -1 });
  }

  // Tag Application
  async applyTags(entityType, entityId, tagIds) {
    const entity = await this.getEntity(entityType, entityId);
    
    if (!entity) {
      throw new Error(`${entityType} not found`);
    }
    
    // Validate tags exist
    const tags = await Tag.find({ _id: { $in: tagIds } });
    if (tags.length !== tagIds.length) {
      throw new Error('One or more tags not found');
    }
    
    // Check exclusive collections
    await this.validateExclusiveCollections(entity.tags, tagIds);
    
    // Apply tags
    const newTags = tagIds.filter(tagId => 
      !entity.tags.some(existingTag => existingTag.toString() === tagId.toString())
    );
    
    if (newTags.length > 0) {
      entity.tags.push(...newTags);
      await entity.save();
      
      // Update tag usage statistics
      await Promise.all(newTags.map(tagId => Tag.incrementUsage(tagId)));
      
      // Emit event
      eventEmitter.emit(`${entityType}:tagged`, {
        entityType,
        entityId,
        tags: newTags,
        entity
      });
    }
    
    return entity;
  }

  async removeTags(entityType, entityId, tagIds) {
    const entity = await this.getEntity(entityType, entityId);
    
    if (!entity) {
      throw new Error(`${entityType} not found`);
    }
    
    // Remove tags
    entity.tags = entity.tags.filter(tag => 
      !tagIds.some(removeId => tag.toString() === removeId.toString())
    );
    
    await entity.save();
    
    // Emit event
    eventEmitter.emit(`${entityType}:untagged`, {
      entityType,
      entityId,
      tags: tagIds,
      entity
    });
    
    return entity;
  }

  // Tag Suggestions
  async suggestTags(order) {
    const suggestions = [];
    const scores = new Map();
    
    // Priority based on order value
    if (order.totals.total >= 1000) {
      await this.addSuggestion(scores, 'vip-order', 90);
    } else if (order.totals.total >= 500) {
      await this.addSuggestion(scores, 'high-value', 80);
    }
    
    // Shipping method suggestions
    if (order.shipping?.options?.signatureRequired) {
      await this.addSuggestion(scores, 'signature-required', 85);
    }
    
    if (order.shipping?.options?.insurance) {
      await this.addSuggestion(scores, 'insured', 80);
    }
    
    // Customer-based suggestions
    if (order.customer.orderCount > 10) {
      await this.addSuggestion(scores, 'repeat-customer', 85);
    } else if (order.customer.orderCount === 1) {
      await this.addSuggestion(scores, 'first-time', 80);
    }
    
    // Product-based suggestions
    const hasFragile = order.items.some(item => item.tags?.some(tag => tag.name === 'fragile'));
    if (hasFragile) {
      await this.addSuggestion(scores, 'fragile-items', 90);
    }
    
    // Time-based suggestions
    const orderDate = new Date(order.timestamps.ordered);
    const dayOfWeek = orderDate.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      await this.addSuggestion(scores, 'weekend-order', 70);
    }
    
    // Location-based suggestions
    if (order.shippingAddress.country !== 'US') {
      await this.addSuggestion(scores, 'international', 85);
    }
    
    // Sort by score and return top suggestions
    const sortedSuggestions = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    for (const [tagName, score] of sortedSuggestions) {
      const tag = await Tag.findOne({ name: tagName });
      if (tag) {
        suggestions.push({
          tag,
          score,
          reason: this.getTagReason(tagName, order)
        });
      }
    }
    
    return suggestions;
  }

  async addSuggestion(scores, tagName, score) {
    const currentScore = scores.get(tagName) || 0;
    scores.set(tagName, Math.max(currentScore, score));
  }

  getTagReason(tagName, order) {
    const reasons = {
      'vip-order': `Order value $${order.totals.total.toFixed(2)} exceeds VIP threshold`,
      'high-value': `Order value $${order.totals.total.toFixed(2)} is above average`,
      'signature-required': 'Signature confirmation requested',
      'insured': 'Shipping insurance added',
      'repeat-customer': `Customer has placed ${order.customer.orderCount} orders`,
      'first-time': 'First order from this customer',
      'fragile-items': 'Order contains fragile items',
      'weekend-order': 'Order placed on weekend',
      'international': `Shipping to ${order.shippingAddress.country}`
    };
    
    return reasons[tagName] || 'Based on order characteristics';
  }

  // Collection Management
  async createCollection(collectionData) {
    const collection = new TagCollection(collectionData);
    await collection.save();
    
    // Clear cache
    this.collectionCache.clear();
    
    return collection;
  }

  async validateExclusiveCollections(currentTags, newTags) {
    const exclusiveCollections = await TagCollection.findExclusive();
    
    for (const collection of exclusiveCollections) {
      const collectionTagIds = collection.tags.map(t => t._id.toString());
      
      // Find tags from this collection in current and new tags
      const currentFromCollection = currentTags.filter(tagId => 
        collectionTagIds.includes(tagId.toString())
      );
      
      const newFromCollection = newTags.filter(tagId => 
        collectionTagIds.includes(tagId.toString())
      );
      
      // If trying to add tags from exclusive collection
      if (newFromCollection.length > 0) {
        // Check if there are already tags from this collection
        if (currentFromCollection.length > 0) {
          throw new Error(`Cannot add multiple tags from exclusive collection: ${collection.name}`);
        }
        
        // Check if trying to add multiple tags from same exclusive collection
        if (newFromCollection.length > 1) {
          throw new Error(`Can only select one tag from exclusive collection: ${collection.name}`);
        }
      }
    }
  }

  // Auto-tagging
  async autoTagOrder(order) {
    const autoApplyTags = await Tag.find({
      'settings.autoApply': true,
      'metadata.isActive': true
    });
    
    const tagsToApply = [];
    
    for (const tag of autoApplyTags) {
      if (await this.evaluateAutoApplyConditions(order, tag.settings.autoApplyConditions)) {
        tagsToApply.push(tag._id);
      }
    }
    
    if (tagsToApply.length > 0) {
      await this.applyTags('order', order._id, tagsToApply);
    }
    
    return tagsToApply;
  }

  async evaluateAutoApplyConditions(order, conditions) {
    if (!conditions) return false;
    
    // Similar logic to automation rule conditions
    // This is a simplified version - expand as needed
    
    if (conditions.minOrderValue && order.totals.total < conditions.minOrderValue) {
      return false;
    }
    
    if (conditions.maxOrderValue && order.totals.total > conditions.maxOrderValue) {
      return false;
    }
    
    if (conditions.countries?.length && !conditions.countries.includes(order.shippingAddress.country)) {
      return false;
    }
    
    return true;
  }

  // Event Handlers
  async handleOrderCreated({ order }) {
    try {
      // Auto-tag new orders
      await this.autoTagOrder(order);
      
      // Get tag suggestions
      const suggestions = await this.suggestTags(order);
      
      // Store suggestions for UI display
      order.metadata = order.metadata || {};
      order.metadata.tagSuggestions = suggestions;
      await order.save();
    } catch (error) {
      console.error('Error in handleOrderCreated:', error);
    }
  }

  async handleOrderUpdated({ order, changes }) {
    try {
      // Re-evaluate auto-tags if relevant fields changed
      if (changes.includes('totals') || changes.includes('shippingAddress')) {
        await this.autoTagOrder(order);
      }
    } catch (error) {
      console.error('Error in handleOrderUpdated:', error);
    }
  }

  async handleStatusChanged({ order, oldStatus, newStatus }) {
    try {
      // Apply status-based tags
      const statusTags = {
        'processing': 'in-processing',
        'shipped': 'shipped',
        'delivered': 'completed',
        'cancelled': 'cancelled',
        'returned': 'returned'
      };
      
      const tagName = statusTags[newStatus];
      if (tagName) {
        const tag = await Tag.findOne({ name: tagName });
        if (tag) {
          await this.applyTags('order', order._id, [tag._id]);
        }
      }
    } catch (error) {
      console.error('Error in handleStatusChanged:', error);
    }
  }

  // Bulk Operations
  async bulkTag(entityType, entityIds, tagIds) {
    const results = {
      success: [],
      failed: []
    };
    
    for (const entityId of entityIds) {
      try {
        await this.applyTags(entityType, entityId, tagIds);
        results.success.push(entityId);
      } catch (error) {
        results.failed.push({
          entityId,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async bulkRemoveTags(entityType, entityIds, tagIds) {
    const results = {
      success: [],
      failed: []
    };
    
    for (const entityId of entityIds) {
      try {
        await this.removeTags(entityType, entityId, tagIds);
        results.success.push(entityId);
      } catch (error) {
        results.failed.push({
          entityId,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Analytics
  async getTagAnalytics(tagId, dateRange) {
    const tag = await Tag.findById(tagId);
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    const analytics = {
      tag,
      usage: {
        orders: tag.stats.ordersTagged,
        products: tag.stats.productsTagged,
        customers: tag.stats.customersTagged,
        automationRules: tag.stats.automationRules
      },
      trends: await this.getTagTrends(tagId, dateRange),
      relatedTags: await this.getRelatedTags(tagId),
      performance: await this.getTagPerformance(tagId, dateRange)
    };
    
    return analytics;
  }

  async getTagTrends(tagId, dateRange) {
    // This would aggregate tag usage over time
    // Simplified for now
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }

  async getRelatedTags(tagId) {
    // Find tags that frequently appear together
    const orders = await Order.find({ tags: tagId })
      .select('tags')
      .limit(1000);
    
    const coOccurrence = new Map();
    
    for (const order of orders) {
      for (const otherTagId of order.tags) {
        if (otherTagId.toString() !== tagId.toString()) {
          const count = coOccurrence.get(otherTagId.toString()) || 0;
          coOccurrence.set(otherTagId.toString(), count + 1);
        }
      }
    }
    
    // Get top related tags
    const sortedTags = Array.from(coOccurrence.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const relatedTags = [];
    for (const [relatedTagId, count] of sortedTags) {
      const tag = await Tag.findById(relatedTagId);
      if (tag) {
        relatedTags.push({
          tag,
          coOccurrenceCount: count,
          percentage: (count / orders.length * 100).toFixed(2)
        });
      }
    }
    
    return relatedTags;
  }

  async getTagPerformance(tagId, dateRange) {
    // Analyze performance metrics for orders with this tag
    const match = { tags: tagId };
    if (dateRange) {
      match['timestamps.imported'] = { $gte: dateRange.start, $lte: dateRange.end };
    }
    
    const performance = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totals.total' },
          avgOrderValue: { $avg: '$totals.total' },
          shippingCost: { $avg: '$shipping.cost' },
          deliveryDays: { $avg: '$shipping.deliveryDays' }
        }
      }
    ]);
    
    return performance[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      shippingCost: 0,
      deliveryDays: 0
    };
  }

  // Helper methods
  async getEntity(entityType, entityId) {
    switch (entityType) {
      case 'order':
        return Order.findById(entityId);
      case 'product':
        // return Product.findById(entityId);
        break;
      case 'customer':
        // return Customer.findById(entityId);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  // System initialization
  async initializeSystemTags() {
    const systemTags = [
      // Priority tags
      { name: 'urgent', displayName: 'Urgent', category: 'priority', color: '#EF4444', metadata: { isSystem: true } },
      { name: 'high-priority', displayName: 'High Priority', category: 'priority', color: '#F59E0B', metadata: { isSystem: true } },
      { name: 'normal', displayName: 'Normal', category: 'priority', color: '#10B981', metadata: { isSystem: true } },
      { name: 'low-priority', displayName: 'Low Priority', category: 'priority', color: '#6B7280', metadata: { isSystem: true } },
      
      // Shipping tags
      { name: 'express', displayName: 'Express Shipping', category: 'shipping', color: '#8B5CF6', metadata: { isSystem: true } },
      { name: 'standard', displayName: 'Standard Shipping', category: 'shipping', color: '#3B82F6', metadata: { isSystem: true } },
      { name: 'international', displayName: 'International', category: 'shipping', color: '#06B6D4', metadata: { isSystem: true } },
      
      // Order status tags
      { name: 'pending-review', displayName: 'Pending Review', category: 'order', color: '#F59E0B', metadata: { isSystem: true } },
      { name: 'ready-to-ship', displayName: 'Ready to Ship', category: 'order', color: '#10B981', metadata: { isSystem: true } },
      { name: 'on-hold', displayName: 'On Hold', category: 'order', color: '#EF4444', metadata: { isSystem: true } },
      
      // Customer tags
      { name: 'vip', displayName: 'VIP Customer', category: 'customer', color: '#9333EA', metadata: { isSystem: true } },
      { name: 'wholesale', displayName: 'Wholesale', category: 'customer', color: '#059669', metadata: { isSystem: true } },
      { name: 'retail', displayName: 'Retail', category: 'customer', color: '#3B82F6', metadata: { isSystem: true } }
    ];
    
    for (const tagData of systemTags) {
      const exists = await Tag.findOne({ name: tagData.name });
      if (!exists) {
        await this.createTag(tagData);
      }
    }
    
    // Create system collections
    const collections = [
      {
        name: 'Priority Level',
        description: 'Order priority classification',
        type: 'exclusive',
        metadata: { isSystem: true }
      },
      {
        name: 'Shipping Method',
        description: 'Shipping service level',
        type: 'exclusive',
        metadata: { isSystem: true }
      }
    ];
    
    for (const collectionData of collections) {
      const exists = await TagCollection.findOne({ name: collectionData.name });
      if (!exists) {
        const collection = await this.createCollection(collectionData);
        
        // Add appropriate tags to collections
        if (collection.name === 'Priority Level') {
          const priorityTags = await Tag.find({ category: 'priority', 'metadata.isSystem': true });
          collection.tags = priorityTags.map(t => t._id);
          await collection.save();
        } else if (collection.name === 'Shipping Method') {
          const shippingTags = await Tag.find({ 
            name: { $in: ['express', 'standard'] },
            'metadata.isSystem': true 
          });
          collection.tags = shippingTags.map(t => t._id);
          await collection.save();
        }
      }
    }
  }
}

module.exports = new TaggingService();