# ShipMaster Pro - Advanced Tagging System Guide

## 🏷️ Overview

The ShipMaster Pro tagging system provides comprehensive organization and automation capabilities for orders, products, and customers. Tags enable intelligent workflow automation, advanced filtering, and detailed analytics to streamline your shipping operations.

## 🎯 Key Features

### ✨ Intelligent Tagging
- **AI-Powered Suggestions**: Automatic tag recommendations based on order characteristics
- **Multi-Entity Support**: Tag orders, products, customers, and shipments
- **Category Organization**: Organize tags by priority, shipping, order type, customer, product, and custom categories
- **Color-Coded System**: Visual organization with customizable colors and icons

### 🤖 Advanced Automation
- **Tag-Based Triggers**: Automation rules triggered by tag application or removal
- **Conditional Logic**: Complex conditions combining tags, order values, destinations, and more
- **Multi-Action Rules**: Execute multiple actions (shipping, tagging, notifications) in sequence
- **Priority System**: Rule execution order based on priority levels

### 📊 Analytics & Insights
- **Usage Statistics**: Track tag application frequency and trends
- **Performance Metrics**: Monitor automation rule effectiveness
- **Tag Analytics**: Identify most/least used tags and optimization opportunities
- **Reporting**: Generate tag-based reports for business intelligence

## 🏗️ Tag Categories

### 1. Priority Tags
Control order processing priority and workflow routing.

- **urgent** 🚨 - Immediate attention required
- **high-priority** ⚡ - Expedited processing
- **standard** 📦 - Normal processing order

**Use Cases:**
- VIP customer orders automatically get `urgent` tag
- Orders over $500 get `high-priority` tag
- Time-sensitive promotions use `urgent` tag

### 2. Shipping Tags
Define special shipping requirements and handling instructions.

- **express** 🚀 - Express shipping required
- **fragile** 🔍 - Fragile items requiring special handling
- **hazmat** ⚠️ - Hazardous materials
- **oversized** 📏 - Oversized packages
- **signature-required** ✍️ - Signature required for delivery

**Use Cases:**
- Electronics automatically get `fragile` tag
- Chemical products get `hazmat` tag
- High-value items get `signature-required` tag

### 3. Order Tags
Classify orders by type, source, or special characteristics.

- **gift** 🎁 - Gift orders requiring special packaging
- **international** 🌍 - International shipping
- **backorder** ⏳ - Items on backorder
- **dropship** 🏭 - Dropship orders
- **wholesale** 🏢 - Wholesale orders

**Use Cases:**
- Gift orders get special packaging and gift receipts
- International orders route to DHL automatically
- Wholesale orders bypass certain verification steps

### 4. Customer Tags
Segment customers for personalized service and automation.

- **vip** 👑 - VIP customers
- **repeat-customer** 🔄 - Loyal customers
- **new-customer** 🌟 - First-time customers

**Use Cases:**
- VIP customers get free express shipping
- New customers receive welcome packages
- Repeat customers get loyalty discounts

### 5. Product Tags
Categorize products for inventory management and automation.

- **electronics** 📱 - Electronic items
- **apparel** 👕 - Clothing and apparel
- **books** 📚 - Books and publications
- **food** 🍎 - Food items
- **cosmetics** 💄 - Beauty products

**Use Cases:**
- Electronics get insurance automatically
- Food items have expiration date tracking
- Apparel uses specific packaging materials

## 🔧 Setting Up Tags

### Creating Custom Tags

1. **Navigate to Tags Section**
   - Go to Tags tab in main navigation
   - Click "Manage Tags" or "Create Tag"

2. **Tag Configuration**
   ```javascript
   {
     name: "black-friday",        // Unique identifier
     category: "custom",          // Category classification
     color: "#DC2626",           // Hex color code
     description: "Black Friday promotion orders",
     metadata: {
       icon: "🛍️",              // Display icon
       tooltip: "Special Black Friday handling"
     }
   }
   ```

3. **Tag Collections**
   - Group related tags for better organization
   - Set exclusive collections (only one tag allowed)
   - Define auto-application rules

### Applying Tags

#### Manual Tagging
- Click the "+" button next to any order or product
- Select from available tags using the tag selector
- Remove tags by clicking the "×" on tag badges

#### Bulk Tagging
1. Select multiple orders using checkboxes
2. Click "Bulk Tag" button
3. Choose operation: Apply or Remove tags
4. Select tags to apply/remove
5. Confirm operation

