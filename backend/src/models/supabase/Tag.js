const { getSupabaseManager } = require('../../config/supabase');

class TagModel {
  constructor() {
    this.manager = getSupabaseManager();
    this.tableName = 'tags';
  }

  // Create a new tag
  async create(tagData) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .insert({
          ...this.transformToDb(tagData),
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

  // Find tags with filters
  async find(filters = {}, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('*');

      // Apply filters
      if (filters.name) {
        query = query.eq('name', filters.name.toLowerCase());
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters['metadata.isActive']) {
        query = query.eq('metadata->>isActive', filters['metadata.isActive']);
      }
      if (filters['settings.autoApply']) {
        query = query.eq('settings->>autoApply', filters['settings.autoApply']);
      }

      // Apply sorting
      if (options.sort) {
        const sortField = options.sort.replace(/^-/, '');
        const order = options.sort.startsWith('-') ? 'desc' : 'asc';
        
        // Handle nested fields
        if (sortField === 'metadata.usageCount') {
          query = query.order('metadata->usageCount', { ascending: order === 'asc' });
        } else {
          query = query.order(sortField, { ascending: order === 'asc' });
        }
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

    return result.data.map(tag => this.transformFromDb(tag));
  }

  // Find one tag
  async findOne(filters) {
    const tags = await this.find(filters, { limit: 1 });
    return tags[0] || null;
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

  // Update tag
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

  // Delete tag
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

  // Count documents
  async countDocuments(filter = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('id', { count: 'exact', head: true });

      // Apply filters
      if (filter.category) {
        query = query.eq('category', filter.category);
      }
      if (filter['metadata.isActive']) {
        query = query.eq('metadata->>isActive', filter['metadata.isActive']);
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

  // Static methods
  static async findByCategory(category) {
    const instance = new TagModel();
    return instance.find(
      { category, 'metadata.isActive': true },
      { sort: '-metadata.usageCount' }
    );
  }

  static async findMostUsed(limit = 10) {
    const instance = new TagModel();
    return instance.find(
      { 'metadata.isActive': true },
      { sort: '-metadata.usageCount', limit }
    );
  }

  static async incrementUsage(tagId) {
    const instance = new TagModel();
    const tag = await instance.findById(tagId);
    if (!tag) return null;

    return instance.findByIdAndUpdate(tagId, {
      metadata: {
        ...tag.metadata,
        usageCount: (tag.metadata?.usageCount || 0) + 1,
        lastUsed: new Date()
      }
    });
  }

  // Instance methods (added to transformed objects)
  createInstanceMethods() {
    return {
      canBeDeleted: function() {
        return !this.metadata?.isSystem && this.stats?.automationRules === 0;
      },

      updateStats: async function(field, increment = 1) {
        const instance = new TagModel();
        const currentValue = this.stats?.[field] || 0;
        const updated = await instance.findByIdAndUpdate(this._id, {
          stats: {
            ...this.stats,
            [field]: currentValue + increment
          }
        });
        Object.assign(this, updated);
        return this;
      },

      save: async function() {
        const instance = new TagModel();
        const { _id, id, ...updateData } = this;
        const updated = await instance.findByIdAndUpdate(_id || id, updateData);
        Object.assign(this, updated);
        return this;
      }
    };
  }

  // Helper methods
  transformFromDb(dbTag) {
    if (!dbTag) return null;

    const transformed = {
      _id: dbTag.id,
      id: dbTag.id,
      name: dbTag.name,
      displayName: dbTag.display_name,
      category: dbTag.category,
      description: dbTag.description,
      color: dbTag.color,
      icon: dbTag.icon,
      metadata: dbTag.metadata,
      settings: dbTag.settings,
      stats: dbTag.stats,
      createdAt: dbTag.created_at,
      updatedAt: dbTag.updated_at
    };

    // Add instance methods
    Object.assign(transformed, this.createInstanceMethods());

    return transformed;
  }

  transformToDb(tag) {
    const transformed = {};

    if (tag.name !== undefined) transformed.name = tag.name.toLowerCase();
    if (tag.displayName !== undefined) transformed.display_name = tag.displayName;
    if (tag.category !== undefined) transformed.category = tag.category;
    if (tag.description !== undefined) transformed.description = tag.description;
    if (tag.color !== undefined) transformed.color = tag.color;
    if (tag.icon !== undefined) transformed.icon = tag.icon;
    if (tag.metadata !== undefined) transformed.metadata = tag.metadata;
    if (tag.settings !== undefined) transformed.settings = tag.settings;
    if (tag.stats !== undefined) transformed.stats = tag.stats;

    return transformed;
  }
}

// Export as singleton to mimic Mongoose model
module.exports = new TagModel();