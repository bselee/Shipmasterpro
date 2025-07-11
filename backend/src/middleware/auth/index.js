const jwt = require('jsonwebtoken');
const { User } = require('../../models');

// Verify JWT token
const requireAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      throw new Error();
    }
    
    // Check if subscription is active
    if (user.subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'Subscription inactive',
        subscriptionStatus: user.subscription.status 
      });
    }
    
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Check specific permission
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.user.hasPermission(resource, action)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: `${resource}:${action}`
      });
    }
    
    next();
  };
};

// Check if user has specific role
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient role',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// Check plan features
const requirePlanFeature = (feature) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.user.canAccessPlan(feature)) {
      return res.status(403).json({ 
        error: 'Feature not available in current plan',
        required: feature,
        currentPlan: req.user.subscription.plan
      });
    }
    
    next();
  };
};

// API key authentication
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return next(); // Continue to JWT auth
    }
    
    // Hash the provided key
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Find user with this API key
    const user = await User.findOne({
      'apiKeys.key': hashedKey,
      'subscription.status': 'active'
    }).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Find the specific API key
    const keyEntry = user.apiKeys.find(k => k.key === hashedKey);
    
    // Update last used
    keyEntry.lastUsed = new Date();
    await user.save();
    
    req.user = user;
    req.apiKey = keyEntry;
    next();
  } catch (error) {
    res.status(401).json({ error: 'API key authentication failed' });
  }
};

// Combined auth (API key or JWT)
const authenticate = async (req, res, next) => {
  // Try API key first
  await authenticateApiKey(req, res, () => {
    // If no API key or API key failed, try JWT
    if (!req.user) {
      requireAuth(req, res, next);
    } else {
      next();
    }
  });
};

// Rate limiting by user
const userRateLimit = (limit = 100, window = 900000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const userId = req.user.id;
    const now = Date.now();
    const userRequests = requests.get(userId) || [];
    
    // Clean old requests
    const validRequests = userRequests.filter(time => now - time < window);
    
    if (validRequests.length >= limit) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((validRequests[0] + window - now) / 1000)
      });
    }
    
    validRequests.push(now);
    requests.set(userId, validRequests);
    
    next();
  };
};

module.exports = {
  requireAuth,
  requirePermission,
  requireRole,
  requirePlanFeature,
  authenticateApiKey,
  authenticate,
  userRateLimit
};