#### AI-Powered Suggestions
- System automatically suggests relevant tags
- Based on order value, destination, products, customer history
- Click suggestion to apply with one click
- View confidence score and reasoning

## 🤖 Automation Rules

### Tag-Based Automation

#### Rule Structure
```javascript
{
  name: "VIP Express Shipping",
  trigger: "tag_applied",
  conditions: {
    tags: {
      include: ["vip"],           // Must have VIP tag
      exclude: ["international"] // But not international
    },
    orderValue: { min: 50 }       // Minimum order value
  },
  actions: {
    shipping: {
      carrier: "UPS",
      service: "Next Day Air"
    },
    options: {
      insurance: true,
      signatureRequired: true
    },
    tagging: {
      addTags: ["express", "high-priority"],
      removeTags: ["standard"]
    },
    notifications: {
      emailTeam: true,
      slackChannel: "#vip-orders"
    }
  }
}
```

#### Common Automation Patterns

**1. Priority-Based Routing**
```javascript
// When "urgent" tag is applied
→ Assign to express queue
→ Skip standard verification
→ Add insurance automatically
→ Notify management team
```

**2. Product-Based Handling**
```javascript
// When "fragile" tag is applied
→ Use protective packaging
→ Require signature delivery
→ Add fragile handling fee
→ Send special instructions to warehouse
```

**3. Customer Tier Management**
```javascript
// When "vip" tag is applied
→ Upgrade to express shipping (free)
→ Add gift message option
→ Priority customer service
→ Loyalty points bonus
```

**4. Geographic Optimization**
```javascript
// When "international" tag is applied
→ Route to DHL Express
→ Generate customs forms
→ Add international tracking
→ Calculate duties and taxes
```

### Advanced Conditions

#### Tag Logic Operators
```javascript
conditions: {
  tags: {
    include: ["vip", "repeat-customer"],    // AND logic (must have both)
    includeAny: ["gift", "special"],        // OR logic (must have at least one)
    exclude: ["wholesale", "dropship"],     // NOT logic (must not have any)
    operator: "AND"                         // Default operator for include array
  }
}
```

#### Complex Conditions
```javascript
conditions: {
  // Multiple condition types
  tags: { include: ["vip"] },
  orderValue: { min: 100, max: 1000 },
  destination: { countries: ["US", "CA"] },
  customer: { orderCount: { min: 5 } },
  products: { categories: ["electronics"] },
  
  // Time-based conditions
  timeRange: {
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    hours: { start: "09:00", end: "17:00" }
  },
  
  // Tag history conditions
  tagHistory: {
    addedWithin: 60,        // Tag added within 60 minutes
    specificTag: "urgent"   // Check for specific tag in history
  }
}
```

### Multi-Step Actions

#### Sequential Processing
```javascript
actions: {
  // Step 1: Update shipping
  shipping: {
    carrier: "UPS",
    service: "Next Day Air",
    packaging: "express-box"
  },
  
  // Step 2: Apply additional tags
  tagging: {
    addTags: ["express", "tracked"],
    removeTags: ["standard", "economy"],
    conditional: [{
      condition: { orderValue: { min: 200 } },
      addTags: ["premium-service"]
    }]
  },
  
  // Step 3: Workflow changes
  workflow: {
    assignTo: "express-team",
    priority: "high",
    skipSteps: ["standard-verification"],
    requireApproval: false
  },
  
  // Step 4: Notifications
  notifications: {
    email: {
      customer: true,
      team: true,
      template: "express-shipping-confirmation"
    },
    slack: {
      channel: "#express-orders",
      mentionUsers: ["@manager"]
    }
  },
  
  // Step 5: Integration updates
  integrations: {
    updateCRM: {
      enabled: true,
      fields: { priority: "high", service_level: "premium" }
    }
  }
}
```

## 📊 Analytics & Reporting

### Tag Performance Metrics

#### Usage Analytics
- **Application Frequency**: How often each tag is used
- **Trend Analysis**: Tag usage over time
- **Category Breakdown**: Distribution across tag categories
- **Automation Triggers**: How many automations each tag triggers

#### Business Impact
- **Cost Savings**: Automation-driven cost reductions
- **Processing Time**: Time saved through automated workflows
- **Error Reduction**: Decrease in manual processing errors
- **Customer Satisfaction**: Impact on delivery performance

### Custom Reports

#### Tag-Based Segmentation
```sql
-- Orders by tag combination
SELECT 
  tags,
  COUNT(*) as order_count,
  AVG(total_value) as avg_value,
  AVG(shipping_cost) as avg_shipping
FROM orders 
WHERE tags CONTAINS 'vip' AND tags CONTAINS 'express'
GROUP BY tags;
```

