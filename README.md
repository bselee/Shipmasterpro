# ShipMaster Pro

A comprehensive, production-ready shipping and order management platform with advanced tagging capabilities, API integrations, and self-healing database connectivity.

## 🚀 Features

### Core Shipping Features
- **Multi-Carrier Support**: USPS, UPS, FedEx, DHL integration
- **Rate Shopping**: Compare rates across all carriers instantly
- **Batch Processing**: Print hundreds of labels at once
- **Automation Rules**: Set up intelligent shipping rules
- **International Shipping**: Full customs documentation support

### API Integrations
- **Shopify**: Real-time order sync, inventory updates, fulfillment notifications
- **QuickBooks**: Automatic invoice creation, customer sync
- **Bill.com**: Vendor bill management, payment tracking
- **AfterShip**: Advanced tracking, delivery notifications
- **Custom APIs**: Flexible integration framework for any platform

### Advanced Features
- **Smart Packaging**: AI-powered box selection optimization
- **Multi-Warehouse**: Inventory across multiple locations
- **Analytics Dashboard**: Comprehensive shipping metrics
- **Team Management**: Role-based access control
- **Automation Engine**: Conditional order processing

## 📋 Prerequisites

- Node.js 16+ and npm
- Supabase account (free tier works)
- Redis (optional, for caching)
- Valid API credentials for integrations

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourcompany/shipmaster-pro.git
cd shipmaster-pro
```

### 2. Backend Setup
```bash
cd backend
npm install

# Run the interactive setup wizard
npm run setup
```

The setup wizard will guide you through:
- Creating your Supabase account
- Configuring database credentials
- Setting up optional services
- Testing the connection

### 3. Configure Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your credentials
3. Edit `.env` file with your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. Run the database schema:
   - Go to Supabase SQL Editor
   - Copy contents of `backend/src/models/supabase/schema.sql`
   - Execute the SQL to create all tables

### 4. Configure Other Services
Edit `.env` file with additional credentials:
- API keys for carriers
- Integration credentials
- JWT secret

### 5. Initialize System
```bash
# Start the backend
npm run dev

# In another terminal, initialize system tags
curl -X POST http://localhost:3002/api/system/initialize
```

### 6. Start the Backend
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔧 Configuration

### API Integrations

#### Shopify
1. Create a private app in your Shopify admin
2. Get your API credentials
3. Add to `.env`:
   ```
   SHOPIFY_API_VERSION=2023-07
   ```

#### QuickBooks
1. Register app at https://developer.intuit.com
2. Get OAuth2 credentials
3. Add to `.env`:
   ```
   QB_CLIENT_ID=your-client-id
   QB_CLIENT_SECRET=your-client-secret
   ```

#### Carrier Setup
Add your carrier credentials to `.env`:
```
USPS_USER_ID=your-usps-id
UPS_ACCESS_KEY=your-ups-key
# ... etc
```

## 📚 API Documentation

### Authentication
All API endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Key Endpoints

#### Integrations
- `GET /api/integrations` - List all integrations
- `POST /api/integrations` - Create new integration
- `POST /api/integrations/:id/sync` - Sync data from integration
- `POST /api/integrations/:id/test` - Test integration connection

#### Orders
- `GET /api/orders` - List orders with filtering
- `POST /api/orders` - Create manual order
- `POST /api/orders/:id/ship` - Generate shipping label

#### Shipping
- `POST /api/shipping/rates` - Get rates from all carriers
- `POST /api/shipping/labels` - Create shipping label
- `POST /api/orders/batch/ship` - Batch create labels

## 🏗️ Project Structure

```
shipmaster-pro/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   │   └── supabase.js # Self-healing Supabase client
│   │   ├── models/         # Database models
│   │   │   ├── supabase/   # Supabase adapters
│   │   │   └── index.js    # Model exports
│   │   ├── services/       # Business logic
│   │   ├── integrations/   # API client implementations
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Helper utilities
│   │   └── index.js        # App entry point
│   ├── tests/              # Test files
│   ├── package.json
│   └── .env.example
├── frontend/               # React/TypeScript application
├── docs/                   # Documentation
│   ├── coding-rules.md     # Development standards
│   └── CLAUDE.md          # AI assistant guide
└── scripts/                # Utility scripts
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Using Docker

```bash
# Build the image
docker build -t shipmaster-pro .

# Run with docker-compose
docker-compose up -d
```

### Manual Deployment

1. Set up Supabase project and run schema
2. Configure environment variables for production
3. Install dependencies: `npm ci --production`
4. Start the application: `npm start`
5. Initialize system: `POST /api/system/initialize`

### Environment Variables
Ensure all required environment variables are set in production:
- Use strong JWT secrets
- Secure database connections
- Production API endpoints
- Proper CORS configuration

## 🔐 Security

- All API endpoints use JWT authentication
- Rate limiting on all routes
- Input validation and sanitization
- Encrypted storage of sensitive credentials
- Regular security audits recommended

## 📊 Monitoring

- Health check endpoint: `GET /health`
  - Shows Supabase connection status
  - Circuit breaker states
  - Success/failure rates
  - Auto-fix statistics
- Integrated logging with Morgan
- Self-healing database connections
- Automatic retry with exponential backoff

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Documentation: [docs.shipmaster.pro](https://docs.shipmaster.pro)
- Email: support@shipmaster.pro
- Issues: [GitHub Issues](https://github.com/yourcompany/shipmaster-pro/issues)

## 🔄 Version History

- **1.0.0** - Initial release with core features
- **1.1.0** - Added QuickBooks and Bill.com integration
- **1.2.0** - Enhanced automation rules engine

---

Built with ❤️ by the ShipMaster Pro Team