# ShipMaster Pro - Coding Rules and Standards

This document defines the coding standards, conventions, and best practices for the ShipMaster Pro project.

## Table of Contents
1. [General Principles](#general-principles)
2. [Project Structure](#project-structure)
3. [Backend Standards](#backend-standards)
4. [Frontend Standards](#frontend-standards)
5. [Database Conventions](#database-conventions)
6. [API Design](#api-design)
7. [Testing Standards](#testing-standards)
8. [Security Guidelines](#security-guidelines)
9. [Performance Guidelines](#performance-guidelines)
10. [Documentation Standards](#documentation-standards)

## General Principles

### Core Values
- **Clarity over cleverness**: Write code that is easy to understand
- **Consistency**: Follow established patterns throughout the codebase
- **Modularity**: Create reusable, single-purpose components
- **Type Safety**: Use TypeScript/JSDoc for type checking
- **Error Handling**: Always handle errors gracefully
- **Performance**: Consider performance implications in design decisions

### Code Quality
- No code should be committed without proper testing
- All code must pass linting before merge
- Code reviews are mandatory for all changes
- Refactor as you go - leave code better than you found it

## Project Structure

### Directory Organization
```
shipmaster-pro/
   backend/
      src/
         models/         # Mongoose schemas
         controllers/    # Route handlers
         services/       # Business logic
         integrations/   # External API clients
         routes/         # Express routes
         middleware/     # Express middleware
         utils/          # Utility functions
         config/         # Configuration files
         types/          # TypeScript types
      tests/
   frontend/
      src/
         components/     # React components
         pages/          # Page components
         services/       # API services
         hooks/          # Custom React hooks
         utils/          # Utility functions
         types/          # TypeScript types
         styles/         # Global styles
      tests/
   docs/                   # Documentation
```

### File Naming Conventions
- **Components**: PascalCase (e.g., `OrderList.tsx`)
- **Utilities/Services**: camelCase (e.g., `apiService.ts`)
- **Constants**: UPPER_SNAKE_CASE in files, exported as such
- **Interfaces/Types**: PascalCase with 'I' prefix for interfaces (e.g., `IOrder`)
- **Test files**: Same name with `.test.ts` or `.spec.ts` suffix

## Backend Standards

### Node.js/Express Conventions

#### File Structure
```javascript
// Model file structure (models/Order.js)
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Schema definition
});

// Indexes
orderSchema.index({ userId: 1, status: 1 });

// Virtual fields
orderSchema.virtual('totalWeight').get(function() {
  // Implementation
});

// Instance methods
orderSchema.methods.methodName = function() {
  // Implementation
};

// Static methods
orderSchema.statics.staticMethodName = function() {
  // Implementation
};

// Middleware
orderSchema.pre('save', function(next) {
  // Implementation
  next();
});

module.exports = mongoose.model('Order', orderSchema);
```

#### Service Layer Pattern
```javascript
// Service file structure (services/OrderService.js)
class OrderService {
  constructor() {
    // Initialize dependencies
  }

  async createOrder(orderData) {
    // Validation
    if (!orderData.items?.length) {
      throw new Error('Order must have at least one item');
    }

    // Business logic
    try {
      // Implementation
      return order;
    } catch (error) {
      // Error handling
      throw error;
    }
  }
}

module.exports = new OrderService();
```

#### Route Handler Pattern
```javascript
// Route file structure (routes/orders.js)
const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Apply auth to all routes
router.use(requireAuth);

// GET /api/orders
router.get('/', 
  validateRequest(schemas.paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await orderService.getOrders(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
```

### Error Handling
```javascript
// Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.status = 400;
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error
  logger.error({
    error: err,
    request: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(status).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
```

### Async/Await Usage
- Always use async/await over callbacks or raw promises
- Always wrap async operations in try/catch blocks
- Use Promise.all() for parallel operations

```javascript
// Good
async function processOrders(orderIds) {
  try {
    const orders = await Promise.all(
      orderIds.map(id => Order.findById(id))
    );
    return orders;
  } catch (error) {
    logger.error('Failed to process orders:', error);
    throw error;
  }
}

// Bad
function processOrders(orderIds, callback) {
  Order.find({ _id: { $in: orderIds } }, callback);
}
```

## Frontend Standards

### React/TypeScript Conventions

#### Component Structure
```typescript
// Component file structure (components/OrderList.tsx)
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Order } from '../types/order';
import { apiService } from '../services/api';

interface OrderListProps {
  status?: string;
  onOrderSelect: (order: Order) => void;
}

const OrderList: React.FC<OrderListProps> = ({ status, onOrderSelect }) => {
  // State hooks
  const [searchTerm, setSearchTerm] = useState('');
  
  // API hooks
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', status],
    queryFn: () => apiService.getOrders({ status })
  });
  
  // Computed values
  const filteredOrders = useMemo(() => {
    if (!data) return [];
    return data.filter(order => 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);
  
  // Event handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Render
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="order-list">
      {/* Component JSX */}
    </div>
  );
};

export default OrderList;
```

#### Custom Hooks Pattern
```typescript
// Hook file structure (hooks/useOrders.ts)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

export const useOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => apiService.getOrders(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create order');
    }
  });
};
```

### State Management
- Use React Query for server state
- Use Zustand for client state when needed
- Keep state as local as possible
- Lift state only when necessary

### CSS/Styling Conventions
- Use Tailwind CSS for utility classes
- Create component-specific styles only when necessary
- Follow mobile-first responsive design
- Use CSS variables for theming

```typescript
// Good - using Tailwind utilities
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">

// Good - conditional classes
<button className={clsx(
  'px-4 py-2 rounded-lg font-medium',
  {
    'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
    'bg-gray-200 text-gray-700 hover:bg-gray-300': variant === 'secondary',
    'opacity-50 cursor-not-allowed': disabled
  }
)}>
```

## Database Conventions

### Schema Design
- Use meaningful, descriptive field names
- Always include timestamps (createdAt, updatedAt)
- Use proper data types and validation
- Create indexes for frequently queried fields
- Use virtuals for computed properties

### Naming Conventions
- Collections: PascalCase singular (e.g., `Order`, `User`)
- Fields: camelCase (e.g., `orderNumber`, `shippingAddress`)
- Foreign keys: `<model>Id` (e.g., `userId`, `orderId`)
- Boolean fields: prefix with 'is', 'has', 'can' (e.g., `isActive`, `hasDiscount`)

### Indexing Strategy
```javascript
// Compound indexes for common queries
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ trackingNumber: 1 }, { sparse: true });

// Text indexes for search
productSchema.index({ name: 'text', description: 'text' });
```

## API Design

### RESTful Conventions
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Use plural nouns for resources
- Use proper status codes
- Version APIs when necessary

### Endpoint Structure
```
GET    /api/orders          # List orders
GET    /api/orders/:id      # Get single order
POST   /api/orders          # Create order
PUT    /api/orders/:id      # Update order
DELETE /api/orders/:id      # Delete order

# Sub-resources
GET    /api/orders/:id/items
POST   /api/orders/:id/ship
```

### Request/Response Format
```typescript
// Request validation
{
  "orderNumber": "ORD-12345",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "items": [
    {
      "sku": "PROD-001",
      "quantity": 2,
      "price": 29.99
    }
  ]
}

// Success response
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "orderNumber": "ORD-12345",
    // ... rest of data
  }
}

// Error response
{
  "error": {
    "message": "Validation failed",
    "errors": [
      {
        "field": "customer.email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Pagination
```javascript
// Query parameters
GET /api/orders?page=2&limit=50&sort=createdAt&order=desc

// Response format
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 245,
    "totalPages": 5
  }
}
```

## Testing Standards

### Test Organization
- Unit tests: Test individual functions/methods
- Integration tests: Test API endpoints
- Component tests: Test React components
- E2E tests: Test critical user flows

### Test File Structure
```javascript
// Unit test example
describe('OrderService', () => {
  describe('calculateShipping', () => {
    it('should calculate shipping for domestic orders', async () => {
      // Arrange
      const order = createMockOrder({ 
        destination: { country: 'US' } 
      });
      
      // Act
      const shipping = await orderService.calculateShipping(order);
      
      // Assert
      expect(shipping).toMatchObject({
        carrier: 'USPS',
        cost: expect.any(Number),
        estimatedDays: expect.any(Number)
      });
    });
    
    it('should throw error for missing address', async () => {
      // Test implementation
    });
  });
});
```

### Testing Best Practices
- Write tests before or alongside code (TDD/BDD)
- Test behavior, not implementation
- Use descriptive test names
- Keep tests independent and isolated
- Mock external dependencies
- Aim for >80% code coverage

## Security Guidelines

### Authentication & Authorization
- Use JWT tokens with appropriate expiration
- Implement role-based access control (RBAC)
- Always validate permissions on the backend
- Never trust client-side validation alone

### Data Protection
- Hash passwords with bcrypt (min 10 rounds)
- Sanitize all user inputs
- Use parameterized queries
- Implement rate limiting
- Use HTTPS in production
- Never log sensitive data

### API Security
```javascript
// Input validation
const validateInput = (input) => {
  // Sanitize HTML
  input = sanitizeHtml(input);
  
  // Validate format
  if (!validator.isEmail(input.email)) {
    throw new ValidationError('Invalid email');
  }
  
  return input;
};

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests'
});
```

## Performance Guidelines

### Database Optimization
- Use lean() for read-only queries
- Limit fields returned with select()
- Use pagination for large datasets
- Implement caching for frequently accessed data
- Use aggregation pipelines efficiently

### Frontend Optimization
- Lazy load components and routes
- Implement virtual scrolling for long lists
- Optimize images and assets
- Use React.memo for expensive components
- Implement proper loading states

### Caching Strategy
```javascript
// Redis caching example
const getCachedData = async (key, fetchFn, ttl = 300) => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
};
```

## Documentation Standards

### Code Comments
- Write self-documenting code first
- Add comments for complex logic
- Use JSDoc for functions and classes
- Keep comments up-to-date with code

### JSDoc Example
```javascript
/**
 * Calculates shipping rates for an order
 * @param {Order} order - The order to calculate shipping for
 * @param {Object} options - Shipping options
 * @param {boolean} options.expedited - Whether to use expedited shipping
 * @param {string[]} options.excludeCarriers - Carriers to exclude
 * @returns {Promise<ShippingRate[]>} Array of available shipping rates
 * @throws {ValidationError} If order address is invalid
 */
async function calculateShipping(order, options = {}) {
  // Implementation
}
```

### API Documentation
- Document all endpoints with examples
- Include request/response schemas
- Document error responses
- Keep documentation in sync with code

### README Files
- Include setup instructions
- Document environment variables
- Provide common troubleshooting steps
- Include contribution guidelines

## Git Workflow

### Commit Messages
Follow conventional commits format:
```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tool changes

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation

### Pull Request Guidelines
- Keep PRs focused and small
- Include tests for new features
- Update documentation as needed
- Ensure all checks pass
- Request review from appropriate team members

## Monitoring and Logging

### Logging Standards
```javascript
// Use structured logging
logger.info('Order created', {
  orderId: order.id,
  userId: user.id,
  total: order.total,
  itemCount: order.items.length
});

// Log levels
logger.error('Critical error', { error, context });
logger.warn('Warning condition', { details });
logger.info('Information', { data });
logger.debug('Debug information', { verbose });
```

### Error Tracking
- Log all errors with context
- Include stack traces in development
- Track error rates and patterns
- Set up alerts for critical errors

### Performance Monitoring
- Track API response times
- Monitor database query performance
- Track memory usage and CPU
- Set up alerts for anomalies