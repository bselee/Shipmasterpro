const Joi = require('joi');

// Generic validation middleware
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({ 
        error: 'Validation failed',
        errors 
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  // User schemas
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    company: Joi.string().required(),
    profile: Joi.object({
      firstName: Joi.string(),
      lastName: Joi.string(),
      phone: Joi.string()
    })
  }),
  
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  // Order schemas
  createOrder: Joi.object({
    orderNumber: Joi.string(),
    externalOrderId: Joi.string(),
    source: Joi.string().valid('shopify', 'woocommerce', 'amazon', 'ebay', 'manual', 'api', 'csv').required(),
    customer: Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string()
    }).required(),
    shippingAddress: Joi.object({
      name: Joi.string(),
      company: Joi.string(),
      address1: Joi.string().required(),
      address2: Joi.string(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zip: Joi.string().required(),
      country: Joi.string().default('US')
    }).required(),
    items: Joi.array().items(Joi.object({
      sku: Joi.string().required(),
      name: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      price: Joi.number().min(0).required(),
      weight: Joi.number().min(0)
    })).min(1).required(),
    totals: Joi.object({
      subtotal: Joi.number().required(),
      tax: Joi.number().default(0),
      shipping: Joi.number().default(0),
      discount: Joi.number().default(0),
      total: Joi.number().required()
    }).required()
  }),
  
  // Tag schemas
  createTag: Joi.object({
    name: Joi.string().lowercase().trim().required(),
    displayName: Joi.string().required(),
    category: Joi.string().valid('priority', 'shipping', 'order', 'customer', 'product', 'custom').required(),
    description: Joi.string(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
    icon: Joi.string(),
    settings: Joi.object({
      autoApply: Joi.boolean(),
      autoApplyConditions: Joi.object(),
      exclusive: Joi.boolean(),
      priority: Joi.number()
    })
  }),
  
  applyTags: Joi.object({
    entityType: Joi.string().valid('order', 'product', 'customer').required(),
    entityId: Joi.string().required(),
    tagIds: Joi.array().items(Joi.string()).min(1).required()
  }),
  
  // Integration schemas
  createIntegration: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('shopify', 'quickbooks', 'bill.com', 'aftership', 'custom').required(),
    config: Joi.object().required(),
    syncSettings: Joi.object({
      enabled: Joi.boolean(),
      frequency: Joi.number().min(5).max(1440), // 5 minutes to 24 hours
      autoSync: Joi.boolean(),
      syncDirection: Joi.string().valid('import', 'export', 'bidirectional')
    })
  }),
  
  // Automation rule schemas
  createAutomationRule: Joi.object({
    name: Joi.string().required(),
    description: Joi.string(),
    enabled: Joi.boolean().default(true),
    priority: Joi.number().default(0),
    trigger: Joi.object({
      event: Joi.string().valid(
        'order_imported', 
        'order_updated', 
        'order_tagged',
        'inventory_low',
        'shipping_created',
        'tracking_updated'
      ).required(),
      conditions: Joi.object()
    }).required(),
    actions: Joi.object().required()
  }),
  
  // Shipping schemas
  calculateRates: Joi.object({
    origin: Joi.object({
      address1: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zip: Joi.string().required(),
      country: Joi.string().default('US')
    }).required(),
    destination: Joi.object({
      address1: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zip: Joi.string().required(),
      country: Joi.string().default('US'),
      residential: Joi.boolean()
    }).required(),
    packages: Joi.array().items(Joi.object({
      weight: Joi.number().min(1).required(),
      dimensions: Joi.object({
        length: Joi.number().min(1).required(),
        width: Joi.number().min(1).required(),
        height: Joi.number().min(1).required()
      }),
      value: Joi.number().min(0)
    })).min(1).required()
  }),
  
  createLabel: Joi.object({
    orderId: Joi.string().required(),
    rateSelection: Joi.object({
      carrier: Joi.string().required(),
      service: Joi.string().required(),
      cost: Joi.number().required()
    }).required(),
    options: Joi.object({
      insurance: Joi.boolean(),
      signatureRequired: Joi.boolean(),
      saturdayDelivery: Joi.boolean()
    })
  })
};

// Object ID validation
const isValidObjectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Custom validators
Joi.objectId = () => Joi.string().custom(isValidObjectId);

// Pagination validation
const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(50),
  sort: Joi.string(),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

// Date range validation
const dateRangeSchema = Joi.object({
  startDate: Joi.date(),
  endDate: Joi.date().min(Joi.ref('startDate'))
});

// Export validation functions
module.exports = {
  validateRequest,
  schemas,
  paginationSchema,
  dateRangeSchema,
  isValidObjectId
};