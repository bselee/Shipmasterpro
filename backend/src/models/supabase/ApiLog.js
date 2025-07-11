const { getSupabaseManager } = require('../../config/supabase');

class ApiLogModel {
  constructor() {
    this.manager = getSupabaseManager();
    this.tableName = 'api_logs';
  }

  // Create a new API log
  async create(logData) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .insert({
          ...this.transformToDb(logData),
          timestamp: logData.timestamp || new Date()
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

  // Find logs with filters
  async find(filters = {}, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('*');

      // Apply filters
      if (filters.integrationId) {
        query = query.eq('integration_id', filters.integrationId);
      }
      if (filters.endpoint) {
        query = query.eq('endpoint', filters.endpoint);
      }
      if (filters.method) {
        query = query.eq('method', filters.method);
      }
      if (filters.responseStatus) {
        query = query.eq('response_status', filters.responseStatus);
      }
      if (filters.error) {
        // Check if error exists (not null)
        if (filters.error === true) {
          query = query.not('error', 'is', null);
        } else if (filters.error === false) {
          query = query.is('error', null);
        } else {
          query = query.eq('error', filters.error);
        }
      }

      // Date range filters
      if (filters.timestamp) {
        if (filters.timestamp.$gte) {
          query = query.gte('timestamp', filters.timestamp.$gte);
        }
        if (filters.timestamp.$lte) {
          query = query.lte('timestamp', filters.timestamp.$lte);
        }
      }

      // Apply sorting
      if (options.sort) {
        const sortField = options.sort.replace(/^-/, '');
        const order = options.sort.startsWith('-') ? 'desc' : 'asc';
        query = query.order(sortField, { ascending: order === 'asc' });
      } else {
        query = query.order('timestamp', { ascending: false });
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

    return result.data.map(log => this.transformFromDb(log));
  }

  // Find one log
  async findOne(filters) {
    const logs = await this.find(filters, { limit: 1 });
    return logs[0] || null;
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

  // Delete log
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

  // Delete many logs
  async deleteMany(filter) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .delete();

      // Apply filters
      if (filter.integrationId) {
        query = query.eq('integration_id', filter.integrationId);
      }
      if (filter.timestamp) {
        if (filter.timestamp.$lt) {
          query = query.lt('timestamp', filter.timestamp.$lt);
        }
        if (filter.timestamp.$lte) {
          query = query.lte('timestamp', filter.timestamp.$lte);
        }
      }

      const { data, error } = await query.select();
      if (error) throw error;
      return data;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return { deletedCount: result.data.length };
  }

  // Count documents
  async countDocuments(filter = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('id', { count: 'exact', head: true });

      // Apply filters
      if (filter.integrationId) {
        query = query.eq('integration_id', filter.integrationId);
      }
      if (filter.error) {
        if (filter.error === true) {
          query = query.not('error', 'is', null);
        } else {
          query = query.is('error', null);
        }
      }
      if (filter.timestamp) {
        if (filter.timestamp.$gte) {
          query = query.gte('timestamp', filter.timestamp.$gte);
        }
        if (filter.timestamp.$lte) {
          query = query.lte('timestamp', filter.timestamp.$lte);
        }
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
    // Simple aggregation implementation for common use cases
    const result = await this.manager.executeQuery(async (client) => {
      // Example: Average response time by integration
      if (pipeline[0]?.$match && pipeline[1]?.$group?._id === '$integrationId') {
        const { data, error } = await client
          .rpc('get_api_log_stats', { 
            integration_id_param: pipeline[0].$match.integrationId 
          });
        
        if (error) throw error;
        return data;
      }

      // Fallback to basic query
      const { data, error } = await client
        .from(this.tableName)
        .select('*');
      
      if (error) throw error;
      return data;
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
        const instance = new ApiLogModel();
        const { _id, id, ...updateData } = this;
        // API logs are typically immutable, but providing save for compatibility
        const updated = await instance.create(updateData);
        Object.assign(this, updated);
        return this;
      }
    };
  }

  // Helper methods
  transformFromDb(dbLog) {
    if (!dbLog) return null;

    const transformed = {
      _id: dbLog.id,
      id: dbLog.id,
      integrationId: dbLog.integration_id,
      endpoint: dbLog.endpoint,
      method: dbLog.method,
      requestHeaders: dbLog.request_headers,
      requestBody: dbLog.request_body,
      responseStatus: dbLog.response_status,
      responseHeaders: dbLog.response_headers,
      responseBody: dbLog.response_body,
      responseTime: dbLog.response_time,
      error: dbLog.error,
      timestamp: dbLog.timestamp
    };

    // Add instance methods
    Object.assign(transformed, this.createInstanceMethods());

    return transformed;
  }

  transformToDb(log) {
    const transformed = {};

    if (log.integrationId !== undefined) transformed.integration_id = log.integrationId;
    if (log.endpoint !== undefined) transformed.endpoint = log.endpoint;
    if (log.method !== undefined) transformed.method = log.method;
    if (log.requestHeaders !== undefined) transformed.request_headers = log.requestHeaders;
    if (log.requestBody !== undefined) transformed.request_body = log.requestBody;
    if (log.responseStatus !== undefined) transformed.response_status = log.responseStatus;
    if (log.responseHeaders !== undefined) transformed.response_headers = log.responseHeaders;
    if (log.responseBody !== undefined) transformed.response_body = log.responseBody;
    if (log.responseTime !== undefined) transformed.response_time = log.responseTime;
    if (log.error !== undefined) transformed.error = log.error;
    if (log.timestamp !== undefined) transformed.timestamp = log.timestamp;

    return transformed;
  }
}

// Export as singleton to mimic Mongoose model
module.exports = new ApiLogModel();