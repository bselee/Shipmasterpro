const { getSupabaseManager } = require('../../config/supabase');

class AutomationRuleModel {
  constructor() {
    this.manager = getSupabaseManager();
    this.tableName = 'automation_rules';
  }

  // Create a new automation rule
  async create(ruleData) {
    const result = await this.manager.executeQuery(async (client) => {
      const { data, error } = await client
        .from(this.tableName)
        .insert({
          ...this.transformToDb(ruleData),
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

  // Find rules with filters
  async find(filters = {}, options = {}) {
    const result = await this.manager.executeQuery(async (client) => {
      let query = client
        .from(this.tableName)
        .select('*');

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.enabled !== undefined) {
        query = query.eq('enabled', filters.enabled);
      }
      if (filters['trigger.event']) {
        query = query.eq('trigger->>event', filters['trigger.event']);
      }

      // Handle $or conditions for tag filtering
      if (filters.$or) {
        // This is complex in Supabase, might need to use RPC function
        // For now, we'll fetch all and filter in memory
      }

      // Apply sorting
      if (options.sort) {
        const sortFields = Object.entries(options.sort);
        for (const [field, order] of sortFields) {
          if (field === 'priority') {
            query = query.order('priority', { ascending: order === 1 });
          } else {
            query = query.order(field, { ascending: order === 1 });
          }
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

    // Apply in-memory filtering for complex $or conditions
    let rules = result.data.map(rule => this.transformFromDb(rule));
    
    if (filters.$or) {
      rules = rules.filter(rule => {
        return filters.$or.some(condition => {
          // Check each condition in the $or array
          for (const [key, value] of Object.entries(condition)) {
            const keys = key.split('.');
            let fieldValue = rule;
            
            // Navigate nested fields
            for (const k of keys) {
              fieldValue = fieldValue?.[k];
            }
            
            // Check if value is in array
            if (Array.isArray(fieldValue)) {
              if (!fieldValue.includes(value)) return false;
            } else if (fieldValue !== value) {
              return false;
            }
          }
          return true;
        });
      });
    }

    return rules;
  }

  // Find one rule
  async findOne(filters) {
    const rules = await this.find(filters, { limit: 1 });
    return rules[0] || null;
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

  // Update rule
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

  // Delete rule
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
      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter.enabled !== undefined) {
        query = query.eq('enabled', filter.enabled);
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
  static async findActiveRules(userId, event) {
    const instance = new AutomationRuleModel();
    return instance.find(
      {
        userId,
        enabled: true,
        'trigger.event': event
      },
      {
        sort: { priority: -1 }
      }
    );
  }

  static async findByTag(userId, tagId) {
    const instance = new AutomationRuleModel();
    return instance.find({
      userId,
      $or: [
        { 'actions.tagging.addTags': tagId },
        { 'actions.tagging.removeTags': tagId },
        { 'trigger.conditions.tags.hasAll': tagId },
        { 'trigger.conditions.tags.hasAny': tagId },
        { 'trigger.conditions.tags.hasNone': tagId }
      ]
    });
  }

  // Instance methods (added to transformed objects)
  createInstanceMethods() {
    return {
      canExecute: function(order) {
        // Check if rule is enabled
        if (!this.enabled) return false;
        
        // Check execution limits
        if (this.limits?.maxExecutions && this.stats?.totalExecutions >= this.limits.maxExecutions) {
          return false;
        }
        
        // Check daily limit
        if (this.limits?.maxPerDay) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const todayExecutions = (this.history || []).filter(h => 
            new Date(h.executedAt) >= today && h.success
          ).length;
          
          if (todayExecutions >= this.limits.maxPerDay) return false;
        }
        
        // Check cooldown
        if (this.limits?.cooldownMinutes && this.stats?.lastExecuted) {
          const cooldownEnd = new Date(new Date(this.stats.lastExecuted).getTime() + this.limits.cooldownMinutes * 60000);
          if (new Date() < cooldownEnd) return false;
        }
        
        // Check per-order limit
        if (this.limits?.maxPerOrder) {
          const orderExecutions = (this.history || []).filter(h => 
            h.orderId === order._id && h.success
          ).length;
          
          if (orderExecutions >= this.limits.maxPerOrder) return false;
        }
        
        return true;
      },

      evaluateConditions: async function(order) {
        const conditions = this.trigger?.conditions;
        if (!conditions) return true;
        
        // Order value conditions
        if (conditions.orderValue) {
          if (conditions.orderValue.min && order.totals?.total < conditions.orderValue.min) return false;
          if (conditions.orderValue.max && order.totals?.total > conditions.orderValue.max) return false;
        }
        
        // Weight conditions
        if (conditions.weight) {
          const totalWeight = order.totalWeight || 0;
          if (conditions.weight.min && totalWeight < conditions.weight.min) return false;
          if (conditions.weight.max && totalWeight > conditions.weight.max) return false;
        }
        
        // Item count conditions
        if (conditions.itemCount) {
          const itemCount = order.itemCount || 0;
          if (conditions.itemCount.min && itemCount < conditions.itemCount.min) return false;
          if (conditions.itemCount.max && itemCount > conditions.itemCount.max) return false;
        }
        
        // Destination conditions
        if (conditions.destination) {
          const dest = conditions.destination;
          const addr = order.shippingAddress;
          
          if (dest.countries?.length && !dest.countries.includes(addr?.country)) return false;
          if (dest.states?.length && !dest.states.includes(addr?.state)) return false;
          if (dest.zips?.length && !dest.zips.includes(addr?.zip)) return false;
          if (dest.residential !== undefined && addr?.residential !== dest.residential) return false;
        }
        
        // Tag conditions
        if (conditions.tags) {
          const orderTags = (order.tags || []).map(t => t.toString());
          
          // Must have all specified tags
          if (conditions.tags.hasAll?.length) {
            const hasAll = conditions.tags.hasAll.every(tagId => 
              orderTags.includes(tagId.toString())
            );
            if (!hasAll) return false;
          }
          
          // Must have at least one specified tag
          if (conditions.tags.hasAny?.length) {
            const hasAny = conditions.tags.hasAny.some(tagId => 
              orderTags.includes(tagId.toString())
            );
            if (!hasAny) return false;
          }
          
          // Must not have any specified tags
          if (conditions.tags.hasNone?.length) {
            const hasNone = conditions.tags.hasNone.some(tagId => 
              orderTags.includes(tagId.toString())
            );
            if (hasNone) return false;
          }
        }
        
        // Time conditions
        if (conditions.timeRange) {
          const now = new Date();
          const timeRange = conditions.timeRange;
          
          if (timeRange.days?.length) {
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentDay = dayNames[now.getDay()];
            if (!timeRange.days.includes(currentDay)) return false;
          }
          
          if (timeRange.hours) {
            const currentHour = now.getHours();
            const startHour = parseInt(timeRange.hours.start.split(':')[0]);
            const endHour = parseInt(timeRange.hours.end.split(':')[0]);
            if (currentHour < startHour || currentHour >= endHour) return false;
          }
        }
        
        // All conditions passed
        return true;
      },

      recordExecution: async function(orderId, success, duration, error, actionsPerformed) {
        const instance = new AutomationRuleModel();
        
        // Update stats
        const newStats = {
          ...this.stats,
          totalExecutions: (this.stats?.totalExecutions || 0) + 1,
          successfulExecutions: success ? (this.stats?.successfulExecutions || 0) + 1 : (this.stats?.successfulExecutions || 0),
          failedExecutions: !success ? (this.stats?.failedExecutions || 0) + 1 : (this.stats?.failedExecutions || 0),
          lastExecuted: new Date(),
          ordersAffected: success ? (this.stats?.ordersAffected || 0) + 1 : (this.stats?.ordersAffected || 0)
        };
        
        if (success) {
          newStats.lastSuccess = new Date();
        } else {
          newStats.lastError = error;
        }
        
        // Update average execution time
        if (duration) {
          const prevAvg = this.stats?.avgExecutionTime || 0;
          const prevCount = (this.stats?.totalExecutions || 1) - 1;
          newStats.avgExecutionTime = (prevAvg * prevCount + duration) / newStats.totalExecutions;
        }
        
        // Add to history (keep last 100 entries)
        const newHistory = [...(this.history || []), {
          orderId,
          executedAt: new Date(),
          success,
          duration,
          error,
          actionsPerformed
        }].slice(-100);
        
        const updated = await instance.findByIdAndUpdate(this._id, {
          stats: newStats,
          history: newHistory
        });
        
        Object.assign(this, updated);
        return this;
      },

      save: async function() {
        const instance = new AutomationRuleModel();
        const { _id, id, ...updateData } = this;
        const updated = await instance.findByIdAndUpdate(_id || id, updateData);
        Object.assign(this, updated);
        return this;
      }
    };
  }

  // Helper methods
  transformFromDb(dbRule) {
    if (!dbRule) return null;

    const transformed = {
      _id: dbRule.id,
      id: dbRule.id,
      userId: dbRule.user_id,
      name: dbRule.name,
      description: dbRule.description,
      enabled: dbRule.enabled,
      priority: dbRule.priority,
      trigger: dbRule.trigger,
      actions: dbRule.actions,
      schedule: dbRule.schedule,
      limits: dbRule.limits,
      stats: dbRule.stats,
      history: dbRule.history,
      metadata: dbRule.metadata,
      createdAt: dbRule.created_at,
      updatedAt: dbRule.updated_at
    };

    // Add virtual property
    Object.defineProperty(transformed, 'successRate', {
      get: function() {
        if (!this.stats?.totalExecutions || this.stats.totalExecutions === 0) return 0;
        return (this.stats.successfulExecutions / this.stats.totalExecutions * 100).toFixed(2);
      }
    });

    // Add instance methods
    Object.assign(transformed, this.createInstanceMethods());

    return transformed;
  }

  transformToDb(rule) {
    const transformed = {};

    if (rule.userId !== undefined) transformed.user_id = rule.userId;
    if (rule.name !== undefined) transformed.name = rule.name;
    if (rule.description !== undefined) transformed.description = rule.description;
    if (rule.enabled !== undefined) transformed.enabled = rule.enabled;
    if (rule.priority !== undefined) transformed.priority = rule.priority;
    if (rule.trigger !== undefined) transformed.trigger = rule.trigger;
    if (rule.actions !== undefined) transformed.actions = rule.actions;
    if (rule.schedule !== undefined) transformed.schedule = rule.schedule;
    if (rule.limits !== undefined) transformed.limits = rule.limits;
    if (rule.stats !== undefined) transformed.stats = rule.stats;
    if (rule.history !== undefined) transformed.history = rule.history;
    if (rule.metadata !== undefined) transformed.metadata = rule.metadata;

    return transformed;
  }
}

// Export as singleton to mimic Mongoose model
module.exports = new AutomationRuleModel();