# Shipmasterpro
Shipping for ecommerce
# ShipMaster Pro - Complete Shipping Management Platform

A comprehensive, production-ready shipping software solution that rivals ShipStation with enhanced features for ecommerce businesses of all sizes.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MongoDB 4.4+
- Redis (optional, for caching)

### Installation

```bash
# Clone and install backend
git clone https://github.com/yourcompany/shipmaster-pro.git
cd shipmaster-pro/backend
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the backend
npm start

# Install and start frontend (in another terminal)
cd ../frontend
npm install
npm start
```

### Environment Configuration

```bash
# .env file
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/shipmaster
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-here

# Carrier API Keys
USPS_USER_ID=your-usps-user-id
UPS_ACCESS_KEY=your-ups-access-key
UPS_USERNAME=your-ups-username
UPS_PASSWORD=your-ups-password
FEDEX_KEY=your-fedex-key
FEDEX_PASSWORD=your-fedex-password
FEDEX_ACCOUNT=your-fedex-account
FEDEX_METER=your-fedex-meter
DHL_SITE_ID=your-dhl-site-id
DHL_PASSWORD=your-dhl-password

# Webhook Security
WEBHOOK_SECRET=your-webhook-secret-key

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password
```

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  company: String (required),
  role: String (enum: ['admin', 'manager', 'operator']),
  settings: {
    defaultCarrier: String,
    autoShipping: Boolean,
    notifications: Boolean,
    timezone: String
  },
  subscription: {
    plan: String (enum: ['starter', 'professional', 'enterprise']),
    status: String (enum: ['active', 'suspended', 'cancelled']),
    shipmentLimit: Number,
    currentUsage: Number,
    billingCycle: Date
  },
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

