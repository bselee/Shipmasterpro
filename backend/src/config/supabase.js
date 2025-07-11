const { createClient } = require('@supabase/supabase-js');

// Circuit Breaker implementation
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - Service temporarily unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      console.log(`Retry attempt ${i + 1} after ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Error classification
function classifyError(error) {
  const errorString = error.message || error.toString();
  
  const patterns = {
    'AUTH_EXPIRED': /401|unauthorized|token.*expired|JWT.*expired/i,
    'RATE_LIMITED': /429|rate.?limit|too.?many.?requests/i,
    'TEMPORARY_NETWORK': /timeout|ECONNRESET|network|ETIMEDOUT|ENOTFOUND/i,
    'SERVICE_DOWN': /503|service.?unavailable|502|504/i,
    'DATA_VALIDATION': /400|bad.?request|validation|invalid/i,
    'NOT_FOUND': /404|not.?found/i,
    'PERMISSION_DENIED': /403|forbidden|permission.*denied/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(errorString) || pattern.test(error.code)) {
      return type;
    }
  }
  
  return 'UNKNOWN_ERROR';
}

// Auto-fix strategies
const autoFixStrategies = {
  'AUTH_EXPIRED': async (supabaseClient) => {
    try {
      const { data, error } = await supabaseClient.auth.refreshSession();
      if (error) throw error;
      return { fixed: true, action: 'TOKEN_REFRESHED' };
    } catch (err) {
      return { fixed: false, action: 'REFRESH_FAILED' };
    }
  },
  
  'RATE_LIMITED': async (error) => {
    // Extract retry-after header if available
    const retryAfter = error.headers?.['retry-after'] || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return { fixed: true, action: 'RATE_LIMIT_WAITED' };
  },
  
  'TEMPORARY_NETWORK': async () => {
    // Just rely on retry mechanism
    return { fixed: false, action: 'RETRY_REQUIRED' };
  }
};

// Robust Supabase Manager
class RobustSupabaseManager {
  constructor(config = {}) {
    this.url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.url || !this.anonKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }

    // Configuration with defaults
    this.config = {
      maxRetries: config.maxRetries || parseInt(process.env.SUPABASE_MAX_RETRIES) || 3,
      baseDelay: config.baseDelay || parseInt(process.env.SUPABASE_BASE_DELAY) || 1000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || parseInt(process.env.SUPABASE_CIRCUIT_BREAKER_THRESHOLD) || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || parseInt(process.env.SUPABASE_CIRCUIT_BREAKER_TIMEOUT) || 60000,
      healthCheckInterval: config.healthCheckInterval || 300000, // 5 minutes
      ...config
    };

    // Initialize clients
    this.anonClient = createClient(this.url, this.anonKey);
    this.serviceClient = this.serviceRoleKey 
      ? createClient(this.url, this.serviceRoleKey)
      : null;

    // Circuit breakers for different operations
    this.circuitBreakers = {
      query: new CircuitBreaker(this.config.circuitBreakerThreshold, this.config.circuitBreakerTimeout),
      auth: new CircuitBreaker(this.config.circuitBreakerThreshold, this.config.circuitBreakerTimeout),
      storage: new CircuitBreaker(this.config.circuitBreakerThreshold, this.config.circuitBreakerTimeout),
      realtime: new CircuitBreaker(this.config.circuitBreakerThreshold, this.config.circuitBreakerTimeout)
    };

    // Connection metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      autoFixedRequests: 0,
      lastHealthCheck: null,
      health: 'unknown'
    };

    // Start health monitoring
    this.startHealthMonitoring();
  }

  async executeQuery(operation, options = {}) {
    return this.executeWithResilience('query', operation, options);
  }

  async executeAuth(operation, options = {}) {
    return this.executeWithResilience('auth', operation, options);
  }

  async executeStorage(operation, options = {}) {
    return this.executeWithResilience('storage', operation, options);
  }

  async executeRealtime(operation, options = {}) {
    return this.executeWithResilience('realtime', operation, options);
  }

  async executeWithResilience(type, operation, options = {}) {
    this.metrics.totalRequests++;
    const startTime = Date.now();
    const client = options.useServiceRole ? this.serviceClient : this.anonClient;
    
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Execute with circuit breaker
      const result = await this.circuitBreakers[type].execute(async () => {
        // Execute with retry logic
        return await retryWithBackoff(
          async () => {
            try {
              const operationResult = await operation(client);
              
              // Check for Supabase-specific errors
              if (operationResult?.error) {
                throw operationResult.error;
              }
              
              return operationResult;
            } catch (error) {
              // Attempt auto-fix for known issues
              const errorType = classifyError(error);
              console.log(`Error classified as: ${errorType}`);
              
              if (autoFixStrategies[errorType]) {
                const fixResult = await autoFixStrategies[errorType](client, error);
                if (fixResult.fixed) {
                  console.log(`Auto-fixed: ${fixResult.action}`);
                  this.metrics.autoFixedRequests++;
                  
                  // Retry the operation after fix
                  const retryResult = await operation(client);
                  if (retryResult?.error) {
                    throw retryResult.error;
                  }
                  
                  return {
                    ...retryResult,
                    metadata: { autoFixed: true, fixAction: fixResult.action }
                  };
                }
              }
              
              throw error;
            }
          },
          this.config.maxRetries,
          this.config.baseDelay
        );
      });

      this.metrics.successfulRequests++;
      
      return {
        success: true,
        data: result.data || result,
        metadata: {
          duration: Date.now() - startTime,
          autoFixed: result.metadata?.autoFixed || false,
          fixAction: result.metadata?.fixAction
        }
      };
    } catch (error) {
      this.metrics.failedRequests++;
      const errorType = classifyError(error);
      
      return {
        success: false,
        error: {
          message: error.message,
          type: errorType,
          details: error,
          userFriendlyMessage: this.getUserFriendlyError(errorType, error)
        },
        metadata: {
          duration: Date.now() - startTime
        }
      };
    }
  }

  getUserFriendlyError(errorType, error) {
    const messages = {
      'AUTH_EXPIRED': 'Your session has expired. Please sign in again.',
      'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
      'TEMPORARY_NETWORK': 'Connection issue. Please check your internet and try again.',
      'SERVICE_DOWN': 'Service is temporarily unavailable. Please try again later.',
      'DATA_VALIDATION': 'Invalid data provided. Please check your input.',
      'NOT_FOUND': 'The requested resource was not found.',
      'PERMISSION_DENIED': 'You don\'t have permission to perform this action.',
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
    };

    return messages[errorType] || messages.UNKNOWN_ERROR;
  }

  async performHealthCheck() {
    try {
      const result = await this.executeQuery(async (client) => {
        // Simple query to check connection
        const { data, error } = await client.from('_health_check').select('1').limit(1);
        
        // If table doesn't exist, that's okay - connection works
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          throw error;
        }
        
        return { data: true, error: null };
      });

      this.metrics.health = result.success ? 'healthy' : 'unhealthy';
      this.metrics.lastHealthCheck = new Date();
      
      return result.success;
    } catch (error) {
      this.metrics.health = 'unhealthy';
      this.metrics.lastHealthCheck = new Date();
      return false;
    }
  }

  startHealthMonitoring() {
    // Initial health check
    this.performHealthCheck();

    // Periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  getConnectionMetrics() {
    return {
      ...this.metrics,
      circuitBreakerStates: {
        query: this.circuitBreakers.query.getState(),
        auth: this.circuitBreakers.auth.getState(),
        storage: this.circuitBreakers.storage.getState(),
        realtime: this.circuitBreakers.realtime.getState()
      },
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      autoFixRate: this.metrics.totalRequests > 0
        ? (this.metrics.autoFixedRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  resetCircuitBreaker(type) {
    if (this.circuitBreakers[type]) {
      this.circuitBreakers[type] = new CircuitBreaker(
        this.config.circuitBreakerThreshold,
        this.config.circuitBreakerTimeout
      );
    }
  }

  // Convenience methods for common operations
  async signIn(email, password) {
    return this.executeAuth(async (client) => {
      return await client.auth.signInWithPassword({ email, password });
    });
  }

  async signUp(email, password, metadata = {}) {
    return this.executeAuth(async (client) => {
      return await client.auth.signUp({ 
        email, 
        password,
        options: { data: metadata }
      });
    });
  }

  async signOut() {
    return this.executeAuth(async (client) => {
      return await client.auth.signOut();
    });
  }

  async getUser() {
    return this.executeAuth(async (client) => {
      return await client.auth.getUser();
    });
  }
}

// Singleton instance
let managerInstance = null;

function getSupabaseManager(config) {
  if (!managerInstance) {
    managerInstance = new RobustSupabaseManager(config);
  }
  return managerInstance;
}

module.exports = {
  RobustSupabaseManager,
  getSupabaseManager,
  CircuitBreaker,
  retryWithBackoff,
  classifyError
};