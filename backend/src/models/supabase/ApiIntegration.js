const { getSupabaseManager } = require('../../config/supabase');

class ApiIntegrationModel {
  constructor() {
    this.manager = getSupabaseManager();
    this.tableName = 'api_integrations';
  }

  // Create a new API integration
  async create(integrationData) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .insert({
          ...this.transformToDb(integrationData),
          created_at: new Date(),
          updated_at: new Date()
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

  // Find integrations with filters
  async find(filters = {}, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('*');

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters['status.connected']) {
        query = query.eq('status->>connected', filters['status.connected']);
      }
      if (filters['syncSettings.enabled']) {
        query = query.eq('sync_settings->>enabled', filters['syncSettings.enabled']);
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

    return result.data.map(integration => this.transformFromDb(integration));
  }

  // Find one integration
  async findOne(filters) {
    const integrations = await this.find(filters, { limit: 1 });
    return integrations[0] || null;
  }

  // Find by ID
  async findById(id) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    });

    if (!result.success || !result.data) {
      return null;
    }

    return this.transformFromDb(result.data);
  }

  // Update integration
  async findByIdAndUpdate(id, updates, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      const updateData = {
        ...this.transformToDb(updates),
        updated_at: new Date()
      };

      const { data, error } = await client
        .from(this.tableName)
        .update(updateData)
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

  // Delete integration
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
      if (filter.type) {
        query = query.eq('type', filter.type);
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
      if (filter.type) {
        query = query.eq('type', filter.type);
      }
      if (filter['status.connected']) {
        query = query.eq('status->>connected', filter['status.connected']);
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

  // Instance methods (added to transformed objects)
  createInstanceMethods() {
    return {
      save: async function() {
        const instance = new ApiIntegrationModel();
        const { _id, id, ...updateData } = this;
        const updated = await instance.findByIdAndUpdate(_id || id, updateData);
        Object.assign(this, updated);
        return this;
      }
    };
  }

  // Helper methods
  transformFromDb(dbIntegration) {
    if (!dbIntegration) return null;

    const transformed = {
      _id: dbIntegration.id,
      id: dbIntegration.id,
      userId: dbIntegration.user_id,
      name: dbIntegration.name,
      type: dbIntegration.type,
      config: dbIntegration.config,
      status: dbIntegration.status,
      syncSettings: dbIntegration.sync_settings,
      fieldMapping: dbIntegration.field_mapping,
      webhooks: dbIntegration.webhooks,
      rateLimits: dbIntegration.rate_limits,
      stats: dbIntegration.stats,
      createdAt: dbIntegration.created_at,
      updatedAt: dbIntegration.updated_at
    };

    // Add instance methods
    Object.assign(transformed, this.createInstanceMethods());

    return transformed;
  }

  transformToDb(integration) {
    const transformed = {};

    if (integration.userId !== undefined) transformed.user_id = integration.userId;
    if (integration.name !== undefined) transformed.name = integration.name;
    if (integration.type !== undefined) transformed.type = integration.type;
    if (integration.config !== undefined) transformed.config = integration.config;
    if (integration.status !== undefined) transformed.status = integration.status;
    if (integration.syncSettings !== undefined) transformed.sync_settings = integration.syncSettings;
    if (integration.fieldMapping !== undefined) transformed.field_mapping = integration.fieldMapping;
    if (integration.webhooks !== undefined) transformed.webhooks = integration.webhooks;
    if (integration.rateLimits !== undefined) transformed.rate_limits = integration.rateLimits;
    if (integration.stats !== undefined) transformed.stats = integration.stats;

    return transformed;
  }
}

// Export as singleton to mimic Mongoose model
module.exports = new ApiIntegrationModel();