### Products Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  sku: String (unique, required),
  name: String (required),
  description: String,
  weight: Number (in oz, required),
  dimensions: {
    length: Number (inches),
    width: Number (inches),
    height: Number (inches)
  },
  category: String,
  cost: Number,
  price: Number,
  inventory: {
    quantity: Number,
    reserved: Number,
    available: Number,
    reorderPoint: Number,
    reorderQuantity: Number,
    lastRestocked: Date
  },
  images: [String], // URLs
  tags: [String],
  locations: [{
    warehouseId: ObjectId,
    bin: String,
    quantity: Number
  }],
  customs: {
    hsCode: String,
    countryOfOrigin: String,
    description: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Orders Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  orderNumber: String (unique, required),
  externalOrderId: String,
  source: String (required), // 'shopify', 'amazon', 'manual', etc.
  status: String (enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
  
  customer: {
    customerId: String,
    name: String (required),
    email: String (required),
    phone: String,
    tags: [String],
    orderCount: Number,
    totalSpent: Number
  },
  
  shippingAddress: {
    name: String,
    company: String,
    address1: String (required),
    address2: String,
    city: String (required),
    state: String (required),
    zip: String (required),
    country: String (required),
    residential: Boolean,
    validated: Boolean,
    validationMessage: String
  },
  
  billingAddress: {
    name: String,
    company: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  
  items: [{
    productId: ObjectId,
    sku: String (required),
    name: String (required),
    quantity: Number (required),
    price: Number,
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    customs: {
      hsCode: String,
      countryOfOrigin: String,
      value: Number
    }
  }],
  
  shipping: {
    carrierId: ObjectId,
    carrier: String,
    service: String,
    trackingNumber: String,
    labelUrl: String,
    manifestId: String,
    cost: Number,
    listRate: Number,
    discount: Number,
    zone: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    deliveryDays: Number,
    
    packaging: {
      type: String,
      weight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number
      }
    },
    
    options: {
      signatureRequired: Boolean,
      saturdayDelivery: Boolean,
      holdForPickup: Boolean,
      residentialSurcharge: Boolean
    },
    
    insurance: {
      enabled: Boolean,
      amount: Number,
      cost: Number,
      provider: String
    }
  },
  
  totals: {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: Number,
    total: Number
  },
  
  tags: [String],
  notes: String,
  internalNotes: String,
  
  automation: {
    rules: [ObjectId],
    processed: Boolean,
    processedAt: Date
  },
  
  fulfillment: {
    warehouseId: ObjectId,
    picklistId: String,
    packedBy: String,
    packedAt: Date,
    shippedBy: String,
    shippedAt: Date
  },
  
  tracking: {
    events: [{
      timestamp: Date,
      status: String,
      location: String,
      description: String
    }],
    lastUpdated: Date
  },
  
  timestamps: {
    ordered: Date,
    imported: Date,
    processed: Date,
    shipped: Date,
    delivered: Date
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### Carriers Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String (required),
  code: String (unique, required),
  type: String (enum: ['carrier', 'fulfillment']),
  
  apiConfig: {
    endpoint: String,
    testEndpoint: String,
    version: String,
    format: String (enum: ['REST', 'SOAP', 'XML'])
  },
  
  credentials: {
    apiKey: String,
    secret: String,
    accountNumber: String,
    meterNumber: String,
    userId: String,
    accessToken: String,
    environment: String (enum: ['sandbox', 'production'])
  },
  
  services: [{
    code: String,
    name: String,
    type: String (enum: ['ground', 'express', 'international']),
    domestic: Boolean,
    international: Boolean,
    maxWeight: Number,
    maxDimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    deliveryDays: String,
    features: [String] // ['tracking', 'insurance', 'signature', 'saturday']
  }],
  
  pricing: {
    rateMarkup: Number, // percentage
    fuelSurcharge: Number,
    residentialSurcharge: Number,
    signatureFee: Number,
    insuranceRate: Number
  },
  
  enabled: Boolean,
  isDefault: Boolean,
  
  settings: {
    autoTracking: Boolean,
    autoManifest: Boolean,
    labelFormat: String,
    labelSize: String,
    printDensity: String
  },
  
  limits: {
    dailyShipments: Number,
    monthlyShipments: Number,
    maxWeight: Number,
    maxValue: Number
  },
  
  stats: {
    totalShipments: Number,
    totalCost: Number,
    avgCost: Number,
    avgDeliveryDays: Number,
    onTimePercentage: Number,
    lastUsed: Date
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### Automation Rules Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String (required),
  description: String,
  enabled: Boolean,
  priority: Number,
  
  trigger: {
    event: String (enum: ['order_imported', 'order_updated', 'inventory_low']),
    conditions: {
      orderValue: { min: Number, max: Number },
      weight: { min: Number, max: Number },
      itemCount: { min: Number, max: Number },
      
      destination: {
        countries: [String],
        states: [String],
        zips: [String],
        residential: Boolean
      },
      
      customer: {
        tags: [String],
        orderCount: { min: Number, max: Number },
        totalSpent: { min: Number, max: Number },
        isVip: Boolean
      },
      
      products: {
        skus: [String],
        categories: [String],
        tags: [String],
        hasHazmat: Boolean,
        hasFragile: Boolean
      },
      
      source: [String],
      timeRange: {
        days: [String], // ['monday', 'tuesday', etc.]
        hours: { start: String, end: String },
        timezone: String
      }
    }
  },
  
  actions: {
    shipping: {
      carrierId: ObjectId,
      carrier: String,
      service: String,
      packaging: String
    },
    
    options: {
      insurance: Boolean,
      signatureRequired: Boolean,
      saturdayDelivery: Boolean,
      holdForPickup: Boolean
    },
    
    fulfillment: {
      warehouseId: ObjectId,
      priority: String (enum: ['normal', 'high', 'urgent']),
      autoShip: Boolean,
      requireApproval: Boolean
    },
    
    notifications: {
      emailCustomer: Boolean,
      emailTeam: Boolean,
      smsCustomer: Boolean,
      slackChannel: String
    },
    
    tagging: {
      addTags: [String],
      removeTags: [String]
    },
    
    routing: {
      assignTo: String,
      department: String
    }
  },
  
  schedule: {
    enabled: Boolean,
    frequency: String (enum: ['immediate', 'hourly', 'daily', 'weekly']),
    time: String,
    timezone: String
  },
  
  stats: {
    totalExecutions: Number,
    successfulExecutions: Number,
    failedExecutions: Number,
    lastExecuted: Date,
    avgExecutionTime: Number
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### Warehouses Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String (required),
  code: String (unique, required),
  type: String (enum: ['warehouse', 'dropship', 'fulfillment_center']),
  
  address: {
    name: String,
    company: String,
    address1: String (required),
    address2: String,
    city: String (required),
    state: String (required),
    zip: String (required),
    country: String (required),
    phone: String,
    email: String
  },
  
  enabled: Boolean,
  isDefault: Boolean,
  priority: Number,
  
  settings: {
    cutoffTime: String, // "17:00"
    shippingDays: [String], // ['monday', 'tuesday', etc.]
    timezone: String,
    autoAllocate: Boolean,
    packingSlipFormat: String,
    picklistFormat: String
  },
  
  features: {
    hasPickList: Boolean,
    hasPackingSlip: Boolean,
    hasBarcode: Boolean,
    hasWeighStation: Boolean,
    hasManifest: Boolean
  },
  
  inventory: [{
    productId: ObjectId,
    sku: String,
    quantity: Number,
    reserved: Number,
    available: Number,
    inTransit: Number,
    bins: [{
      location: String,
      quantity: Number,
      lastCounted: Date
    }],
    lastUpdated: Date
  }],
  
  zones: [{
    name: String,
    description: String,
    bins: [String]
  }],
  
  staff: [{
    userId: ObjectId,
    name: String,
    role: String,
    permissions: [String]
  }],
  
  stats: {
    totalOrders: Number,
    totalShipments: Number,
    avgProcessingTime: Number,
    accuracyRate: Number,
    lastActivity: Date
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### Integrations Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String (required),
  type: String (required), // 'ecommerce', 'marketplace', 'fulfillment', 'accounting'
  platform: String, // 'shopify', 'amazon', 'ebay', 'quickbooks', etc.
  
  connection: {
    status: String (enum: ['connected', 'disconnected', 'error', 'pending']),
    lastSync: Date,
    nextSync: Date,
    errorMessage: String
  },
  
  credentials: {
    apiKey: String,
    secret: String,
    storeUrl: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Date
  },
  
  settings: {
    autoImport: Boolean,
    importFrequency: Number, // minutes
    importStatuses: [String],
    updateInventory: Boolean,
    markAsShipped: Boolean,
    sendTracking: Boolean,
    createReturns: Boolean
  },
  
  mapping: {
    orderStatus: Object,
    shippingMethods: Object,
    productFields: Object,
    customerFields: Object
  },
  
  filters: {
    dateRange: { start: Date, end: Date },
    orderStatuses: [String],
    productTags: [String],
    customerTags: [String],
    minimumValue: Number
  },
  
  syncStats: {
    ordersImported: Number,
    ordersUpdated: Number,
    productsImported: Number,
    productsUpdated: Number,
    customersImported: Number,
    errors: Number,
    lastSuccess: Date,
    totalRuntime: Number
  },
  
  webhooks: {
    enabled: Boolean,
    url: String,
    secret: String,
    events: [String]
  },
  
  enabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔗 API Reference

### Authentication

#### POST /api/auth/register
```javascript
// Request
{
  "email": "user@company.com",
  "password": "securepassword",
  "company": "My Company"
}

// Response
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@company.com",
    "company": "My Company"
  }
}
```

#### POST /api/auth/login
```javascript
// Request
{
  "email": "user@company.com",
  "password": "securepassword"
}

// Response
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@company.com",
    "company": "My Company"
  }
}
```

### Orders Management

#### GET /api/orders
```javascript
// Query Parameters
?page=1&limit=50&status=pending&source=shopify&search=john

// Response
{
  "orders": [...],
  "totalPages": 5,
  "currentPage": 1,
  "total": 247
}
```

#### POST /api/orders
```javascript
// Request
{
  "orderNumber": "ORD-001",
  "source": "manual",
  "customer": {
    "name": "John Smith",
    "email": "john@example.com"
  },
  "shippingAddress": {
    "address1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210",
    "country": "US"
  },
  "items": [{
    "sku": "TEE-001",
    "name": "T-Shirt",
    "quantity": 2,
    "price": 25.00,
    "weight": 8
  }],
  "totals": {
    "subtotal": 50.00,
    "tax": 4.50,
    "shipping": 8.95,
    "total": 63.45
  }
}

// Response
{
  "id": "order-id",
  "orderNumber": "ORD-001",
  "status": "pending",
  "automation": {
    "processed": true,
    "rules": ["rule-id-1"]
  },
  ...
}
```

#### PUT /api/orders/:id
```javascript
// Request
{
  "status": "processing",
  "notes": "Rush order"
}

// Response
{
  "id": "order-id",
  "status": "processing",
  "notes": "Rush order",
  ...
}
```

### Shipping & Rate Shopping

#### POST /api/shipping/rates
```javascript
// Request
{
  "origin": {
    "name": "Warehouse",
    "address1": "123 Industrial Blvd",
    "city": "Commerce",
    "state": "CA",
    "zip": "90040",
    "country": "US"
  },
  "destination": {
    "name": "John Smith",
    "address1": "456 Oak Ave",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US",
    "residential": true
  },
  "packages": [{
    "weight": 16,
    "dimensions": {
      "length": 12,
      "width": 9,
      "height": 6
    },
    "value": 89.99
  }]
}

// Response
{
  "rates": [
    {
      "carrier": "USPS",
      "service": "Priority Mail",
      "cost": 8.95,
      "listRate": 12.45,
      "discount": 3.50,
      "estimatedDays": 2,
      "deliveryDate": "2025-07-12",
      "zone": "4",
      "trackingIncluded": true,
      "signatureAvailable": true,
      "insuranceAvailable": true
    },
    {
      "carrier": "UPS",
      "service": "Ground",
      "cost": 12.50,
      "listRate": 15.75,
      "discount": 3.25,
      "estimatedDays": 3,
      "deliveryDate": "2025-07-13",
      "zone": "5",
      "trackingIncluded": true,
      "signatureAvailable": true,
      "insuranceAvailable": true
    }
  ]
}
```

#### POST /api/shipping/labels
```javascript
// Request
{
  "orderId": "order-id",
  "rateSelection": {
    "carrier": "UPS",
    "service": "Ground",
    "cost": 12.50
  },
  "options": {
    "insurance": true,
    "signatureRequired": false,
    "saturdayDelivery": false
  }
}

// Response
{
  "order": { ... },
  "label": {
    "trackingNumber": "1Z12345E0205271687",
    "labelUrl": "https://api.shipmaster.com/labels/1Z12345E0205271687.pdf",
    "cost": 12.50,
    "estimatedDelivery": "2025-07-13T17:00:00Z",
    "zone": "5",
    "actualWeight": 16,
    "billableWeight": 16
  }
}
```

#### POST /api/orders/batch/ship
```javascript
// Request
{
  "orderIds": ["order-id-1", "order-id-2"],
  "carrier": "UPS",
  "service": "Ground",
  "options": {
    "autoSelectBest": true,
    "maxCost": 15.00
  }
}

// Response
{
  "results": [
    {
      "orderId": "order-id-1",
      "success": true,
      "trackingNumber": "1Z12345E0205271687",
      "cost": 12.50
    },
    {
      "orderId": "order-id-2",
      "success": false,
      "error": "Address validation failed"
    }
  ],
  "summary": {
    "successful": 1,
    "failed": 1,
    "totalCost": 12.50
  }
}
```

### Inventory Management

#### GET /api/inventory
```javascript
// Response
{
  "lowStock": [
    {
      "sku": "BOOK-001",
      "name": "JavaScript Guide",
      "inventory": {
        "quantity": 8,
        "reserved": 5,
        "available": 3,
        "reorderPoint": 20
      }
    }
  ],
  "outOfStock": [...],
  "summary": {
    "totalQuantity": 2847,
    "totalValue": 125640.50,
    "lowStockCount": 12,
    "outOfStockCount": 3
  }
}
```

#### POST /api/inventory/adjust
```javascript
// Request
{
  "sku": "TEE-001",
  "adjustment": 50,
  "reason": "Restock",
  "cost": 12.50
}

// Response
{
  "sku": "TEE-001",
  "previousQuantity": 125,
  "newQuantity": 175,
  "adjustment": 50,
  "adjustmentValue": 625.00
}
```

### Automation Rules

#### GET /api/automation/rules
```javascript
// Response
[
  {
    "id": "rule-id",
    "name": "Express Orders",
    "description": "Orders over $100 get expedited shipping",
    "enabled": true,
    "priority": 1,
    "trigger": {
      "event": "order_imported",
      "conditions": {
        "orderValue": { "min": 100 }
      }
    },
    "actions": {
      "shipping": {
        "carrier": "UPS",
        "service": "Next Day Air"
      },
      "options": {
        "insurance": true
      }
    },
    "stats": {
      "totalExecutions": 247,
      "successfulExecutions": 245,
      "lastExecuted": "2025-07-10T15:30:00Z"
    }
  }
]
```

#### POST /api/automation/rules
```javascript
// Request
{
  "name": "International Orders",
  "description": "Route international orders to DHL",
  "enabled": true,
  "priority": 2,
  "trigger": {
    "event": "order_imported",
    "conditions": {
      "destination": {
        "countries": ["CA", "GB", "AU", "DE", "FR"]
      }
    }
  },
  "actions": {
    "shipping": {
      "carrier": "DHL",
      "service": "Express Worldwide"
    },
    "options": {
      "insurance": true,
      "signatureRequired": true
    },
    "tagging": {
      "addTags": ["international", "dhl"]
    }
  }
}

// Response
{
  "id": "new-rule-id",
  "name": "International Orders",
  "enabled": true,
  ...
}
```

### Analytics & Reporting

#### GET /api/analytics/dashboard
```javascript
// Response
{
  "summary": {
    "totalOrders": 1247,
    "recentOrders": 156,
    "shippedOrders": 1089,
    "pendingOrders": 158,
    "revenue": 47580.50,
    "shippingCosts": 3240.75,
    "avgShippingCost": 8.42,
    "onTimeDelivery": 94.2
  },
  "topCarriers": [
    { "_id": "UPS", "count": 450, "cost": 5678.90 },
    { "_id": "USPS", "count": 389, "cost": 3456.78 },
    { "_id": "FedEx", "count": 250, "cost": 4321.12 }
  ],
  "recentActivity": [
    {
      "timestamp": "2025-07-10T15:30:00Z",
      "type": "order_shipped",
      "description": "Order SM-2025-156 shipped via UPS Ground",
      "orderId": "order-id"
    }
  ]
}
```

#### GET /api/analytics/performance
```javascript
// Query Parameters
?startDate=2025-06-01&endDate=2025-07-01&groupBy=day

// Response
{
  "metrics": {
    "avgShippingCost": [
      { "date": "2025-06-01", "value": 8.45 },
      { "date": "2025-06-02", "value": 8.32 }
    ],
    "orderVolume": [
      { "date": "2025-06-01", "value": 45 },
      { "date": "2025-06-02", "value": 52 }
    ],
    "onTimeDelivery": [
      { "date": "2025-06-01", "value": 94.5 },
      { "date": "2025-06-02", "value": 93.8 }
    ]
  },
  "summary": {
    "totalShipments": 1456,
    "totalCost": 12456.78,
    "avgCost": 8.55,
    "onTimePercentage": 94.2
  }
}
```

### Webhooks

#### Order Import Webhook
```javascript
// Endpoint: POST /api/webhooks/orders
// Headers: X-Source: shopify, X-Signature: sha256=...

// Request (Shopify format)
{
  "id": 12345,
  "order_number": "1001",
  "email": "customer@example.com",
  "created_at": "2025-07-10T15:30:00Z",
  "customer": {
    "first_name": "John",
    "last_name": "Smith",
    "email": "john@example.com"
  },
  "shipping_address": {
    "address1": "123 Main St",
    "city": "Los Angeles",
    "province": "CA",
    "zip": "90210",
    "country_code": "US"
  },
  "line_items": [{
    "sku": "TEE-001",
    "title": "Cotton T-Shirt",
    "quantity": 2,
    "price": "25.00",
    "weight": 8
  }],
  "subtotal_price": "50.00",
  "total_tax": "4.50",
  "total_price": "63.45"
}

// Response
{
  "message": "Order imported successfully",
  "orderId": "internal-order-id",
  "orderNumber": "SM-2025-157"
}
```

## 🛠 Advanced Features

### Rate Shopping Algorithm
```javascript
// Enhanced rate comparison with optimization
class AdvancedRateShop {
  async getBestRates(shipment, preferences = {}) {
    const rates = await this.getAllRates(shipment);
    
    // Apply business rules
    const filteredRates = rates.filter(rate => {
      if (preferences.maxCost && rate.cost > preferences.maxCost) return false;
      if (preferences.maxDays && rate.estimatedDays > preferences.maxDays) return false;
      if (preferences.preferredCarriers && !preferences.preferredCarriers.includes(rate.carrier)) return false;
      return true;
    });
    
    // Score rates based on multiple factors
    const scoredRates = filteredRates.map(rate => ({
      ...rate,
      score: this.calculateScore(rate, preferences)
    }));
    
    return scoredRates.sort((a, b) => b.score - a.score);
  }
  
  calculateScore(rate, preferences) {
    let score = 0;
    
    // Cost factor (40% weight)
    const costScore = (1 - (rate.cost / 100)) * 40;
    score += Math.max(0, costScore);
    
    // Speed factor (30% weight)
    const speedScore = (10 - rate.estimatedDays) * 3;
    score += Math.max(0, speedScore);
    
    // Reliability factor (20% weight)
    const reliabilityScore = (rate.carrier.onTimePercentage || 95) * 0.2;
    score += reliabilityScore;
    
    // Preference factor (10% weight)
    if (preferences.preferredCarriers?.includes(rate.carrier)) {
      score += 10;
    }
    
    return score;
  }
}
```

### Smart Packaging Optimization
```javascript
class PackagingOptimizer {
  static optimize(items, availableBoxes) {
    // 3D bin packing algorithm
    const packages = [];
    let remainingItems = [...items];
    
    while (remainingItems.length > 0) {
      const bestBox = this.findBestBox(remainingItems, availableBoxes);
      const packedItems = this.packBox(remainingItems, bestBox);
      
      packages.push({
        box: bestBox,
        items: packedItems,
        weight: packedItems.reduce((sum, item) => sum + item.weight * item.quantity, 0),
        dimensions: bestBox.dimensions
      });
      
      remainingItems = remainingItems.filter(item => !packedItems.includes(item));
    }
    
    return packages;
  }
  
  static findBestBox(items, boxes) {
    const totalVolume = items.reduce((sum, item) => {
      const itemVolume = (item.dimensions?.length || 4) * 
                        (item.dimensions?.width || 4) * 
                        (item.dimensions?.height || 2) * 
                        item.quantity;
      return sum + itemVolume;
    }, 0);
    
    // Find smallest box that can fit all items
    return boxes
      .filter(box => box.volume >= totalVolume)
      .sort((a, b) => a.volume - b.volume)[0] || boxes[boxes.length - 1];
  }
}
```

### Address Validation Service
```javascript
class AddressValidator {
  static async validate(address) {
    const validationRules = {
      US: {
        zipPattern: /^\d{5}(-\d{4})?$/,
        statePattern: /^[A-Z]{2}$/,
        requiredFields: ['address1', 'city', 'state', 'zip']
      },
      CA: {
        zipPattern: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
        statePattern: /^[A-Z]{2}$/,
        requiredFields: ['address1', 'city', 'state', 'zip']
      }
    };
    
    const rules = validationRules[address.country];
    if (!rules) return { valid: true, normalized: address };
    
    const errors = [];
    const normalized = { ...address };
    
    // Check required fields
    rules.requiredFields.forEach(field => {
      if (!address[field] || address[field].trim() === '') {
        errors.push(`${field} is required`);
      }
    });
    
    // Validate zip code
    if (address.zip && !rules.zipPattern.test(address.zip)) {
      errors.push('Invalid postal code format');
    }
    
    // Validate state
    if (address.state && !rules.statePattern.test(address.state)) {
      errors.push('Invalid state/province format');
    }
    
    // Normalize case
    normalized.state = address.state?.toUpperCase();
    normalized.country = address.country?.toUpperCase();
    
    // Use external validation service for detailed verification
    if (errors.length === 0) {
      try {
        const externalValidation = await this.validateWithService(normalized);
        if (externalValidation.suggestions) {
          normalized.validationSuggestions = externalValidation.suggestions;
        }
        normalized.validated = true;
        normalized.validationType = externalValidation.type; // 'exact', 'corrected', 'approximate'
      } catch (error) {
        console.warn('External validation failed:', error);
        normalized.validated = false;
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      normalized
    };
  }
}
```

## 🚀 Deployment Guide

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S shipmaster -u 1001

# Set permissions
RUN chown -R shipmaster:nodejs /app
USER shipmaster

EXPOSE 3001

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  shipmaster-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/shipmaster
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  mongo:
    image: mongo:5.0
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - shipmaster-api
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

### Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups scheduled
- [ ] Monitoring setup (Datadog, New Relic, etc.)
- [ ] Log aggregation configured
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] API documentation published
- [ ] Load testing completed
- [ ] Disaster recovery plan documented

### Scaling Considerations

1. **Database Optimization**
   - Index frequently queried fields
   - Implement read replicas
   - Consider sharding for large datasets

2. **Caching Strategy**
   - Redis for session storage
   - Cache shipping rates for 15 minutes
   - Cache product data for 1 hour

3. **Background Jobs**
   - Use Bull Queue for processing
   - Separate workers for different job types
   - Implement retry logic with exponential backoff

4. **Load Balancing**
   - Use nginx or AWS ALB
   - Implement health checks
   - Consider horizontal pod autoscaling

## 🔐 Security Best Practices

### API Security
- JWT tokens with short expiration
- Rate limiting per endpoint
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- CORS configuration
- API key management

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- PCI compliance for payment data
- GDPR compliance for EU customers
- Regular security audits
- Vulnerability scanning

### Access Control
- Role-based permissions
- API key restrictions
- IP whitelisting for webhooks
- Audit logging
- Two-factor authentication
- Session management

## 📈 Performance Optimization

### Database Performance
```javascript
// Optimized indexes
db.orders.createIndex({ "userId": 1, "status": 1, "timestamps.imported": -1 });
db.orders.createIndex({ "orderNumber": 1 }, { unique: true });
db.orders.createIndex({ "externalOrderId": 1, "source": 1 });
db.products.createIndex({ "userId": 1, "sku": 1 }, { unique: true });
db.products.createIndex({ "inventory.quantity": 1 });
```

### Caching Strategy
```javascript
// Redis caching implementation
class CacheService {
  static async getShippingRates(cacheKey) {
    const cached = await redis.get(`rates:${cacheKey}`);
    if (cached) return JSON.parse(cached);
    
    const rates = await CarrierService.getRates(shipment);
    await redis.setex(`rates:${cacheKey}`, 900, JSON.stringify(rates)); // 15 min
    
    return rates;
  }
  
  static async getProduct(sku) {
    const cached = await redis.get(`product:${sku}`);
    if (cached) return JSON.parse(cached);
    
    const product = await Product.findOne({ sku });
    await redis.setex(`product:${sku}`, 3600, JSON.stringify(product)); // 1 hour
    
    return product;
  }
}
```

This comprehensive ShipMaster Pro solution provides all the core functionality of ShipStation with additional enterprise features, robust architecture, and production-ready deployment options. The system is designed to scale from small businesses to enterprise-level operations while maintaining high performance and reliability.