#### Automation Effectiveness
```sql
-- Automation rule performance
SELECT 
  rule_name,
  total_executions,
  successful_executions,
  (successful_executions / total_executions * 100) as success_rate,
  avg_execution_time
FROM automation_stats
ORDER BY total_executions DESC;
```

## 🎯 Best Practices

### Tag Naming Conventions
- Use lowercase with hyphens: `high-priority`, `same-day`
- Be descriptive but concise: `international` not `intl`
- Use consistent terminology across categories
- Avoid special characters and spaces

### Automation Design
1. **Start Simple**: Begin with basic tag-triggered actions
2. **Test Thoroughly**: Validate rules with sample orders
3. **Monitor Performance**: Track automation success rates
4. **Iterate Gradually**: Add complexity as you gain confidence
5. **Document Rules**: Maintain clear descriptions and purposes

### Tag Hierarchy
```
Priority Tags (Exclusive)
├── urgent
├── high-priority
└── standard

Shipping Requirements (Multiple allowed)
├── express
├── fragile
├── signature-required
└── insurance-required

Customer Classification (Exclusive)
├── vip
├── repeat-customer
└── new-customer
```

### Performance Optimization
- **Limit Active Rules**: Keep automation rules under 50 for optimal performance
- **Use Tag Collections**: Group related tags for better organization
- **Regular Cleanup**: Remove unused tags and obsolete rules
- **Monitor Usage**: Review tag analytics monthly

## 🔍 Advanced Use Cases

### Seasonal Campaign Management
```javascript
// Black Friday automation
{
  name: "Black Friday Rush",
  conditions: {
    tags: { include: ["black-friday"] },
    timeRange: { 
      dateRange: { start: "2025-11-29", end: "2025-12-02" }
    }
  },
  actions: {
    shipping: { service: "Express" },
    tagging: { addTags: ["holiday-rush"] },
    workflow: { assignTo: "holiday-team" }
  }
}
```

### Customer Lifecycle Management
```javascript
// New customer welcome flow
{
  name: "New Customer Welcome",
  conditions: {
    tags: { include: ["new-customer"] },
    customer: { orderCount: { max: 1 } }
  },
  actions: {
    tagging: { addTags: ["welcome-program"] },
    notifications: {
      email: {
        customer: true,
        template: "welcome-series-start"
      }
    },
    fulfillment: { includeWelcomePacket: true }
  }
}
```

### Inventory Integration
```javascript
// Low stock handling
{
  name: "Low Stock Alert",
  trigger: "inventory_low",
  conditions: {
    products: { tags: { include: ["bestseller"] } },
    inventory: { quantity: { max: 10 } }
  },
  actions: {
    tagging: { addTags: ["reorder-needed"] },
    notifications: {
      email: { team: true, template: "low-stock-alert" }
    },
    workflow: { createPurchaseOrder: true }
  }
}
```

## 🚀 Getting Started

### Quick Setup Checklist
1. ✅ **Review System Tags**: Understand default tag categories
2. ✅ **Create Custom Tags**: Add business-specific tags
3. ✅ **Setup Tag Collections**: Organize related tags
4. ✅ **Enable AI Suggestions**: Configure automatic tag suggestions
5. ✅ **Create Basic Rules**: Start with simple automation rules
6. ✅ **Test Automation**: Validate rules with test orders
7. ✅ **Monitor Performance**: Track tag usage and rule effectiveness
8. ✅ **Scale Gradually**: Add more complex rules as needed

### Sample Automation Workflow
```
Order Import
    ↓
AI Tag Suggestions
    ↓ (if VIP customer detected)
Apply "vip" tag
    ↓ (triggers automation)
VIP Rule Execution:
  - Upgrade to express shipping
  - Add insurance
  - Assign to priority queue
  - Notify VIP team
    ↓
Order Processing
    ↓
Shipment Creation
    ↓
Customer Notification
```

## 📞 Support & Resources

- **Documentation**: Complete API reference and guides
- **Video Tutorials**: Step-by-step setup and usage videos
- **Community Forum**: Share tips and best practices
- **Support Team**: Technical assistance and consultation
- **Training Sessions**: Live workshops on advanced features

---

The ShipMaster Pro tagging system transforms manual shipping operations into intelligent, automated workflows. Start with basic tags and automation rules, then gradually build complexity as your business grows and requirements evolve.