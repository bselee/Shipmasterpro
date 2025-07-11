# ShipMaster Pro - Quick Start Guide 🚀

## Get Started in 5 Minutes

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run Setup Wizard
```bash
npm run setup
```

The interactive wizard will:
- ✅ Guide you through Supabase account creation
- ✅ Help you enter your credentials
- ✅ Generate secure JWT secrets
- ✅ Test your database connection
- ✅ Optional: Configure email and other services

### 3. Create Database Tables
When prompted by the setup wizard:
1. Go to your Supabase Dashboard
2. Click "SQL Editor" → "New Query"
3. Copy ALL contents from `backend/src/models/supabase/schema.sql`
4. Paste and click "Run"

### 4. Verify Connection
```bash
npm run verify
```

### 5. Start the Server
```bash
npm run dev
```

Server will run at: http://localhost:3002

### 6. Initialize System (First Time Only)
```bash
curl -X POST http://localhost:3002/api/system/initialize
```

## 🎉 You're Ready!

### Health Check
Visit: http://localhost:3002/health

You should see:
- Database connection status
- Circuit breaker states
- Success rates
- Self-healing metrics

### Next Steps
1. Set up the frontend (see frontend/README.md)
2. Configure API integrations (Shopify, QuickBooks, etc.)
3. Start processing orders!

### Need Help?
- Check `backend/server.log` for errors
- Run `npm run verify` to test connection
- See full docs in `/docs` folder