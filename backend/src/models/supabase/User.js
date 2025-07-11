const { getSupabaseManager } = require('../../config/supabase');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class UserModel {
  constructor() {
    this.manager = getSupabaseManager();
    this.tableName = 'users';
  }

  // Create a new user
  async create(userData) {
    const result = await this.manager.executeQuery(async (client) => {
      // Hash password if provided
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }

      const { data, error } = await client
        .from(this.tableName)
        .insert({
          ...this.transformToDb(userData),
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

  // Find users with filters
  async find(filters = {}, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('*');

      // Apply filters
      if (filters.email) {
        query = query.eq('email', filters.email.toLowerCase());
      }
      if (filters.company) {
        query = query.eq('company', filters.company);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters['subscription.status']) {
        query = query.eq('subscription->>status', filters['subscription.status']);
      }
      if (filters['subscription.plan']) {
        query = query.eq('subscription->>plan', filters['subscription.plan']);
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

    return result.data.map(user => this.transformFromDb(user));
  }

  // Find one user
  async findOne(filters) {
    const users = await this.find(filters, { limit: 1 });
    return users[0] || null;
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

  // Update user
  async findByIdAndUpdate(id, updates, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      // Handle password update
      if (updates.password) {
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(updates.password, salt);
      }

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

  // Delete user
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

  // Update one
  async updateOne(filter, updates) {
    const user = await this.findOne(filter);
    if (!user) return { modifiedCount: 0 };

    await this.findByIdAndUpdate(user._id, updates);
    return { modifiedCount: 1 };
  }

  // Count documents
  async countDocuments(filter = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('id', { count: 'exact', head: true });

      // Apply filters
      if (filter.company) {
        query = query.eq('company', filter.company);
      }
      if (filter['subscription.status']) {
        query = query.eq('subscription->>status', filter['subscription.status']);
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
  static async findByEmail(email) {
    const instance = new UserModel();
    return instance.findOne({ email: email.toLowerCase() });
  }

  // Instance methods (added to transformed objects)
  createInstanceMethods(userData) {
    return {
      comparePassword: async function(candidatePassword) {
        return bcrypt.compare(candidatePassword, this.password);
      },

      isLocked: function() {
        return !!(this.security?.lockUntil && new Date(this.security.lockUntil) > new Date());
      },

      incLoginAttempts: async function() {
        const instance = new UserModel();
        const updates = { 
          security: {
            ...this.security,
            loginAttempts: (this.security?.loginAttempts || 0) + 1
          }
        };

        const maxAttempts = 5;
        const lockTime = 2 * 60 * 60 * 1000; // 2 hours

        if (updates.security.loginAttempts >= maxAttempts && !this.isLocked()) {
          updates.security.lockUntil = new Date(Date.now() + lockTime);
        }

        const updated = await instance.findByIdAndUpdate(this._id, updates);
        Object.assign(this, updated);
        return this;
      },

      resetLoginAttempts: async function() {
        const instance = new UserModel();
        const updates = {
          security: {
            ...this.security,
            loginAttempts: 0,
            lockUntil: null
          }
        };
        const updated = await instance.findByIdAndUpdate(this._id, updates);
        Object.assign(this, updated);
        return this;
      },

      hasPermission: function(resource, action) {
        if (this.role === 'admin') return true;
        return this.permissions?.[resource]?.[action] || false;
      },

      canAccessPlan: function(feature) {
        const planFeatures = {
          trial: ['basic'],
          starter: ['basic', 'automation'],
          professional: ['basic', 'automation', 'advanced', 'api'],
          enterprise: ['basic', 'automation', 'advanced', 'api', 'whitelabel', 'priority']
        };
        
        return planFeatures[this.subscription?.plan]?.includes(feature) || false;
      },

      generateApiKey: async function(name, permissions = []) {
        const instance = new UserModel();
        const key = crypto.randomBytes(32).toString('hex');
        const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
        
        const newApiKeys = [...(this.apiKeys || []), {
          key: hashedKey,
          name,
          permissions,
          createdAt: new Date()
        }];

        const updated = await instance.findByIdAndUpdate(this._id, { apiKeys: newApiKeys });
        Object.assign(this, updated);
        return key; // Return unhashed key to user once
      },

      save: async function() {
        const instance = new UserModel();
        const { _id, id, ...updateData } = this;
        const updated = await instance.findByIdAndUpdate(_id || id, updateData);
        Object.assign(this, updated);
        return this;
      }
    };
  }

  // Helper methods
  transformFromDb(dbUser) {
    if (!dbUser) return null;

    const transformed = {
      _id: dbUser.id,
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      company: dbUser.company,
      role: dbUser.role,
      profile: dbUser.profile,
      settings: dbUser.settings,
      subscription: dbUser.subscription,
      permissions: dbUser.permissions,
      security: dbUser.security,
      apiKeys: dbUser.api_keys,
      activity: dbUser.activity,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    };

    // Add virtual property
    Object.defineProperty(transformed, 'fullName', {
      get: function() {
        return `${this.profile?.firstName || ''} ${this.profile?.lastName || ''}`.trim() || this.email;
      }
    });

    // Add instance methods
    Object.assign(transformed, this.createInstanceMethods(transformed));

    return transformed;
  }

  transformToDb(user) {
    const transformed = {};

    if (user.email !== undefined) transformed.email = user.email.toLowerCase();
    if (user.password !== undefined) transformed.password = user.password;
    if (user.company !== undefined) transformed.company = user.company;
    if (user.role !== undefined) transformed.role = user.role;
    if (user.profile !== undefined) transformed.profile = user.profile;
    if (user.settings !== undefined) transformed.settings = user.settings;
    if (user.subscription !== undefined) transformed.subscription = user.subscription;
    if (user.permissions !== undefined) transformed.permissions = user.permissions;
    if (user.security !== undefined) transformed.security = user.security;
    if (user.apiKeys !== undefined) transformed.api_keys = user.apiKeys;
    if (user.activity !== undefined) transformed.activity = user.activity;

    return transformed;
  }
}

// Export as singleton to mimic Mongoose model
module.exports = new UserModel();