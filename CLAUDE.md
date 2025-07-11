# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShipMaster Pro is a comprehensive shipping management platform designed as a ShipStation alternative with enhanced features. The project is structured as a monorepo with:

- **Backend**: Node.js/Express API with MongoDB
- **Frontend**: React/TypeScript with Tailwind CSS
- **Integrations**: Shopify, QuickBooks, Bill.com, AfterShip, and custom APIs
- **Architecture**: Service-oriented with event-driven patterns

## Project Structure

```
shipmaster-pro/
├── backend/
│   ├── src/
│   │   ├── models/              # MongoDB schemas
│   │   │   ├── User.js         # User authentication & profiles
│   │   │   ├── Order.js        # Order management
│   │   │   ├── Tag.js          # Tagging system
│   │   │   ├── TagCollection.js # Tag grouping
│   │   │   ├── AutomationRule.js # Automation engine
│   │   │   ├── ApiIntegration.js # Integration configs
│   │   │   └── ApiLog.js       # API request logging
│   │   ├── services/           # Business logic layer
│   │   │   ├── tagging/        # Tagging service
│   │   │   │   └── TaggingService.js
│   │   │   ├── automation/     # Automation services
│   │   │   └── ApiIntegrationManager.js
│   │   ├── integrations/       # External API clients
│   │   │   ├── BaseApiClient.js
│   │   │   ├── ShopifyApiClient.js
│   │   │   ├── QuickBooksApiClient.js
│   │   │   ├── BillComApiClient.js
│   │   │   ├── AfterShipApiClient.js
│   │   │   └── CustomApiClient.js
│   │   ├── routes/             # API endpoints
│   │   │   ├── integrations.js
│   │   │   ├── tags.js
│   │   │   └── orders.js
│   │   ├── middleware/         # Express middleware
│   │   │   ├── auth/           # Authentication
│   │   │   └── validation.js   # Request validation
│   │   ├── utils/              # Utilities
│   │   │   ├── eventEmitter.js # Event system
│   │   │   └── syncScheduler.js # Cron jobs
│   │   ├── config/             # Configuration
│   │   └── index.js            # App entry point
│   ├── tests/                  # Test files
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── integrations/   # Integration UI
│   │   │   ├── tagging/        # Tagging UI
│   │   │   └── common/         # Shared components
│   │   ├── services/           # API services
│   │   │   └── api.ts
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # TypeScript types
│   │   ├── pages/              # Page components
│   │   └── utils/              # Frontend utilities
│   ├── package.json
│   └── vite.config.ts
├── docs/                       # Documentation
│   ├── coding-rules.md         # Coding standards
│   ├── api-backend_start.md    # Backend architecture
│   ├── api_start.md            # Frontend architecture
│   ├── tagging.md              # Tagging system docs
│   └── tagging_integration.md  # Tagging implementation
└── scripts/                    # Utility scripts
```

## Key Development Commands

### Backend Development
```bash
cd backend
npm install          # Install dependencies
npm run dev         # Start development server with nodemon
npm start           # Start production server
npm test            # Run Jest test suite
npm run lint        # Run ESLint
npm run lint:fix    # Auto-fix linting issues
```

### Frontend Development
```bash
cd frontend
npm install         # Install dependencies
npm run dev         # Start Vite dev server
npm run build       # Build for production
npm run preview     # Preview production build
npm test            # Run Vitest
npm run lint        # Run ESLint
```

### Database Commands
```bash
# Seed initial data (when script is implemented)
npm run seed

# Run migrations (when implemented)
npm run migrate
```

## Architecture Deep Dive

### Service Layer Pattern
The codebase follows a service-oriented architecture:

1. **Routes** (`/routes`): Handle HTTP requests, validation, and responses
2. **Services** (`/services`): Business logic and orchestration
3. **Integrations** (`/integrations`): External API client implementations
4. **Models** (`/models`): MongoDB schemas and data models

### Event-Driven Architecture
The system uses an event emitter for decoupled communication:

