const { getSupabaseManager } = require('../../config/supabase');

class OrderModel {
  constructor() {
    this.manager = getSupabaseManager();
    this.tableName = 'orders';
  }

  // Create a new order
  async create(orderData) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .insert({
          ...orderData,
          order_number: orderData.orderNumber || this.generateOrderNumber(),
          external_order_id: orderData.externalOrderId,
          ordered_at: orderData.timestamps?.ordered || new Date()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return this.transformFromDb(result.data);
  }

  // Find orders with filters
  async find(filters = {}, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select(`
          *,
          order_tags!inner(tag_id)
        `);

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.orderNumber) {
        query = query.eq('order_number', filters.orderNumber);
      }
      if (filters['customer.email']) {
        query = query.eq('customer->>email', filters['customer.email']);
      }

      // Apply sorting
      if (options.sort) {
        const order = options.order || 'desc';
        query = query.order(options.sort, { ascending: order === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data.map(order => this.transformFromDb(order));
  }

  // Find one order
  async findOne(filters) {
    const orders = await this.find(filters, { limit: 1 });
    return orders[0] || null;
  }

  // Find by ID
  async findById(id) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .select(`
          *,
          order_tags(tag_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    });

    if (!result.success) {
      return null;
    }

    return this.transformFromDb(result.data);
  }

  // Update order
  async findByIdAndUpdate(id, updates, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .update(this.transformToDb(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return this.transformFromDb(result.data);
  }

  // Delete order
  async findByIdAndDelete(id) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return this.transformFromDb(result.data);
  }

  // Update many
  async updateMany(filter, updates) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .update(this.transformToDb(updates));

      // Apply filters
      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter.status) {
        query = query.eq('status', filter.status);
      }
      if (filter.tags) {
        // Handle tag filtering via junction table
        // This would need a more complex query
      }

      const { data, error } = await query.select();
      if (error) throw error;
      return data;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return { modifiedCount: result.data.length };
  }

  // Count documents
  async countDocuments(filter = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('id', { count: 'exact', head: true });

      // Apply filters
      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  }

  // Aggregate
  async aggregate(pipeline) {
    // Convert MongoDB aggregation pipeline to Supabase query
    // This is a simplified version - would need more complex implementation
    const result = await this.manager.executeQuery(async (client) => {
      // Example: Get status counts
      const { data, error } = await client
        .rpc('get_order_status_counts', { user_id_param: pipeline[0].$match?.userId });
      
      if (error) throw error;
      return data;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.data;
  }

  // Static methods
  static async findPendingAutomation(userId) {
    const instance = new OrderModel();
    return instance.find({
      userId,
      'automation.processed': false,
      status: { $in: ['pending', 'processing'] }
    });
  }

  static async findByTrackingNumber(trackingNumber) {
    const instance = new OrderModel();
    const result = await instance.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .eq('shipping->>trackingNumber', trackingNumber)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data;
    });

    return result.success && result.data ? instance.transformFromDb(result.data) : null;
  }

  // Helper methods
  generateOrderNumber() {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }

  transformFromDb(dbOrder) {
    if (!dbOrder) return null;

    return {
      _id: dbOrder.id,
      id: dbOrder.id,
      userId: dbOrder.user_id,
      orderNumber: dbOrder.order_number,
      externalOrderId: dbOrder.external_order_id,
      source: dbOrder.source,
      status: dbOrder.status,
      customer: dbOrder.customer,
      shippingAddress: dbOrder.shipping_address,
      billingAddress: dbOrder.billing_address,
      items: dbOrder.items,
      shipping: dbOrder.shipping,
      totals: dbOrder.totals,
      tags: dbOrder.order_tags?.map(t => t.tag_id) || [],
      notes: dbOrder.notes,
      internalNotes: dbOrder.internal_notes,
      giftMessage: dbOrder.gift_message,
      automation: dbOrder.automation,
      fulfillment: dbOrder.fulfillment,
      tracking: dbOrder.tracking,
      timestamps: {
        ordered: dbOrder.ordered_at,
        imported: dbOrder.imported_at,
        processed: dbOrder.processed_at,
        shipped: dbOrder.shipped_at,
        delivered: dbOrder.delivered_at,
        cancelled: dbOrder.cancelled_at
      },
      metadata: dbOrder.metadata,
      createdAt: dbOrder.created_at,
      updatedAt: dbOrder.updated_at,
      
      // Methods
      save: async function() {
        const instance = new OrderModel();
        const updated = await instance.findByIdAndUpdate(this.id, this);
        Object.assign(this, updated);
        return this;
      }
    };
  }

  transformToDb(order) {
    const transformed = {};

    if (order.orderNumber !== undefined) transformed.order_number = order.orderNumber;
    if (order.externalOrderId !== undefined) transformed.external_order_id = order.externalOrderId;
    if (order.userId !== undefined) transformed.user_id = order.userId;
    if (order.source !== undefined) transformed.source = order.source;
    if (order.status !== undefined) transformed.status = order.status;
    if (order.customer !== undefined) transformed.customer = order.customer;
    if (order.shippingAddress !== undefined) transformed.shipping_address = order.shippingAddress;
    if (order.billingAddress !== undefined) transformed.billing_address = order.billingAddress;
    if (order.items !== undefined) transformed.items = order.items;
    if (order.shipping !== undefined) transformed.shipping = order.shipping;
    if (order.totals !== undefined) transformed.totals = order.totals;
    if (order.notes !== undefined) transformed.notes = order.notes;
    if (order.internalNotes !== undefined) transformed.internal_notes = order.internalNotes;
    if (order.giftMessage !== undefined) transformed.gift_message = order.giftMessage;
    if (order.automation !== undefined) transformed.automation = order.automation;
    if (order.fulfillment !== undefined) transformed.fulfillment = order.fulfillment;
    if (order.tracking !== undefined) transformed.tracking = order.tracking;
    if (order.metadata !== undefined) transformed.metadata = order.metadata;

    // Handle timestamps
    if (order.timestamps) {
      if (order.timestamps.ordered) transformed.ordered_at = order.timestamps.ordered;
      if (order.timestamps.processed) transformed.processed_at = order.timestamps.processed;
      if (order.timestamps.shipped) transformed.shipped_at = order.timestamps.shipped;
      if (order.timestamps.delivered) transformed.delivered_at = order.timestamps.delivered;
      if (order.timestamps.cancelled) transformed.cancelled_at = order.timestamps.cancelled;
    }

    return transformed;
  }
}

// Export as singleton to mimic Mongoose model
module.exports = new OrderModel();