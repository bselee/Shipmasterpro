const { getSupabaseManager } = require('../../config/supabase');

class TagCollectionModel {
  constructor() {
    this.manager = getSupabaseManager();
    this.tableName = 'tag_collections';
  }

  // Create a new tag collection
  async create(collectionData) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .insert({
          ...this.transformToDb(collectionData),
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

  // Find collections with filters
  async find(filters = {}, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select(`
          *,
          tag_collection_tags!inner(
            tag:tags(*)
          )
        `);

      // Apply filters
      if (filters.name) {
        query = query.eq('name', filters.name);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters['metadata.isActive']) {
        query = query.eq('metadata->>isActive', filters['metadata.isActive']);
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

    return result.data.map(collection => this.transformFromDb(collection));
  }

  // Find one collection
  async findOne(filters) {
    const collections = await this.find(filters, { limit: 1 });
    return collections[0] || null;
  }

  // Find by ID
  async findById(id) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .select(`
          *,
          tag_collection_tags(
            tag:tags(*)
          )
        `)
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

  // Update collection
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

      // Handle tags update if provided
      if (updates.tags) {
        // Delete existing tag relationships
        await client
          .from('tag_collection_tags')
          .delete()
          .eq('collection_id', id);

        // Insert new tag relationships
        if (updates.tags.length > 0) {
          const tagRelations = updates.tags.map(tagId => ({
            collection_id: id,
            tag_id: tagId
          }));

          await client
            .from('tag_collection_tags')
            .insert(tagRelations);
        }
      }

      // Fetch updated data with tags
      const { data: updatedData } = await client
        .from(this.tableName)
        .select(`
          *,
          tag_collection_tags(
            tag:tags(*)
          )
        `)
        .eq('id', id)
        .single();

      return updatedData;
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return this.transformFromDb(result.data);
  }

  // Delete collection
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
      if (filter.type) {
        query = query.eq('type', filter.type);
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
  static async findExclusive() {
    const instance = new TagCollectionModel();
    return instance.find({ type: 'exclusive', 'metadata.isActive': true });
  }

  static async validateTags(collectionId, tagIds) {
    const instance = new TagCollectionModel();
    const collection = await instance.findById(collectionId);
    if (!collection) return { valid: false, error: 'Collection not found' };

    // Check if all tags belong to the collection
    const validTags = collection.tags.map(t => t._id || t.id || t);
    const invalidTags = tagIds.filter(id => !validTags.includes(id));
    
    if (invalidTags.length > 0) {
      return { valid: false, error: 'Invalid tags for collection', invalidTags };
    }

    // Check collection rules
    if (collection.rules?.maxTags && tagIds.length > collection.rules.maxTags) {
      return { valid: false, error: `Maximum ${collection.rules.maxTags} tags allowed` };
    }

    if (collection.rules?.minTags && tagIds.length < collection.rules.minTags) {
      return { valid: false, error: `Minimum ${collection.rules.minTags} tags required` };
    }

    // For exclusive collections, only one tag is allowed
    if (collection.type === 'exclusive' && tagIds.length > 1) {
      return { valid: false, error: 'Only one tag allowed from exclusive collection' };
    }

    return { valid: true };
  }

  // Instance methods (added to transformed objects)
  createInstanceMethods() {
    return {
      addTag: async function(tagId) {
        const instance = new TagCollectionModel();
        const currentTags = this.tags.map(t => t._id || t.id || t);
        
        if (!currentTags.includes(tagId)) {
          const updatedTags = [...currentTags, tagId];
          const updated = await instance.findByIdAndUpdate(this._id, { tags: updatedTags });
          Object.assign(this, updated);
        }
        return this;
      },

      removeTag: async function(tagId) {
        const instance = new TagCollectionModel();
        const updatedTags = this.tags
          .map(t => t._id || t.id || t)
          .filter(id => id !== tagId);
        
        const updated = await instance.findByIdAndUpdate(this._id, { tags: updatedTags });
        Object.assign(this, updated);
        return this;
      },

      incrementUsage: async function() {
        const instance = new TagCollectionModel();
        const updated = await instance.findByIdAndUpdate(this._id, {
          stats: {
            ...this.stats,
            usageCount: (this.stats?.usageCount || 0) + 1,
            lastUsed: new Date()
          }
        });
        Object.assign(this, updated);
        return this;
      },

      save: async function() {
        const instance = new TagCollectionModel();
        const { _id, id, ...updateData } = this;
        const updated = await instance.findByIdAndUpdate(_id || id, updateData);
        Object.assign(this, updated);
        return this;
      }
    };
  }

  // Helper methods
  transformFromDb(dbCollection) {
    if (!dbCollection) return null;

    const transformed = {
      _id: dbCollection.id,
      id: dbCollection.id,
      name: dbCollection.name,
      description: dbCollection.description,
      tags: dbCollection.tag_collection_tags?.map(tct => tct.tag) || [],
      type: dbCollection.type,
      metadata: dbCollection.metadata,
      rules: dbCollection.rules,
      stats: dbCollection.stats,
      createdAt: dbCollection.created_at,
      updatedAt: dbCollection.updated_at
    };

    // Add instance methods
    Object.assign(transformed, this.createInstanceMethods());

    return transformed;
  }

  transformToDb(collection) {
    const transformed = {};

    if (collection.name !== undefined) transformed.name = collection.name;
    if (collection.description !== undefined) transformed.description = collection.description;
    if (collection.type !== undefined) transformed.type = collection.type;
    if (collection.metadata !== undefined) transformed.metadata = collection.metadata;
    if (collection.rules !== undefined) transformed.rules = collection.rules;
    if (collection.stats !== undefined) transformed.stats = collection.stats;

    // Note: tags are handled separately in update operations

    return transformed;
  }
}

// Export as singleton to mimic Mongoose model
module.exports = new TagCollectionModel();