```javascript
// Event emission
eventEmitter.emit('order:created', { order });

// Event handling in TaggingService
eventEmitter.on('order:created', this.handleOrderCreated.bind(this));
```

Key events:
- Order lifecycle: created, updated, shipped, delivered
- Tag operations: applied, removed
- Integration: connected, synced, failed
- Automation: triggered, executed

### Integration Framework

All API integrations extend `BaseApiClient` which provides:
- Automatic rate limiting
- Request/response logging
- Error handling and retry logic
- Statistics tracking
- Connection health monitoring

To add a new integration:
1. Create a new client class in `/integrations` extending `BaseApiClient`
2. Implement required methods: `getDefaultBaseUrl()`, `getDefaultHeaders()`, `performHealthCheck()`
3. Add the integration type to `ApiIntegration` model enum
4. Update `ApiIntegrationManager.createClient()` switch statement

### Tagging System
The tagging system is central to automation and organization:

- **Tags**: Flexible categorization (priority, shipping, order, customer, product)
- **Tag Collections**: Groups of related tags (exclusive/non-exclusive)
- **Auto-tagging**: Rules-based automatic tag application
- **Tag-based Automation**: Trigger actions based on tag conditions

### API Authentication Flow
- JWT-based authentication with tokens stored in Authorization header
- API key authentication as alternative
- Role-based permissions (admin, manager, operator, viewer)
- Plan-based feature access
- Token expiry and refresh handled automatically for OAuth integrations

### Data Synchronization
- Automated sync via cron jobs in `syncScheduler.js`
- Each integration tracks its own sync state and frequency
- Failed syncs disable after 10 consecutive errors
- Sync direction can be import, export, or bidirectional

## Critical Implementation Details

### Environment Variables
Essential variables that must be set:
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: For token signing (use strong random value)
- `NODE_ENV`: Set to 'production' in production
- Integration-specific credentials (see .env.example)

### Database Indexes
Performance-critical indexes are defined in models:
```javascript
// Orders
orderSchema.index({ userId: 1, status: 1, 'timestamps.imported': -1 });
orderSchema.index({ externalOrderId: 1, source: 1 });

// Tags
tagSchema.index({ category: 1, name: 1 });
tagSchema.index({ 'metadata.usageCount': -1 });
```

### Error Handling Pattern
```javascript
try {
  // Operation
} catch (error) {
  // Log to ApiLog for integrations
  await this.logRequest({ error: error.message });
  // Update integration status
  await this.updateStats(false, responseTime, 0);
  // Return structured error response
  throw error;
}
```

### Testing Approach
- Unit tests for individual services and utilities
- Integration tests for API endpoints
- Component tests for React components
- Mock external APIs in tests
- Test data fixtures in `/tests/fixtures`

## Common Development Tasks

### Adding a New Model
1. Create schema file in `/backend/src/models/`
2. Define indexes for query performance
3. Add virtual fields for computed properties
4. Implement instance and static methods
5. Export model with proper naming

### Adding a New API Endpoint
1. Create route handler in appropriate route file
2. Implement business logic in service layer
3. Add input validation using Joi schemas
4. Add authentication/permission checks
5. Write tests for the endpoint
6. Update API documentation

### Adding a New Integration
1. Create client class extending `BaseApiClient`
2. Implement authentication method
3. Add data transformation methods
4. Create sync methods for each data type
5. Add integration type to enums
6. Update manager to handle new type

### Implementing a New Automation Rule
1. Define trigger conditions in schema
2. Implement condition evaluation logic
3. Create action handlers
4. Add to automation engine
5. Test with various scenarios
6. Document rule behavior

### Debugging Integration Issues
1. Check integration logs: `GET /api/integrations/:id/logs`
2. Run diagnostics: `GET /api/integrations/:id/diagnose`
3. Review connection status and error counts
4. Check rate limiting and quota usage
5. Verify credentials and permissions

### Handling OAuth Token Refresh
QuickBooks and custom OAuth integrations auto-refresh tokens:
1. Check token expiry before requests
2. Use refresh token to get new access token
3. Update stored tokens in database
4. Retry original request

### Creating Tag-based Automation
1. Define tags in the system
2. Create automation rule with tag conditions
3. Set up actions (shipping, notifications, etc.)
4. Test rule execution
5. Monitor execution stats

## Performance Optimization

### Database Queries
- Use `.lean()` for read-only operations
- Select only needed fields with `.select()`
- Use proper indexes for all queries
- Implement cursor-based pagination for large datasets
- Cache frequently accessed data in Redis

### Frontend Performance
- Implement code splitting with React.lazy()
- Use React Query for server state caching
- Virtualize long lists
- Optimize bundle size
- Implement proper loading states

### API Performance
- Rate limit all endpoints
- Implement request batching where appropriate
- Use compression middleware
- Cache responses when possible
- Monitor response times

## Security Considerations

### API Security
- Never log sensitive credentials
- Sanitize all user inputs
- Use parameterized database queries
- Implement CORS properly
- Rate limit by user and IP
- Validate webhook signatures

### Data Protection
- Hash passwords with bcrypt (10+ rounds)
- Encrypt API credentials in database
- Use HTTPS in production
- Implement audit logging
- Follow principle of least privilege

### Integration Security
- Store credentials encrypted
- Never expose credentials in responses
- Rotate API keys regularly
- Monitor for suspicious activity
- Implement IP whitelisting where supported

## Monitoring and Logging

### Structured Logging
```javascript
logger.info('Order processed', {
  orderId: order._id,
  userId: user._id,
  processingTime: Date.now() - startTime,
  status: 'success'
});
```

### Health Monitoring
- Health check endpoint: `GET /health`
- Integration connection status
- Database connection monitoring
- Memory and CPU usage tracking
- Error rate monitoring

### Performance Metrics
- API response times by endpoint
- Database query performance
- External API response times
- Background job execution times
- Resource utilization

## Troubleshooting Guide

### Integration Won't Connect
1. Verify credentials in database
2. Check network connectivity to external API
3. Review API version compatibility
4. Check rate limits haven't been exceeded
5. Look for authentication expiry

### High Memory Usage
1. Check for memory leaks in event listeners
2. Verify mongoose connection pooling settings
3. Review log retention settings
4. Check for unbounded arrays in memory
5. Monitor background job memory usage

### Slow API Responses
1. Check database query performance with `.explain()`
2. Review external API response times in logs
3. Verify indexes are being used
4. Look for N+1 query problems
5. Check for missing caching

### Tag System Issues
1. Verify tag exists and is active
2. Check exclusive collection constraints
3. Review auto-tagging conditions
4. Verify event emitters are connected
5. Check tag usage statistics

### Automation Not Triggering
1. Verify rule is enabled
2. Check trigger conditions match
3. Review execution limits
4. Check for cooldown periods
5. Verify event is being emitted

## Development Best Practices

### Code Organization
- Keep files focused and single-purpose
- Group related functionality
- Use clear, descriptive names
- Follow established patterns
- Document complex logic

### Testing Strategy
- Write tests alongside code
- Test edge cases and error paths
- Mock external dependencies
- Use realistic test data
- Maintain test coverage above 80%

### Performance First
- Consider performance in design
- Profile before optimizing
- Use appropriate data structures
- Implement caching strategically
- Monitor production performance

### Security Always
- Validate all inputs
- Authenticate all endpoints
- Authorize based on permissions
- Log security events
- Review code for vulnerabilities

## Deployment Considerations

### Pre-deployment Checklist
1. All tests passing
2. Environment variables configured
3. Database migrations applied
4. API documentation updated
5. Security review completed
6. Performance testing done
7. Monitoring configured
8. Backup strategy in place

### Production Configuration
- Enable production error handling
- Configure proper logging levels
- Set up SSL certificates
- Configure load balancing
- Enable auto-scaling
- Set up alerts

### Post-deployment
- Monitor error rates
- Check performance metrics
- Verify integrations working
- Test critical paths
- Monitor resource usage